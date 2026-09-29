import { describe, it, expect } from 'vitest';
import { parsePgn, normaliseTimeControl, isLongTimeControl } from '../src/chess/pgn';

const CHESSCOM = `[Event "RealVagabond vs oncea_pawna_time"]
[Site "Chess.com"]
[Date "2026-09-29"]
[White "RealVagabond"]
[Black "oncea_pawna_time"]
[Result "1-0"]
[WhiteElo "1359"]
[BlackElo "277"]
[TimeControl "600"]
[Termination "*"]
1. d4 f5 2. c4 Nf6 3. Nf3 e6 4. g3 Bb4+ 5. Nc3 O-O 6. Bg2 Nc6 7. d5 exd5 8. cxd5
Na5 9. O-O Nh5 10. Qd4 Be7 11. e4 fxe4 12. Nxe4 d6 13. Bd2 Nc6 14. dxc6 bxc6 15.
Bg5 c5 16. Qd5+ Rf7 17. Bxe7 Qxe7 18. Neg5 Ba6 19. Qxa8+ Rf8 20. Qe4 Qe8 21.
Qxh7# 1-0`;

describe('parsePgn', () => {
  it('imports a chess.com game', () => {
    const g = parsePgn(CHESSCOM);
    expect(g.sans.length).toBe(41);
    expect(g.sans.at(-1)).toBe('Qxh7#');
    expect(g.white).toBe('RealVagabond (1359)');
    expect(g.black).toBe('oncea_pawna_time (277)');
    expect(g.result).toBe('1-0');
    expect(g.termination).toBe('checkmate');
    expect(g.timeControl).toBe('10+0');
  });
  it('handles clock comments and a won-by termination', () => {
    const g = parsePgn('[White "a"]\n[Black "b"]\n[Result "0-1"]\n[Termination "b won by resignation"]\n\n1. e4 {[%clk 0:09:58]} e5 {[%clk 0:09:57]} 0-1');
    expect(g.sans).toEqual(['e4', 'e5']);
    expect(g.termination).toBe('resignation');
  });
  it('rejects junk', () => {
    expect(() => parsePgn('hello world')).toThrow();
    expect(() => parsePgn('')).toThrow();
  });
  it('normalises time controls', () => {
    expect(normaliseTimeControl('900+10')).toBe('15+10');
    expect(normaliseTimeControl('-')).toBe('none');
    expect(isLongTimeControl('10+0')).toBe(false);
    expect(isLongTimeControl('15+10')).toBe(true);
    expect(isLongTimeControl('3+2')).toBe(false);
  });
});
