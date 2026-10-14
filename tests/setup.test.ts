import { describe, expect, it } from 'vitest';
import { buildFen, deriveCastling, positionError } from '../src/chess/setup';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

describe('position editor helpers', () => {
  it('derives castling rights from king and rook squares', () => {
    expect(deriveCastling(START)).toBe('KQkq');
    expect(deriveCastling('r3k3/8/8/8/8/8/8/4K2R')).toBe('Kq');
    expect(deriveCastling('4k3/8/8/8/8/8/8/R3K2R')).toBe('KQ');
    expect(deriveCastling('8/8/8/8/8/8/8/K6k')).toBe('-');
  });

  it('builds a full FEN', () => {
    expect(buildFen(START, 'b')).toBe(`${START} b KQkq - 0 1`);
  });

  it('accepts legal positions and explains illegal ones', () => {
    expect(positionError(buildFen(START, 'w'))).toBeNull();
    expect(positionError('8/8/8/8/8/8/8/K7 w - - 0 1')).toMatch(/one king/);
    expect(positionError('k7/8/8/8/8/8/8/KP6 w - - 0 1')).toMatch(/first or last rank/);
    // Black is in check while White is to move
    expect(positionError('k7/8/8/8/8/8/8/KR6 w - - 0 1')).toBeNull();
    expect(positionError('k7/8/8/8/8/8/8/R6K w - - 0 1')).toMatch(/in check/);
    expect(positionError('nonsense')).not.toBeNull();
  });
});
