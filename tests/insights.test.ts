import { describe, it, expect } from 'vitest';
import type { GameRecord, MoveAnalysis, PuzzleAttempt } from '../src/store/db';
import {
  computeInsights,
  gameStats,
  openingName,
  outcomeOf,
  phaseOf,
  pieceMaterial,
  puzzleRatingHistory,
  themeStats,
  topAdvice,
  parseTc,
  wdlScore,
} from '../src/chess/insights';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function mv(cls: MoveAnalysis['cls'], winLoss = 0, best = ''): MoveAnalysis {
  return { cp: 0, mate: null, best, bestPv: [], cls, winLoss };
}

function game(p: Partial<GameRecord> = {}): GameRecord {
  return {
    date: 1,
    white: 'You',
    black: 'Bot',
    userColor: 'white',
    timeControl: '15+10',
    result: '1-0',
    termination: 'checkmate',
    startFen: START,
    sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    times: [5000, 1000, 8000, 1000, 12000, 1000],
    pure: false,
    hintsUsed: 0,
    ...p,
  };
}

describe('phases', () => {
  it('counts non-pawn material', () => {
    expect(pieceMaterial(START)).toBe(62);
    expect(pieceMaterial('4k3/8/8/8/8/8/4P3/R3K3 w - - 0 1')).toBe(5);
  });
  it('opening / middlegame / endgame', () => {
    expect(phaseOf(0, START)).toBe('opening');
    expect(phaseOf(19, START)).toBe('opening');
    expect(phaseOf(20, START)).toBe('middlegame');
    expect(phaseOf(4, '4k3/8/8/8/8/8/4P3/R3K3 w - - 0 1')).toBe('endgame');
  });
});

describe('openings', () => {
  it('names common openings by the longest prefix', () => {
    expect(openingName(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3'])).toBe('Italian Game: Giuoco Piano');
    expect(openingName(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'])).toBe('Ruy Lopez');
    expect(openingName(['d4', 'd5', 'c4', 'e6'])).toBe("Queen's Gambit Declined");
    expect(openingName(['e4', 'c5'])).toBe('Sicilian Defence');
    expect(openingName(['a3'])).toBe('Other openings');
    expect(openingName(['e4'], '8/8/8/8/8/8/8/K6k w - - 0 1')).toBe('Custom position');
  });
});

describe('results', () => {
  it('outcome from the user side', () => {
    expect(outcomeOf(game())).toBe('win');
    expect(outcomeOf(game({ userColor: 'black' }))).toBe('loss');
    expect(outcomeOf(game({ result: '1/2-1/2' }))).toBe('draw');
    expect(outcomeOf(game({ result: '*' }))).toBeNull();
    expect(outcomeOf(game({ userColor: 'both' }))).toBeNull();
  });
  it('score', () => expect(wdlScore({ win: 1, draw: 2, loss: 1 })).toBe(50));
  it('parses time controls', () => {
    expect(parseTc('15+10')).toEqual({ base: 900000, inc: 10000 });
    expect(parseTc('none')).toBeNull();
  });
});

describe('gameStats', () => {
  it('splits accuracy and time by phase for the user only', () => {
    const analysis = [mv('book'), mv('book'), mv('best'), mv('best'), mv('blunder', 40, 'Bb5'), mv('best', 0, 'Nxe5')];
    const s = gameStats(game({ analysis, accuracy: { white: 70, black: 90 } }));
    expect(s.accuracy).toBe(70);
    expect(s.phaseAcc.opening[1]).toBe(3); // white's 3 moves
    expect(s.errors.blunder).toBe(1);
    expect(s.phaseTime.opening).toEqual([25, 3]);
    expect(s.opening).toBe('Italian Game: Giuoco Piano');
  });
  it('detects tactics the user missed', () => {
    // White to move can fork king and rook with Nc7+, but plays Kd2.
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const s = gameStats(game({ startFen: fen, sans: ['Kd2'], times: [], analysis: [mv('blunder', 50, 'Nc7+')] }));
    expect(s.missed.map((m) => m.id)).toContain('fork');
  });
  it('counts time trouble', () => {
    // 1+0: each white move takes 25 s, so the 3rd move starts with 10 s left (< 30 s).
    const s = gameStats(game({ timeControl: '1+0', times: [25000, 1000, 25000, 1000, 5000, 1000] }));
    expect(s.timeTrouble).toBe(1);
  });
});

describe('puzzles', () => {
  const att = (id: string, solved: boolean, date: number, rating = 800): PuzzleAttempt => ({ id, solved, date, rating });
  it('rebuilds the rating curve', () => {
    const h = puzzleRatingHistory([att('a', true, 2), att('b', true, 1), att('c', false, 3)]);
    expect(h.map((p) => p.date)).toEqual([1, 2, 3]);
    expect(h[0].rating).toBe(820);
    expect(h[2].rating).toBeLessThan(h[1].rating);
  });
  it('anchors the curve to the current rating', () => {
    const h = puzzleRatingHistory([att('a', true, 1), att('b', true, 2)], 800, 900);
    expect(h[h.length - 1].rating).toBe(900);
  });
  it('theme solve rates', () => {
    const themes: Record<string, string[]> = { a: ['fork', 'short'], b: ['fork'], c: ['fork', 'pin'], d: ['pin'], e: ['pin'] };
    const list = themeStats([att('a', true, 1), att('b', true, 1), att('c', false, 1), att('d', false, 1), att('e', false, 1)], (id) => themes[id]);
    expect(list.map((t) => t.theme)).toEqual(['fork', 'pin']);
    expect(list[0].rate).toBe(67);
    expect(list[1].rate).toBe(0);
  });
});

describe('computeInsights + advice', () => {
  it('summarises a set of games', () => {
    const analysis = [mv('book'), mv('book'), mv('best'), mv('best'), mv('blunder', 40), mv('best')];
    const games = [
      game({ date: 1, analysis, accuracy: { white: 60, black: 80 }, botLevel: 2 }),
      game({ date: 2, result: '0-1', analysis, accuracy: { white: 80, black: 80 }, botLevel: 2 }),
      game({ date: 3, result: '1/2-1/2', botLevel: 3 }),
      game({ date: 4, userColor: 'both' }),
    ];
    const ins = computeInsights(games, []);
    expect(ins.games).toBe(3);
    expect(ins.analysed).toBe(2);
    expect(ins.wdl).toEqual({ win: 1, draw: 1, loss: 1 });
    expect(ins.accuracy.map((a) => a.value)).toEqual([60, 80]);
    expect(ins.avgAccuracy).toBe(70);
    expect(ins.avgErrors.blunder).toBe(1);
    expect(ins.byBot).toEqual([
      { level: 2, win: 1, draw: 0, loss: 1 },
      { level: 3, win: 0, draw: 1, loss: 0 },
    ]);
    expect(ins.openings[0]).toMatchObject({ name: 'Italian Game: Giuoco Piano', color: 'white', games: 3 });
    const advice = topAdvice(ins);
    expect(advice).toHaveLength(3);
    expect(advice[0].id).toBe('blunders');
    expect(new Set(advice.map((a) => a.href)).size).toBe(3);
  });
  it('gives advice with no data at all', () => {
    const advice = topAdvice(computeInsights([], []));
    expect(advice.length).toBeGreaterThan(0);
    expect(advice.map((a) => a.id)).toContain('play');
  });
});
