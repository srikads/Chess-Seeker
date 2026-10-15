import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { classifyLive } from '../src/chess/liveClassify';
import type { PvLine } from '../src/engine/engine';

const pv = (cp: number | null, mate: number | null, moves: string, multipv = 1): PvLine => ({ multipv, depth: 16, cp, mate, pv: moves.split(' ') });
const mv = (fen: string, san: string) => new Chess(fen).move(san);

describe('classifyLive', () => {
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

  it('marks the engine move as best', () => {
    const cls = classifyLive({ fenBefore: fen, move: mv(fen, 'Bb5'), before: [pv(40, null, 'f1b5 a7a6'), pv(35, null, 'f1c4 f8c5', 2)], after: [pv(-38, null, 'a7a6')], ply: 10 });
    expect(cls).toBe('best');
  });

  it('returns book for book positions', () => {
    const cls = classifyLive({ fenBefore: fen, move: mv(fen, 'Bc4'), before: [pv(40, null, 'f1b5')], after: [pv(-30, null, 'f8c5')], ply: 4, inBook: true });
    expect(cls).toBe('book');
  });

  it('flags a move that drops a piece as a blunder', () => {
    // the engine says the position swung from +0.4 to -4.5 for the mover
    const cls = classifyLive({ fenBefore: fen, move: mv(fen, 'Ng5'), before: [pv(40, null, 'f1b5')], after: [pv(450, null, 'd8g5')], ply: 10 });
    expect(cls).toBe('blunder');
  });

  it('flags walking into mate', () => {
    const cls = classifyLive({ fenBefore: fen, move: mv(fen, 'Nh4'), before: [pv(40, null, 'f1b5')], after: [pv(null, 3, 'd8h4')], ply: 10 });
    expect(cls).toBe('blunder');
  });

  it('calls a checkmating move best and waits for engine data otherwise', () => {
    const mateFen = 'rnbqkbnr/ppppp2p/5p2/6p1/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3';
    expect(classifyLive({ fenBefore: mateFen, move: mv(mateFen, 'Qh5#'), before: [], after: [], ply: 4 })).toBe('best');
    expect(classifyLive({ fenBefore: fen, move: mv(fen, 'Bc4'), before: [], after: [], ply: 4 })).toBeNull();
    expect(classifyLive({ fenBefore: fen, move: mv(fen, 'Bc4'), before: [pv(40, null, 'f1b5')], after: [], ply: 4 })).toBeNull();
  });
});
