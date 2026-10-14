import { describe, it, expect } from 'vitest';
import { performance, ratingFromAccuracy, ratingInName, MIN_MOVES } from '../src/chess/performance';
import type { MoveAnalysis, MoveClass } from '../src/store/db';

const mv = (winLoss: number, cls: MoveClass = 'good'): MoveAnalysis => ({ cp: 0, mate: null, best: '', bestPv: [], cls, winLoss });

describe('performance rating', () => {
  it('rises with accuracy and stays in range', () => {
    const rs = [20, 50, 65, 75, 85, 95, 100].map(ratingFromAccuracy);
    for (let k = 1; k < rs.length; k++) expect(rs[k]).toBeGreaterThanOrEqual(rs[k - 1]);
    expect(rs[0]).toBe(100);
    expect(rs[rs.length - 1]).toBe(2900);
    expect(rs.every((r) => r % 50 === 0)).toBe(true);
  });

  it('reads ratings from names', () => {
    expect(ratingInName('Knightly Ned (600)')).toBe(600);
    expect(ratingInName('You')).toBeNull();
  });

  it('rates each side separately and skips book moves', () => {
    // White plays perfectly, Black blunders every move; the first two moves are book.
    const a = [mv(0, 'book'), mv(0, 'book')];
    for (let k = 0; k < 10; k++) a.push(mv(0), mv(40));
    const w = performance(a, 'white');
    const b = performance(a, 'black');
    expect(w.moves).toBe(10);
    expect(w.rating!).toBeGreaterThan(2500);
    expect(b.rating!).toBeLessThan(400);
  });

  it('refuses to rate very short games', () => {
    const a = Array.from({ length: (MIN_MOVES - 1) * 2 }, () => mv(0));
    expect(performance(a, 'white').rating).toBeNull();
  });
});
