import { Chess, type Move, type Square, type PieceSymbol, type Color } from 'chess.js';

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const SIDE = (c: Color) => (c === 'w' ? 'White' : 'Black');
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function uciToMove(uci: string) {
  return { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci.length > 4 ? uci[4] : undefined };
}

export function moveToUci(m: { from: string; to: string; promotion?: string }) {
  return m.from + m.to + (m.promotion ?? '');
}

/** Play a UCI move on a copy of fen; returns verbose Move or null. */
export function tryUci(fen: string, uci: string): Move | null {
  try {
    return new Chess(fen).move(uciToMove(uci));
  } catch {
    return null;
  }
}

export function uciToSan(fen: string, uci: string): string {
  return tryUci(fen, uci)?.san ?? uci;
}

/** Convert a UCI PV to SAN, stopping at the first illegal move. */
export function pvToSan(fen: string, pv: string[], max = 99): string[] {
  const g = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      out.push(g.move(uciToMove(u)).san);
    } catch {
      break;
    }
  }
  return out;
}

/** "12. Nf3 Nc6 13. Bb5" style formatting for a SAN line starting at fen. */
export function formatLine(fen: string, sans: string[]): string {
  const g = new Chess(fen);
  let n = g.moveNumber();
  let white = g.turn() === 'w';
  const parts: string[] = [];
  sans.forEach((s, i) => {
    if (white) parts.push(`${n}. ${s}`);
    else parts.push(i === 0 ? `${n}… ${s}` : s);
    if (!white) n++;
    white = !white;
  });
  return parts.join(' ');
}

/** Legal destinations map for chessground. */
export function destsOf(g: Chess): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>();
  for (const m of g.moves({ verbose: true })) {
    const arr = dests.get(m.from) ?? [];
    arr.push(m.to);
    dests.set(m.from, arr);
  }
  return dests;
}

export function isPromotion(g: Chess, from: Square, to: Square): boolean {
  const p = g.get(from);
  return !!p && p.type === 'p' && (to[1] === '8' || to[1] === '1');
}

export function turnColor(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

export function fenSideToMove(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

/** Material balance (White minus Black) in pawns. */
export function material(g: Chess): number {
  let s = 0;
  for (const row of g.board()) for (const p of row) if (p) s += (p.color === 'w' ? 1 : -1) * VALUE[p.type];
  return s;
}

/** Pieces captured so far, relative to the starting set (for the captured-pieces strip). */
export function capturedPieces(g: Chess): { w: PieceSymbol[]; b: PieceSymbol[] } {
  const start: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const cnt = { w: { ...start }, b: { ...start } };
  for (const row of g.board()) for (const p of row) if (p) cnt[p.color][p.type]--;
  const list = (c: Color) => (['q', 'r', 'b', 'n', 'p'] as PieceSymbol[]).flatMap((t) => Array(Math.max(0, cnt[c][t])).fill(t));
  // w: white pieces that were captured (shown next to Black), etc.
  return { w: list('w'), b: list('b') };
}
