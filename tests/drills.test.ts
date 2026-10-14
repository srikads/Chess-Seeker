import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { DRILLS, drillById, drillOutcome } from '../src/data/drills';

describe('drills', () => {
  it('have unique ids and legal, playable positions', () => {
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(DRILLS.length);
    for (const d of DRILLS) {
      const g = new Chess(d.fen);
      expect(g.fen()).toBe(d.fen);
      expect(g.isGameOver(), d.id).toBe(false);
      expect(g.moves().length, d.id).toBeGreaterThan(0);
      expect(d.tips.length, d.id).toBeGreaterThan(0);
      expect(d.maxMoves).toBeGreaterThan(0);
      if (d.goal === 'win-material') expect(d.material).toBeGreaterThan(0);
    }
  });

  it('detects mate as success', () => {
    const d = drillById('back-rank')!;
    const g = new Chess(d.fen);
    g.move('Qxe8+');
    expect(drillOutcome(d, g, 'w', 1).done).toBe(false);
    g.move('Rxe8');
    g.move('Rxe8#');
    expect(drillOutcome(d, g, 'w', 2)).toMatchObject({ done: true, success: true });
  });

  it('fails when out of moves, and stalemate is not a win', () => {
    const d = drillById('queen-corner')!;
    const g = new Chess(d.fen);
    g.move('Qd7');
    g.move('Kg8');
    g.move('Qe7');
    g.move('Kh8');
    g.move('Qe8+');
    g.move('Kh7');
    expect(drillOutcome(d, g, 'w', 3)).toMatchObject({ done: true, success: false });
    const s = new Chess('7k/8/5KQ1/8/8/8/8/8 b - - 1 1');
    // g8, g7 and h7 are all covered: stalemate
    expect(s.isStalemate()).toBe(true);
    expect(drillOutcome(d, s, 'w', 1)).toMatchObject({ done: true, success: false });
  });

  it('counts material for win-material drills', () => {
    const d = drillById('knight-fork-rook')!;
    const g = new Chess(d.fen);
    g.move('Nf7+');
    g.move('Kg8');
    expect(drillOutcome(d, g, 'w', 1).done).toBe(false);
    g.move('Nxd8');
    g.move('Kf8');
    expect(drillOutcome(d, g, 'w', 2)).toMatchObject({ done: true, success: true });
  });

  it('promotion: a safe new queen wins; draw goals succeed after surviving', () => {
    const d = drillById('pawn-race')!;
    const g = new Chess(d.fen);
    for (const m of ['g6', 'b3', 'g7', 'b2', 'g8=Q+']) g.move(m);
    expect(drillOutcome(d, g, 'w', 3)).toMatchObject({ done: true, success: true });
    const h = drillById('kp-hold')!;
    const k = new Chess(h.fen);
    expect(drillOutcome(h, k, 'w', h.maxMoves)).toMatchObject({ done: true, success: true });
  });

  it('opponent promoting fails a promote drill', () => {
    const d = drillById('pawn-race')!;
    const g = new Chess(d.fen);
    for (const m of ['Kg2', 'b3', 'Kf3', 'b2', 'Ke2', 'b1=Q']) g.move(m);
    expect(drillOutcome(d, g, 'w', 3)).toMatchObject({ done: true, success: false });
  });
});
