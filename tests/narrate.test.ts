import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { describeMoment, narrateMoment, lineOutcome } from '../src/chess/narrate';

const fenAt = (sans: string[]) => {
  const g = new Chess();
  for (const s of sans) g.move(s);
  return g.fen();
};

// 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#
const scholar = { fen: fenAt(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4']), san: 'Nf6', cls: 'blunder' as const, mine: true, opp: 'Ned', best: 'g6', bestPv: ['g6', 'Qf3', 'Nf6'], replyPv: ['Qxf7#'], matedIn: 1, prevSan: 'Bc4', prevLastMove: ['f1', 'c4'] as [string, string] };
// 1.e4 e5 2.Nf3 Nc6 3.Ng5?? — the knight walks into the queen
const hang = { fen: fenAt(['e4', 'e5', 'Nf3', 'Nc6']), san: 'Ng5', cls: 'blunder' as const, mine: true, opp: 'Ned', best: 'Bc4', bestPv: ['Bc4', 'Nf6'], replyPv: ['Qxg5', 'd4', 'Qg6'] };

describe('lineOutcome', () => {
  it('finds a mate', () => {
    const o = lineOutcome(fenAt(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6']), ['Qxf7#'], 'b');
    expect(o.kind).toBe('mate');
    expect(o.mateSan).toBe('Qxf7#');
  });
  it('does not call an even trade a loss', () => {
    const o = lineOutcome(fenAt(['e4', 'd5']), ['exd5', 'Qxd5', 'Nc3'], 'b');
    expect(o.kind).toBe('none');
    expect(o.net).toBe(0);
  });
  it('counts a lost piece and cuts the line once captures settle', () => {
    const o = lineOutcome(fenAt(['e4', 'e5', 'Nf3', 'Nc6', 'Ng5']), ['Qxg5', 'd4', 'Qg6', 'd5'], 'w');
    expect(o.kind).toBe('material');
    expect(o.lost).toBe('n');
    expect(o.lostSq).toBe('g5');
    expect(o.sans[0]).toBe('Qxg5');
  });
});

describe('describeMoment', () => {
  it('says a mate blunder in one short line with a Show Checkmate button', () => {
    const m = describeMoment(scholar);
    expect(m.title).toBe('Nf6 is a blunder');
    expect(m.line).toMatch(/Qxf7#, checkmate/);
    expect(m.show?.label).toBe('Show Checkmate');
    expect(m.show?.sans).toEqual(['Qxf7#']);
    expect(m.retry).toBe('better');
    expect(m.best?.text).toMatch(/^Best was g6\./);
    expect(m.arrows.map((a) => a.brush)).toEqual(['red', 'green']);
  });

  it('says when your piece hangs', () => {
    const m = describeMoment(hang);
    expect(m.line).toBe('It hangs your knight. Ned can take it.');
    expect(m.show?.label).toBe('Show Lost Piece');
    expect(m.flash).toEqual(['g5']);
  });

  it("frames the opponent's blunder as your chance", () => {
    const m = describeMoment({ ...hang, mine: false });
    expect(m.line).toMatch(/hangs their knight\. Take it with Qxg5!/);
    expect(m.show?.label).toBe('Show Free Piece');
    expect(m.retry).toBe('punish');
  });

  it('explains a miss', () => {
    const m = describeMoment({ fen: fenAt(['e4', 'e5', 'Nf3', 'Nc6', 'Ng5']), san: 'd6', cls: 'miss', mine: true, opp: 'Ned', best: 'Qxg5', bestPv: ['Qxg5', 'd4'], replyPv: [], prevSan: 'Ng5' });
    expect(m.title).toBe('d6 is a miss');
    expect(m.line).toBe('You missed Qxg5, which wins their knight.');
    expect(m.show?.from).toBe('before');
  });

  it('praises a good move in one line', () => {
    const m = describeMoment({ fen: fenAt(['e4', 'e5']), san: 'Nf3', cls: 'best', mine: true, opp: 'Ned', best: 'Nf3', bestPv: ['Nf3'], replyPv: ['Nc6', 'Bb5'] });
    expect(m.title).toBe('Nf3 is best');
    expect(m.line).toMatch(/^It attacks their pawn on e5\.$/);
  });
});

describe('narrateMoment', () => {
  const steps = narrateMoment(scholar);
  it('walks through threat → move → punishment → better move → tip', () => {
    expect(steps.length).toBe(5);
    expect(steps[0].text).toMatch(/threatens Qxf7#/);
    expect(steps[0].arrows?.[0]).toMatchObject({ orig: 'h5', dest: 'f7', brush: 'red' });
    expect(steps[1].moves).toEqual(['Nf6']);
    expect(steps[1].badge).toEqual({ sq: 'f6', cls: 'blunder' });
    expect(steps[2].moves).toEqual(['Qxf7#']);
    expect(steps[2].text).toMatch(/checkmate/);
    expect(steps[3].moves).toEqual(['g6']);
    expect(steps[3].badge).toEqual({ sq: 'g6', cls: 'best' });
    expect(steps[4].text).toMatch(/^Tip:/);
  });
  it('keeps every step short (at most two sentences, except the tip)', () => {
    for (const s of steps.slice(0, -1)) expect(s.text.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(3);
  });
  it('every animated line is legal from its start position', () => {
    for (const s of steps) {
      if (!s.fen || !s.moves) continue;
      const g = new Chess(s.fen);
      for (const mv of s.moves) expect(() => g.move(mv)).not.toThrow();
    }
  });
});
