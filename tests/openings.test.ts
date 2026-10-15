import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { OpeningBook, expandLines, posKey, type BookData } from '../src/data/openings';

const data = JSON.parse(readFileSync(new URL('../public/openings/openings.json', import.meta.url), 'utf8')) as BookData;
const lines = expandLines(data);
const book = new OpeningBook(lines);
const after = (...sans: string[]) => {
  const g = new Chess();
  for (const s of sans) g.move(s);
  return g.fen();
};

describe('opening book data', () => {
  it('has thousands of named lines, every one legal', () => {
    expect(lines.length).toBeGreaterThan(3000);
    for (const l of lines) {
      expect(l.eco).toMatch(/^[A-E]\d\d$/);
      expect(l.name.length).toBeGreaterThan(2);
      const g = new Chess();
      for (const u of l.uci) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); // throws if illegal
      // the fast tree builder must reach exactly the position chess.js reaches
      expect(book.nodes(g.fen()).length).toBeGreaterThan(0);
    }
  }, 120_000);

  it('stays small enough to precache', () => {
    expect(readFileSync(new URL('../public/openings/openings.json', import.meta.url)).length).toBeLessThan(400_000);
  });
});

describe('OpeningBook', () => {
  it('names well-known positions', () => {
    expect(book.lookup(after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4'))?.name).toBe('Italian Game');
    expect(book.lookup(after('e4', 'e5', 'Nf3', 'Nc6', 'Bb5'))?.name).toBe('Ruy Lopez');
    expect(book.lookup(after('e4', 'c5'))?.name).toBe('Sicilian Defense');
    expect(book.lookup(after('e4', 'c6'))?.eco).toBe('B10');
    expect(book.lookup(after('d4', 'd5', 'c4'))?.name).toBe("Queen's Gambit");
  });

  it('recognises transpositions', () => {
    // 1.Nf3 Nc6 2.e4 e5 3.Bc4 reaches the Italian by another move order
    expect(book.lookup(after('Nf3', 'Nc6', 'e4', 'e5', 'Bc4'))?.name).toBe('Italian Game');
  });

  it('falls back to the nearest named ancestor', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ 7.Nc3 is book; 7…Nxe4 is the (named) Greco line,
    // the position after 6…Bb4+ alone has no name of its own but is inside the Italian
    const seq = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+'];
    const fen = after(...seq);
    expect(book.inBook(fen)).toBe(true);
    expect(book.lookup(fen)?.name).toMatch(/^Italian Game/);
  });

  it('identifies an off-book game by its last book position', () => {
    const g = new Chess();
    const fens = [g.fen()];
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'h6', 'h3', 'h5']) fens.push((g.move(s), g.fen()));
    expect(book.identify(fens)?.name).toMatch(/^Ruy Lopez/);
  });

  it('lists book continuations with names, main moves first', () => {
    const c = book.continuations(after('e4'));
    const sans = c.map((x) => x.san);
    expect(sans).toContain('e5');
    expect(sans).toContain('c5');
    expect(sans.indexOf('c5')).toBeLessThan(5);
    expect(c.find((x) => x.san === 'c5')).toMatchObject({ exact: true, name: 'Sicilian Defense' });
    for (const x of c) expect(new Chess(x.fen)).toBeTruthy();
    expect(book.continuations('8/8/8/4k3/8/8/8/4K3 w - - 0 1')).toEqual([]);
  });

  it('looks up an opening by name with its moves', () => {
    expect(book.byName('Italian Game')).toMatchObject({ eco: 'C50', san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] });
    expect(book.byName('No Such Opening')).toBeNull();
  });

  it('normalises FEN keys', () => {
    expect(posKey(after('e4'))).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq');
    expect(book.inBook(after('e4', 'e5'))).toBe(true);
  });
});
