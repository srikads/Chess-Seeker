// Lightweight static board preview (CSS grid + chessground piece sprites) for cards and lists.
// No chessground instance, so dozens can be on a page at once.
import { h } from './dom';
import '../styles/viz.css';

const ROLE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** Small non-interactive board. `highlight` squares get a soft last-move wash. */
export function miniBoard(fen: string, o: { orientation?: 'white' | 'black'; highlight?: string[]; label?: string } = {}): HTMLElement {
  const rows = fen.split(' ')[0].split('/');
  const cells: HTMLElement[] = [];
  const grid: (string | null)[][] = rows.map((row) => {
    const out: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let k = 0; k < Number(ch); k++) out.push(null);
      else out.push(ch);
    }
    return out;
  });
  const flip = o.orientation === 'black';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const rr = flip ? 7 - r : r;
      const ff = flip ? 7 - f : f;
      const sq = `${'abcdefgh'[ff]}${8 - rr}`;
      const ch = grid[rr]?.[ff] ?? null;
      const dark = (rr + ff) % 2 === 1;
      cells.push(
        h(
          `span.mb-sq${dark ? '.dark' : ''}${o.highlight?.includes(sq) ? '.hl' : ''}`,
          ch ? h(`piece.${ROLE[ch.toLowerCase()]}.${ch === ch.toUpperCase() ? 'white' : 'black'}`) : null,
        ),
      );
    }
  }
  return h('div.mini-board.cg-wrap', { role: 'img', 'aria-label': o.label ?? 'Chess position' }, cells);
}
