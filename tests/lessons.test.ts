import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { ALL_LESSONS } from '../src/lessons';

// Fast legality checks (the engine-backed checks live in scripts/validate-lessons.ts).
describe('lessons', () => {
  it('have unique ids', () => {
    const ids = ALL_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  for (const l of ALL_LESSONS) {
    it(`${l.id}: all moves legal`, () => {
      for (const s of l.steps) {
        if (s.kind === 'quiz') {
          expect(s.answer).toBeLessThan(s.options.length);
          continue;
        }
        const g = new Chess(s.fen);
        if (s.kind === 'demo') for (const m of s.moves) expect(() => g.move(m.san)).not.toThrow();
        if (s.kind === 'try') {
          expect(s.solution.length % 2).toBe(1);
          for (const m of s.solution) expect(() => g.move(m)).not.toThrow();
        }
      }
    });
  }
});
