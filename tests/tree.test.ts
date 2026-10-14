import { describe, expect, it } from 'vitest';
import { GameTree, START_FEN } from '../src/chess/tree';

const sans = (nodes: { san: string }[]) => nodes.map((n) => n.san);

describe('GameTree', () => {
  it('plays moves and reuses existing children', () => {
    const t = new GameTree();
    const e4 = t.play(t.root, 'e4')!;
    expect(e4.created).toBe(true);
    expect(e4.node.ply).toBe(1);
    expect(t.play(t.root, { from: 'e2', to: 'e4' })!.created).toBe(false);
    expect(t.root.children).toHaveLength(1);
    expect(t.play(t.root, 'e5')).toBeNull();
  });

  it('creates variations and keeps the main line first', () => {
    const t = new GameTree();
    const end = t.playLine(t.root, ['e4', 'e5', 'Nf3', 'Nc6']);
    const e5 = t.root.children[0].children[0];
    const c5 = t.play(t.root.children[0], 'c5')!.node;
    expect(sans(t.mainline())).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(t.isMainline(end)).toBe(true);
    expect(t.isMainline(c5)).toBe(false);
    expect(t.root.children[0].children).toEqual([e5, c5]);
    expect(sans(t.path(end))).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(t.lineEnd(t.root)).toBe(end);
  });

  it('promotes a variation and makes it the main line', () => {
    const t = new GameTree();
    t.playLine(t.root, ['e4', 'e5', 'Nf3', 'Nc6']);
    const e4 = t.root.children[0];
    const deep = t.playLine(e4, ['c5', 'Nf3', 'd6']);
    const nested = t.playLine(deep.parent!, ['Nc6']); // variation inside a variation
    expect(t.isMainline(nested)).toBe(false);
    t.makeMainline(nested);
    expect(t.isMainline(nested)).toBe(true);
    expect(sans(t.mainline())).toEqual(['e4', 'c5', 'Nf3', 'Nc6']);
    // old main line is still there as a variation
    expect(sans(e4.children)).toEqual(['c5', 'e5']);
    expect(t.promote(t.root.children[0])).toBe(false);
  });

  it('deletes a variation with everything after it', () => {
    const t = new GameTree();
    t.playLine(t.root, ['d4', 'd5', 'c4']);
    const v = t.playLine(t.root.children[0], ['Nf6', 'c4', 'g6']);
    const nf6 = t.root.children[0].children[1];
    expect(t.remove(nf6)).toBe(t.root.children[0]);
    expect(t.get(v.id)).toBeUndefined();
    expect(t.root.children[0].children).toHaveLength(1);
    expect(t.remove(t.root)).toBeNull();
  });

  it('finds nodes by UCI path', () => {
    const t = new GameTree();
    const n = t.playLine(t.root, ['e2e4', 'c7c5', 'g1f3']);
    expect(n.san).toBe('Nf3');
    expect(t.find(['e2e4', 'c7c5', 'g1f3'])).toBe(n);
    expect(t.find(['d2d4'])).toBeNull();
  });

  it('writes PGN with variations and reads it back', () => {
    const t = new GameTree();
    t.playLine(t.root, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    t.playLine(t.root.children[0], ['c5', 'Nf3']);
    const nf3 = t.root.children[0].children[0].children[0];
    t.playLine(nf3, ['d6']);
    const pgn = t.toPgn();
    expect(pgn).toContain('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 (2... d6) 3. Bb5 *');
    const back = GameTree.fromPgn(pgn);
    expect(back.toPgn()).toBe(pgn);
    expect(back.root.fen).toBe(START_FEN);
  });

  it('parses comments, NAGs, nested variations and a FEN header', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const pgn = `[Event "x"]\n[SetUp "1"]\n[FEN "${fen}"]\n\n3. Bc4 {Italian} Bc5 $1 (3... Nf6!? 4. Ng5 (4. d3) d5) 4. c3?! *`;
    const t = GameTree.fromPgn(pgn);
    expect(t.root.fen).toBe(fen);
    expect(sans(t.mainline())).toEqual(['Bc4', 'Bc5', 'c3']);
    const bc4 = t.root.children[0];
    expect(sans(bc4.children)).toEqual(['Bc5', 'Nf6']);
    expect(sans(bc4.children[1].children)).toEqual(['Ng5', 'd3']);
    expect(t.toPgn()).toContain('3. Bc4 Bc5 (3... Nf6 4. Ng5 (4. d3) 4... d5) 4. c3 *');
  });

  it('rejects illegal PGN moves', () => {
    expect(() => GameTree.fromPgn('1. e4 e4')).toThrow(/Illegal/);
  });
});
