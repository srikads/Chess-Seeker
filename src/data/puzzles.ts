import { Chess } from 'chess.js';
import { ALL_LESSONS } from '../lessons';

export interface Puzzle {
  id: string;
  fen: string;
  /** UCI moves. If `setup` is true, moves[0] is the opponent's move played automatically. */
  moves: string[];
  rating: number;
  themes: string[];
  setup: boolean;
}

let cache: Promise<Puzzle[]> | null = null;
let packSize = 0;

/** Loads the bundled puzzle pack (same-origin file, cached offline by the service worker). */
export function loadPuzzles(): Promise<Puzzle[]> {
  cache ??= (async () => {
    let list: Puzzle[] = [];
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}puzzles/puzzles.json`);
      if (res.ok) list = parsePack(await res.json());
    } catch {
      /* no pack bundled — fall back to lesson exercises */
    }
    packSize = list.length;
    return [...list, ...lessonPuzzles()];
  })();
  return cache;
}

/** How many puzzles came from the bundled pack (0 = only the lesson fallback). Valid after loadPuzzles(). */
export function puzzlePackSize(): number {
  return packSize;
}

/** Parse the tuples written by scripts/build-puzzles.mjs. */
export function parsePack(data: unknown): Puzzle[] {
  const rows = (data as { puzzles?: unknown })?.puzzles;
  if (!Array.isArray(rows)) return [];
  return (rows as [string, string, string, number, string][]).map(([id, fen, moves, rating, themes]) => ({
    id,
    fen,
    moves: moves.split(' '),
    rating,
    themes: themes.split(' '),
    setup: true,
  }));
}

/** Turn every tactics "try it" exercise from the lessons into a puzzle too. */
export function lessonPuzzles(): Puzzle[] {
  const out: Puzzle[] = [];
  for (const l of ALL_LESSONS) {
    l.steps.forEach((s, i) => {
      if (s.kind !== 'try') return;
      try {
        const g = new Chess(s.fen);
        const moves = s.solution.map((san) => {
          const m = g.move(san);
          return m.from + m.to + (m.promotion ?? '');
        });
        const themes = [l.category === 'endgames' ? 'endgame' : l.category === 'openings' ? 'opening' : 'lesson', `lesson:${l.id}`];
        if (g.isCheckmate()) themes.push(`mateIn${Math.ceil(moves.length / 2)}`);
        out.push({ id: `L-${l.id}-${i}`, fen: s.fen, moves, rating: 400 + l.level * 250, themes, setup: false });
      } catch {
        /* skip invalid */
      }
    });
  }
  return out;
}

// ------------------------------------------------------------------ pure helpers

export type Side = 'white' | 'black';

/** The colour the learner plays in this puzzle. */
export function solverColor(p: Puzzle): Side {
  const stm: Side = p.fen.split(' ')[1] === 'b' ? 'black' : 'white';
  return p.setup ? (stm === 'white' ? 'black' : 'white') : stm;
}

/** Position the learner first sees (after the opponent's setup move) and the moves still to find. */
export function puzzleStart(p: Puzzle): { fen: string; solution: string[]; setupSan?: string } {
  if (!p.setup) return { fen: p.fen, solution: p.moves };
  const g = new Chess(p.fen);
  const u = p.moves[0];
  const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  return { fen: g.fen(), solution: p.moves.slice(1), setupSan: m.san };
}

/** UCI list → SAN list from `fen` (stops at the first illegal move). */
export function ucisToSans(fen: string, ucis: string[]): string[] {
  const g = new Chess(fen);
  const out: string[] = [];
  for (const u of ucis) {
    try {
      out.push(g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    } catch {
      break;
    }
  }
  return out;
}

export const eloExpected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/** Rating change for a first attempt (bigger steps while the rating is still provisional). */
export function ratingDelta(rating: number, puzzleRating: number, success: boolean, attempts: number): number {
  const k = attempts < 20 ? 40 : 20;
  const d = Math.round(k * ((success ? 1 : 0) - eloExpected(rating, puzzleRating)));
  // never 0 — a solve always counts a little, a miss always costs a little
  return d === 0 ? (success ? 1 : -1) : d;
}

/** Puzzle closest to `rating`, preferring ones not tried yet. `rnd` in [0,1). */
export function pickNear(pool: Puzzle[], rating: number, tried: { has(id: string): boolean }, rnd: () => number = Math.random): Puzzle | null {
  if (!pool.length) return null;
  const fresh = pool.filter((p) => !tried.has(p.id));
  const src = fresh.length ? fresh : pool;
  for (const width of [150, 300, 600]) {
    const near = src.filter((p) => Math.abs(p.rating - rating) <= width);
    if (near.length) return near[Math.floor(rnd() * near.length)];
  }
  return src[Math.floor(rnd() * src.length)];
}

/** Puzzles matching any of `themes` (empty = all) within a rating range. */
export function customPool(all: Puzzle[], themes: string[], min: number, max: number): Puzzle[] {
  return all.filter((p) => p.rating >= min && p.rating <= max && (!themes.length || themes.some((t) => p.themes.includes(t))));
}

export function themeCounts(all: Puzzle[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of all) for (const t of p.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

/** Small stable string hash (FNV-1a). */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Puzzle of the day: deterministic for a date, from a beginner-friendly band of the pack when there is one. */
export function dailyPuzzle(all: Puzzle[], date: string): Puzzle | null {
  const pack = all.filter((p) => !p.id.startsWith('L-'));
  const src = pack.length ? pack : all;
  if (!src.length) return null;
  const friendly = src.filter((p) => p.rating >= 600 && p.rating <= 1500);
  const pool = (friendly.length >= 7 ? friendly : src).slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return pool[hashStr(`daily:${date}`) % pool.length];
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export type DailyLog = Record<string, 'solved' | 'failed'>;

/** Consecutive days with the daily puzzle done, ending today (or yesterday when today is still open). */
export function dailyStreak(log: DailyLog, today: string): number {
  let day = log[today] ? today : addDays(today, -1);
  let n = 0;
  while (log[day]) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
