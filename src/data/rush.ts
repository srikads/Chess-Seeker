// Puzzle Rush rules (pure): modes, 3 strikes, progressively harder puzzles.
import type { Puzzle } from './puzzles';

export type RushMode = '3min' | '5min' | 'survival';

export const RUSH_MODES: Record<RushMode, { label: string; sub: string; ms: number | null }> = {
  '3min': { label: '3 min', sub: 'Solve as many as you can in 3 minutes', ms: 3 * 60_000 },
  '5min': { label: '5 min', sub: 'Five minutes on the clock', ms: 5 * 60_000 },
  survival: { label: 'Survival', sub: 'No clock — go until 3 misses', ms: null },
};

export const MAX_STRIKES = 3;

export interface RushResult {
  id: string;
  ok: boolean;
  rating: number;
}

export interface RushRun {
  mode: RushMode;
  started: number;
  results: RushResult[];
}

export const newRun = (mode: RushMode, now: number): RushRun => ({ mode, started: now, results: [] });

export const score = (r: RushRun) => r.results.filter((x) => x.ok).length;
export const strikes = (r: RushRun) => r.results.filter((x) => !x.ok).length;

/** ms left on the clock (null = survival, no clock). */
export function timeLeft(r: RushRun, now: number): number | null {
  const ms = RUSH_MODES[r.mode].ms;
  return ms === null ? null : Math.max(0, ms - (now - r.started));
}

export function isOver(r: RushRun, now: number): boolean {
  const t = timeLeft(r, now);
  return strikes(r) >= MAX_STRIKES || t === 0;
}

export function answer(r: RushRun, p: Puzzle, ok: boolean): RushRun {
  return { ...r, results: [...r.results, { id: p.id, ok, rating: p.rating }] };
}

/** Target puzzle rating for the n-th puzzle (0-based): starts easy and climbs steadily. */
export function rushTarget(n: number): number {
  return Math.round(450 + n * 40 + Math.max(0, n - 15) * 25);
}

/** Next puzzle: the unused puzzle nearest to the target, with a little randomness among close ones. */
export function pickRush(pool: Puzzle[], n: number, used: Set<string>, rnd: () => number = Math.random): Puzzle | null {
  const free = pool.filter((p) => !used.has(p.id));
  const src = free.length ? free : pool;
  if (!src.length) return null;
  const target = rushTarget(n);
  const sorted = src.slice().sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target));
  const close = sorted.slice(0, Math.min(6, sorted.length));
  return close[Math.floor(rnd() * close.length)];
}

/** Puzzles that suit Rush: short (at most 3 learner moves). */
export function rushPool(all: Puzzle[]): Puzzle[] {
  return all.filter((p) => p.moves.length - (p.setup ? 1 : 0) <= 5);
}
