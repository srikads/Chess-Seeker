import { describe, it, expect } from 'vitest';
import { dangers } from '../src/chess/guards';

describe('danger marks', () => {
  it('marks nothing in the starting position', () => {
    const d = dangers('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(d.pinned).toEqual([]);
    expect(d.mateIn1.size).toBe(0);
  });

  it('marks a piece pinned to the king', () => {
    // Black bishop b4 pins the knight d2 to the king e1.
    expect(dangers('4k3/8/8/8/1b6/8/3N4/4K3 w - - 0 1').pinned).toEqual(['d2']);
  });

  it('marks moves that allow a back-rank mate', () => {
    // ...Ra1# is threatened. Knight moves that don't cover the back rank lose; pawn moves that make luft don't.
    const d = dangers('r5k1/5ppp/8/8/7N/8/5PPP/6K1 w - - 0 1');
    expect(d.mateIn1.get('h4')).toEqual(expect.arrayContaining(['f5', 'g6']));
    expect(d.mateIn1.get('h4')).not.toContain('f3'); // Nf3 keeps Ne1 as a block
    expect(d.mateIn1.get('h2')).toBeUndefined(); // h3 gives the king air
  });
});
