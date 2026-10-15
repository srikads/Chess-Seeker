import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  addDays,
  customPool,
  dailyPuzzle,
  dailyStreak,
  lessonPuzzles,
  parsePack,
  pickNear,
  puzzleStart,
  ratingDelta,
  solverColor,
  ucisToSans,
  type Puzzle,
} from '../src/data/puzzles';
import { buildPuzzleNarration } from '../src/data/puzzle-narration';
import { answer, isOver, newRun, pickRush, rushPool, rushTarget, score, strikes, timeLeft } from '../src/data/rush';

// Lichess format: FEN before the opponent's setup move.
// A plain back-rank mate: Black plays ...a6, White answers Rd8#.
const backRank: Puzzle = { id: 'T1', fen: '6k1/p4ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1', moves: ['a7a6', 'd1d8'], rating: 700, themes: ['mateIn1', 'backRankMate'], setup: true };
// Knight fork after a setup move: ...Kh8, Nf7+ forks king and rook, ...Kg8, Nxd8.
const fork: Puzzle = { id: 'T2', fen: '3r2k1/6pp/8/4N3/8/8/6PP/6K1 b - - 0 1', moves: ['g8h8', 'e5f7', 'h8g8', 'f7d8'], rating: 900, themes: ['fork'], setup: true };

describe('puzzle helpers', () => {
  it('parses the pack tuples', () => {
    const ps = parsePack({ puzzles: [['a', backRank.fen, 'a7a6 d1d8', 700, 'mateIn1 backRankMate']] });
    expect(ps[0]).toMatchObject({ id: 'a', moves: ['a7a6', 'd1d8'], rating: 700, themes: ['mateIn1', 'backRankMate'], setup: true });
    expect(parsePack(null)).toEqual([]);
  });

  it('finds the solver colour and start position', () => {
    expect(solverColor(backRank)).toBe('white');
    const s = puzzleStart(backRank);
    expect(s.setupSan).toBe('a6');
    expect(s.solution).toEqual(['d1d8']);
    const g = new Chess(s.fen);
    g.move('Rd8#');
    expect(g.isCheckmate()).toBe(true);
    expect(ucisToSans(s.fen, s.solution)).toEqual(['Rd8#']);
  });

  it('lesson puzzles are all legal and need no setup move', () => {
    const ps = lessonPuzzles();
    expect(ps.length).toBeGreaterThan(10);
    for (const p of ps) {
      expect(p.setup).toBe(false);
      expect(ucisToSans(p.fen, p.moves).length).toBe(p.moves.length);
    }
  });

  it('rating moves up on a solve and down on a miss, never by zero', () => {
    expect(ratingDelta(800, 800, true, 0)).toBe(20);
    expect(ratingDelta(800, 800, false, 50)).toBe(-10);
    expect(ratingDelta(1500, 400, true, 50)).toBeGreaterThan(0);
    expect(ratingDelta(400, 2000, false, 50)).toBeLessThan(0);
  });

  it('picks near the rating, preferring fresh puzzles', () => {
    const pool = [backRank, fork, { ...fork, id: 'T3', rating: 2000 }];
    expect(pickNear(pool, 680, new Set(), () => 0)?.id).toBe('T1');
    expect(pickNear(pool, 680, new Set(['T1']), () => 0)?.id).toBe('T2');
    expect(pickNear([], 800, new Set())).toBeNull();
  });

  it('filters custom pools by theme and rating', () => {
    const pool = [backRank, fork];
    expect(customPool(pool, ['fork'], 0, 3000).map((p) => p.id)).toEqual(['T2']);
    expect(customPool(pool, [], 600, 800).map((p) => p.id)).toEqual(['T1']);
  });

  it('daily puzzle is deterministic per date and prefers the pack', () => {
    const all = [...lessonPuzzles(), backRank, fork];
    const a = dailyPuzzle(all, '2026-10-14');
    expect(a).toBe(dailyPuzzle(all, '2026-10-14'));
    expect(['T1', 'T2']).toContain(a!.id);
    // fallback: lessons only
    expect(dailyPuzzle(lessonPuzzles(), '2026-10-14')).not.toBeNull();
    const days = new Set(Array.from({ length: 20 }, (_, i) => dailyPuzzle(lessonPuzzles(), addDays('2026-10-01', i))!.id));
    expect(days.size).toBeGreaterThan(3);
  });

  it('counts the daily streak', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(dailyStreak({}, '2026-10-14')).toBe(0);
    expect(dailyStreak({ '2026-10-13': 'solved', '2026-10-12': 'failed' }, '2026-10-14')).toBe(2);
    expect(dailyStreak({ '2026-10-14': 'solved', '2026-10-13': 'solved', '2026-10-11': 'solved' }, '2026-10-14')).toBe(2);
  });
});

describe('puzzle narration', () => {
  it('walks through setup, idea, moves and the result', () => {
    const { startFen, steps } = buildPuzzleNarration(fork);
    expect(startFen).toBe(fork.fen);
    expect(steps[0].moves).toEqual(['Kh8']);
    const nf7 = steps.find((s) => s.moves?.[0] === 'Nf7+');
    expect(nf7?.text).toMatch(/fork/i);
    expect(steps.at(-1)!.text).toMatch(/rook/);
    // every step is short: at most 2 sentences
    for (const s of steps) expect(s.text.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(3);
    // the moves replay legally in order
    const g = new Chess(startFen);
    for (const s of steps) for (const m of s.moves ?? []) expect(() => g.move(m)).not.toThrow();
  });

  it('ends on checkmate for a mate puzzle', () => {
    const { steps } = buildPuzzleNarration(backRank);
    expect(steps.at(-1)!.text).toMatch(/checkmate/i);
    expect(steps.at(-1)!.badge?.cls).toBe('best');
  });

  it('works for lesson puzzles without a setup move', () => {
    for (const p of lessonPuzzles().slice(0, 15)) {
      const { startFen, steps } = buildPuzzleNarration(p);
      expect(startFen).toBe(p.fen);
      expect(steps.length).toBeGreaterThan(1);
    }
  });
});

describe('puzzle rush', () => {
  const pool: Puzzle[] = Array.from({ length: 60 }, (_, i) => ({ ...backRank, id: `R${i}`, rating: 400 + i * 30 }));

  it('gets harder as you go', () => {
    expect(rushTarget(10)).toBeGreaterThan(rushTarget(0));
    const used = new Set<string>();
    const ratings: number[] = [];
    for (let n = 0; n < 20; n++) {
      const p = pickRush(pool, n, used, () => 0)!;
      used.add(p.id);
      ratings.push(p.rating);
    }
    expect(ratings[19]).toBeGreaterThan(ratings[0]);
    expect(new Set(ratings).size).toBe(20);
  });

  it('three strikes end the run, and the clock runs out', () => {
    let r = newRun('survival', 0);
    expect(timeLeft(r, 1e9)).toBeNull();
    r = answer(r, pool[0], true);
    r = answer(r, pool[1], false);
    r = answer(r, pool[2], false);
    expect(isOver(r, 1e9)).toBe(false);
    r = answer(r, pool[3], false);
    expect(isOver(r, 0)).toBe(true);
    expect(score(r)).toBe(1);
    expect(strikes(r)).toBe(3);
    const t = newRun('3min', 1000);
    expect(timeLeft(t, 61_000)).toBe(120_000);
    expect(isOver(t, 181_000)).toBe(true);
  });

  it('keeps only short puzzles', () => {
    expect(rushPool([backRank, { ...fork, moves: [...fork.moves, 'a2a3', 'a7a6', 'b2b3', 'b7b6'] }]).map((p) => p.id)).toEqual(['T1']);
  });
});
