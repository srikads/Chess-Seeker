import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { motifsOf } from '../src/chess/motifs';
import { lessonById } from '../src/lessons';

const ids = (fen: string, san: string) => motifsOf(fen, new Chess(fen).move(san)).map((m) => m.id);

describe('motifsOf', () => {
  it('fork', () => expect(ids('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'Nc7+')).toContain('fork'));
  it('pin', () => expect(ids('r1bqkbnr/ppp2ppp/2np4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', 'Bb5')).toContain('pin'));
  it('skewer', () => expect(ids('3q4/8/8/3k4/8/8/8/R3K3 w - - 0 1', 'Rd1+')).toContain('skewer'));
  it('back-rank mate', () => expect(ids('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'Ra8#')).toContain('back-rank'));
  it('smothered mate', () => expect(ids('6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', 'Nf7#')).toContain('smothered'));
  it("Légal's mate is not smothered", () => {
    const fen = 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6';
    const g = new Chess(fen);
    g.move('Bxf7+');
    g.move('Ke7');
    expect(ids(g.fen(), 'Nd5#')).toContain('mate');
    expect(ids(g.fen(), 'Nd5#')).not.toContain('smothered');
  });
  it('castling and development', () => {
    expect(ids('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'O-O')).toContain('castle');
    expect(ids(new Chess().fen(), 'Nf3')).toContain('develop');
  });
  it('every motif links to a real lesson', () => {
    const all = [
      ...motifsOf('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', new Chess('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1').move('Nc7+')),
    ];
    for (const m of all) expect(lessonById(m.lesson)).toBeTruthy();
  });
});
