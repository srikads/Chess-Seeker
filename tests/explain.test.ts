import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { describeMove, hangingPieces, currentThreats } from '../src/chess/explain';
import { formatLine, pvToSan } from '../src/chess/util';

describe('explain', () => {
  it('detects a knight fork', () => {
    const fen2 = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const fork = new Chess(fen2).move('Nc7+');
    const r = describeMove(fen2, fork);
    expect(r.join(' ')).toMatch(/fork/);
    expect(r.join(' ')).toMatch(/check/);
  });
  it('finds hanging pieces', () => {
    const g = new Chess('4k3/8/8/3n4/8/2N5/8/4K3 w - - 0 1');
    expect(hangingPieces(g, 'b')).toEqual(['d5']);
  });
  it('spots a mate threat', () => {
    // Black to move; White threatens Qxf7#
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 5 4';
    expect(currentThreats(fen).join(' ')).toMatch(/mate/);
  });
  it('formats lines', () => {
    const fen = new Chess().fen();
    expect(formatLine(fen, pvToSan(fen, ['e2e4', 'e7e5', 'g1f3']))).toBe('1. e4 e5 2. Nf3');
  });
});
