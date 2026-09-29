// All user data lives in IndexedDB on this device. Nothing is ever sent anywhere.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Category } from '../lessons/types';
import type { MoveClass } from '../chess/classify';

export type StudyBucket = 'openings' | 'tactics' | 'endgames' | 'play';

export interface LessonProgress {
  id: string;
  completed: boolean;
  /** index of the furthest step reached */
  step: number;
  /** try steps solved first time without hints */
  clean: number;
  updated: number;
}

export interface PuzzleAttempt {
  id: string;
  solved: boolean;
  date: number;
  rating: number; // puzzle rating
}

export type { MoveClass };

export interface MoveAnalysis {
  /** eval (White POV, centipawns, mate folded to ±10000) of the position AFTER the move */
  cp: number;
  mate: number | null;
  best: string; // best move (SAN) in the position BEFORE the move
  bestPv: string[]; // SAN
  cls: MoveClass;
  winLoss: number; // win% lost by the mover
  /** engine's second choice (SAN) and how much worse it was (win%) — explains "Great" moves */
  second?: string;
  secondLoss?: number;
}

export interface GameRecord {
  id?: number;
  date: number;
  white: string;
  black: string;
  userColor: 'white' | 'black' | 'both';
  botLevel?: number;
  timeControl: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  termination: string;
  startFen: string;
  sans: string[];
  /** ms each move took */
  times: number[];
  analysis?: MoveAnalysis[];
  /** bumped when the classifier changes, so old reviews are recomputed */
  analysisVersion?: number;
  accuracy?: { white: number; black: number };
  pure: boolean;
  hintsUsed: number;
}

export interface StudyLog {
  key: string; // `${date}|${bucket}`
  date: string; // YYYY-MM-DD
  bucket: StudyBucket;
  seconds: number;
}

interface CSDB extends DBSchema {
  lessons: { key: string; value: LessonProgress };
  puzzles: { key: string; value: PuzzleAttempt };
  games: { key: number; value: GameRecord; indexes: { date: number } };
  study: { key: string; value: StudyLog; indexes: { date: string } };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<CSDB>> | null = null;

export function db() {
  if (!dbp)
    dbp = openDB<CSDB>('chess-seeker', 1, {
      upgrade(d) {
        d.createObjectStore('lessons', { keyPath: 'id' });
        d.createObjectStore('puzzles', { keyPath: 'id' });
        d.createObjectStore('games', { keyPath: 'id', autoIncrement: true }).createIndex('date', 'date');
        d.createObjectStore('study', { keyPath: 'key' }).createIndex('date', 'date');
        d.createObjectStore('kv');
      },
    });
  return dbp;
}

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function categoryBucket(c: Category): StudyBucket {
  return c === 'method' ? 'play' : c;
}

// ---------- lessons
export async function getLessonProgress(): Promise<Map<string, LessonProgress>> {
  const all = await (await db()).getAll('lessons');
  return new Map(all.map((p) => [p.id, p]));
}
export async function saveLessonProgress(p: LessonProgress) {
  await (await db()).put('lessons', { ...p, updated: Date.now() });
}

// ---------- puzzles
export async function savePuzzleAttempt(a: PuzzleAttempt) {
  const d = await db();
  const prev = await d.get('puzzles', a.id);
  // keep first-attempt result (that is what counts), but update date
  await d.put('puzzles', prev ? { ...prev, date: a.date } : a);
}
export async function getPuzzleAttempts() {
  return (await db()).getAll('puzzles');
}

// ---------- games
export async function saveGame(g: GameRecord): Promise<number> {
  return (await db()).put('games', g);
}
export async function getGame(id: number) {
  return (await db()).get('games', id);
}
export async function listGames(): Promise<GameRecord[]> {
  const all = await (await db()).getAllFromIndex('games', 'date');
  return all.reverse();
}
export async function deleteGame(id: number) {
  await (await db()).delete('games', id);
}

// ---------- study time
export async function addStudyTime(bucket: StudyBucket, seconds: number) {
  if (seconds <= 0) return;
  const d = await db();
  const date = today();
  const key = `${date}|${bucket}`;
  const prev = await d.get('study', key);
  await d.put('study', { key, date, bucket, seconds: (prev?.seconds ?? 0) + seconds });
}
export async function studySince(days: number): Promise<StudyLog[]> {
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return (await db()).getAllFromIndex('study', 'date', IDBKeyRange.lowerBound(today(from)));
}

// ---------- key/value
export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  return ((await (await db()).get('kv', key)) as T) ?? fallback;
}
export async function kvSet(key: string, value: unknown) {
  await (await db()).put('kv', value, key);
}

// ---------- backup
export async function exportAll(): Promise<object> {
  const d = await db();
  const kvKeys = await d.getAllKeys('kv');
  const kv: Record<string, unknown> = {};
  for (const k of kvKeys) kv[k] = await d.get('kv', k);
  return {
    app: 'chess-seeker',
    version: 1,
    exported: new Date().toISOString(),
    settings: JSON.parse(localStorage.getItem('cs.settings.v1') ?? '{}'),
    lessons: await d.getAll('lessons'),
    puzzles: await d.getAll('puzzles'),
    games: await d.getAll('games'),
    study: await d.getAll('study'),
    kv,
  };
}

export async function importAll(data: any) {
  if (data?.app !== 'chess-seeker') throw new Error('Not a Chess Seeker backup file');
  const d = await db();
  const tx = d.transaction(['lessons', 'puzzles', 'games', 'study', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('lessons').clear(),
    tx.objectStore('puzzles').clear(),
    tx.objectStore('games').clear(),
    tx.objectStore('study').clear(),
    tx.objectStore('kv').clear(),
  ]);
  for (const x of data.lessons ?? []) tx.objectStore('lessons').put(x);
  for (const x of data.puzzles ?? []) tx.objectStore('puzzles').put(x);
  for (const x of data.games ?? []) tx.objectStore('games').put(x);
  for (const x of data.study ?? []) tx.objectStore('study').put(x);
  for (const [k, v] of Object.entries(data.kv ?? {})) tx.objectStore('kv').put(v, k);
  await tx.done;
  if (data.settings) localStorage.setItem('cs.settings.v1', JSON.stringify(data.settings));
}

export async function wipeAll() {
  const d = await db();
  for (const s of ['lessons', 'puzzles', 'games', 'study', 'kv'] as const) await d.clear(s);
  localStorage.removeItem('cs.settings.v1');
}
