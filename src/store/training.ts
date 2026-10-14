// Persisted progress for puzzles, Puzzle Rush, the daily puzzle, drills and Board Vision (kv store, this device only).
import { kvGet, kvSet } from './db';
import type { RushMode, RushRun } from '../data/rush';
import { score } from '../data/rush';
import type { DailyLog } from '../data/puzzles';

// ---- rated puzzle streak
export interface Streak {
  cur: number;
  best: number;
}
export const getPuzzleStreak = () => kvGet<Streak>('puzzles:streak', { cur: 0, best: 0 });
export async function bumpPuzzleStreak(success: boolean): Promise<Streak> {
  const s = await getPuzzleStreak();
  const cur = success ? s.cur + 1 : 0;
  const next = { cur, best: Math.max(s.best, cur) };
  await kvSet('puzzles:streak', next);
  return next;
}

// ---- rush
export const getRushBest = (mode: RushMode) => kvGet<number>(`rush:best:${mode}`, 0);
/** Saves the run; returns the previous best so the caller can celebrate a new record. */
export async function saveRush(run: RushRun): Promise<{ prevBest: number; best: number }> {
  const prevBest = await getRushBest(run.mode);
  const s = score(run);
  if (s > prevBest) await kvSet(`rush:best:${run.mode}`, s);
  const hist = await kvGet<{ mode: RushMode; date: number; score: number }[]>('rush:history', []);
  await kvSet('rush:history', [{ mode: run.mode, date: run.started, score: s }, ...hist].slice(0, 30));
  return { prevBest, best: Math.max(prevBest, s) };
}

// ---- daily puzzle
export const getDailyLog = () => kvGet<DailyLog>('daily:log', {});
export async function markDaily(date: string, result: 'solved' | 'failed') {
  const log = await getDailyLog();
  if (log[date] === 'solved') return log;
  const next = { ...log, [date]: result };
  await kvSet('daily:log', next);
  return next;
}

// ---- drills
export interface DrillRecord {
  done: boolean;
  /** fewest learner moves used for a success */
  bestMoves: number | null;
  attempts: number;
}
export const getDrill = (id: string) => kvGet<DrillRecord>(`drill:${id}`, { done: false, bestMoves: null, attempts: 0 });
export async function saveDrill(id: string, success: boolean, moves: number): Promise<DrillRecord> {
  const r = await getDrill(id);
  const next: DrillRecord = {
    done: r.done || success,
    bestMoves: success ? Math.min(r.bestMoves ?? Infinity, moves) : r.bestMoves,
    attempts: r.attempts + 1,
  };
  await kvSet(`drill:${id}`, next);
  return next;
}

// ---- board vision
export const getVisionBest = (key: string) => kvGet<number>(`vision:${key}`, 0);
export async function saveVisionBest(key: string, value: number): Promise<number> {
  const prev = await getVisionBest(key);
  if (value > prev) await kvSet(`vision:${key}`, value);
  return prev;
}
