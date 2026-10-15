// "Learn from my mistakes": the user's own mistakes, blunders and misses from reviewed games, kept as
// personal puzzles on this device and scheduled with Leitner boxes (a simple spaced repetition).
import type { MoveClass } from '../chess/classify';
import { kvGet, kvSet } from './db';

export interface MistakeCard {
  /** `${gameId}:${ply}` */
  id: string;
  gameId: number;
  /** index of the move in the game (0-based) */
  ply: number;
  /** position before the mistake (the user is to move) */
  fen: string;
  /** what was played in the game */
  played: string;
  cls: MoveClass;
  /** accepted answers (SAN): the engine's best move, plus a near-equal second choice */
  answers: string[];
  /** engine line from `fen` (SAN), starting with the best move */
  line: string[];
  /** last move before the position, to highlight it */
  lastMove?: [string, string];
  /** e.g. "vs Knightly Ned · move 14" */
  label: string;
  /** Leitner box 1–5 */
  box: number;
  /** due time (ms since epoch) */
  due: number;
  added: number;
  reps: number;
  lapses: number;
}

const KEY = 'mistakes:cards';
const DAY = 86_400_000;
export const MAX_BOX = 5;
/** Days until the next review once a card reaches box n (box 1 = again soon). */
export const BOX_DAYS = [0, 0, 1, 3, 7, 16];
/** A wrong answer brings a card back after this long. */
export const RETRY_MS = 10 * 60_000;

/** Next state of a card after an answer: correct → next box with a longer wait; wrong → box 1. */
export function schedule<T extends Pick<MistakeCard, 'box' | 'due' | 'reps' | 'lapses'>>(card: T, correct: boolean, now = Date.now()): T {
  if (correct) {
    const box = Math.min(MAX_BOX, card.box + 1);
    return { ...card, box, due: now + BOX_DAYS[box] * DAY, reps: card.reps + 1 };
  }
  return { ...card, box: 1, due: now + RETRY_MS, reps: card.reps + 1, lapses: card.lapses + 1 };
}

export function isDue(card: Pick<MistakeCard, 'due'>, now = Date.now()): boolean {
  return card.due <= now;
}

/** Due cards first (lowest box, then oldest due), then nothing else. */
export function dueCards<T extends Pick<MistakeCard, 'due' | 'box'>>(cards: T[], now = Date.now()): T[] {
  return cards.filter((c) => isDue(c, now)).sort((a, b) => a.box - b.box || a.due - b.due);
}

/** Merge freshly found mistakes into the deck: new ones go in box 1 (due now); known ones keep their progress. */
export function mergeCards(deck: MistakeCard[], found: Omit<MistakeCard, 'box' | 'due' | 'added' | 'reps' | 'lapses'>[], now = Date.now()): MistakeCard[] {
  const byId = new Map(deck.map((c) => [c.id, c]));
  for (const f of found) {
    const old = byId.get(f.id);
    byId.set(f.id, old ? { ...old, ...f, box: old.box, due: old.due, added: old.added, reps: old.reps, lapses: old.lapses } : { ...f, box: 1, due: now, added: now, reps: 0, lapses: 0 });
  }
  return [...byId.values()];
}

export async function loadCards(): Promise<MistakeCard[]> {
  return kvGet<MistakeCard[]>(KEY, []);
}

export async function saveCards(cards: MistakeCard[]) {
  await kvSet(KEY, cards);
}

export async function addMistakes(found: Parameters<typeof mergeCards>[1]): Promise<MistakeCard[]> {
  const next = mergeCards(await loadCards(), found);
  await saveCards(next);
  return next;
}

export async function answerCard(id: string, correct: boolean): Promise<MistakeCard | null> {
  const cards = await loadCards();
  const i = cards.findIndex((c) => c.id === id);
  if (i < 0) return null;
  cards[i] = schedule(cards[i], correct);
  await saveCards(cards);
  return cards[i];
}

export async function removeGameCards(gameId: number) {
  await saveCards((await loadCards()).filter((c) => c.gameId !== gameId));
}

export async function dueCount(now = Date.now()): Promise<number> {
  return dueCards(await loadCards(), now).length;
}
