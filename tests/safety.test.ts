import { describe, it, expect } from 'vitest';
import { cct, cctSummary, moveSafety, threatsAgainst, withTurn } from '../src/chess/safety';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('withTurn', () => {
  it('keeps the position when the colour is already to move', () => {
    expect(withTurn(START, 'w')!.fen()).toBe(START);
  });
  it('refuses a position where the passing side would be in check', () => {
    // White king on e1 is in check from the rook on e8: Black cannot be "to move".
    expect(withTurn('4r1k1/8/8/8/8/8/8/4K3 w - - 0 1', 'b')).toBeNull();
  });
});

describe('cct', () => {
  it('finds nothing in the starting position', () => {
    const c = cct(START, 'w');
    expect(c.checks).toEqual([]);
    expect(c.captures).toEqual([]);
  });

  it('lists checks and winning captures for both sides', () => {
    // 1.e4 b5: White can take b5 with the bishop for free.
    const fen = 'rnbqkbnr/p1pppppp/8/1p6/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const mine = cct(fen, 'w');
    expect(mine.captures.map((m) => m.san)).toEqual(['Bxb5']);
    expect(mine.captures[0].good).toBe(true);
    expect(cct(fen, 'b').captures).toEqual([]);
  });

  it('counts a check and marks mate as good', () => {
    // Back-rank: Re8# is mate.
    const c = cct('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', 'w');
    expect(c.checks.map((m) => m.san)).toContain('Re8#');
    expect(c.checks[0].good).toBe(true);
  });

  it('finds a threat against a loose piece', () => {
    // Knight on f6 is undefended; Bg5 attacks it (bishop is safe on g5).
    const c = cct('4k3/8/5n2/8/8/8/8/2B1K3 w - - 0 1', 'w');
    expect(c.threats.map((m) => m.san)).toContain('Bg5');
  });
});

describe('cctSummary', () => {
  it('talks about both sides in plain words', () => {
    const t = cctSummary('captures', [{ from: 'f1', to: 'b5', san: 'Bxb5', good: true }], []);
    expect(t).toContain('You can capture with **Bxb5**');
    expect(t).toContain('They have no captures');
  });
});

describe('moveSafety', () => {
  const fen = 'rnbqkbnr/p1pppppp/8/1p6/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
  it('flags a bishop moved to a square a pawn attacks', () => {
    const s = moveSafety(fen, { from: 'f1', to: 'c4' });
    expect(s.safe).toBe(false);
    expect(s.newlyHanging).toEqual(['c4']);
    expect(s.attackers).toEqual([{ from: 'b5', to: 'c4' }]);
    expect(s.text).toContain('bishop on c4');
  });
  it('is happy with a safe developing move', () => {
    expect(moveSafety(fen, { from: 'b1', to: 'c3' }).safe).toBe(true);
  });
  it('does not complain about a fair trade', () => {
    // Nxe5 takes a knight defended by a pawn: knight for knight.
    const s = moveSafety('4k3/8/3p4/4n3/8/5N2/8/4K3 w - - 0 1', { from: 'f3', to: 'e5' });
    expect(s.newlyHanging).toEqual([]);
  });
  it('spots a move that allows mate in one', () => {
    // The knight stops blocking the a-file: ...Ra1# follows.
    const s = moveSafety('r5k1/5ppp/8/8/8/N7/5PPP/6K1 w - - 0 1', { from: 'a3', to: 'c4' });
    expect(s.allowsMate?.san).toBe('Ra1#');
    expect(s.safe).toBe(false);
  });
});

describe('threatsAgainst', () => {
  it('names an attacked piece and its attacker', () => {
    // Black to move: the pawn on d5 attacks the knight on c6.
    const t = threatsAgainst('4k3/8/2n5/3P4/8/8/8/4K3 b - - 0 1');
    expect(t[0]).toMatchObject({ from: 'd5', to: 'c6', kind: 'hanging' });
    expect(t[0].text).toContain('their pawn attacks your knight on c6');
  });
  it('warns about a mate threat', () => {
    const t = threatsAgainst('r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1');
    expect(t[0]).toMatchObject({ from: 'a8', to: 'a1', kind: 'mate' });
    expect(t[0].text).toContain('Ra1#');
  });
});
