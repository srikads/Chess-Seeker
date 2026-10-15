// Safety marks for the side to move: pieces pinned to their king, and moves that walk into mate in one.
import { Chess, type Square } from 'chess.js';
import { other } from './util';

export interface Dangers {
  /** pieces pinned to their own king — moving them off the line is illegal or exposes the king */
  pinned: Square[];
  /** from-square → destination squares that allow the opponent to mate in one */
  mateIn1: Map<Square, Square[]>;
}

/** Can the side to move deliver mate in one? (SAN of a mating move ends with '#') */
function hasMateInOne(g: Chess): boolean {
  return g.moves().some((s) => s.endsWith('#'));
}

export function dangers(fen: string): Dangers {
  const g = new Chess(fen);
  const me = g.turn();
  const king = g.findPiece({ type: 'k', color: me })[0];
  const out: Dangers = { pinned: [], mateIn1: new Map() };
  if (!king || g.isGameOver()) return out;

  // Pins: lift the piece off the board — is the king suddenly attacked? (skip when already in check)
  if (!g.inCheck())
    for (const row of g.board())
      for (const p of row) {
        if (!p || p.color !== me || p.type === 'k') continue;
        const t = new Chess(fen);
        t.remove(p.square);
        if (t.isAttacked(king, other(me))) out.pinned.push(p.square);
      }

  // Moves after which the opponent has a mating move.
  for (const m of g.moves({ verbose: true })) {
    const t = new Chess(fen);
    t.move(m);
    if (t.isGameOver() || !hasMateInOne(t)) continue;
    const list = out.mateIn1.get(m.from) ?? [];
    if (!list.includes(m.to)) list.push(m.to);
    out.mateIn1.set(m.from, list);
  }
  return out;
}
