// Helpers for the position editor: build a full FEN from a piece placement and check it's playable.
import { Chess } from 'chess.js';

function rows(placement: string): string[][] {
  // rank 8 first; each row = 8 chars ('.' empty)
  return placement.split('/').map((r) => r.replace(/\d/g, (d) => '.'.repeat(Number(d))).split(''));
}

/** Castling rights implied by kings and rooks still on their starting squares. */
export function deriveCastling(placement: string): string {
  const b = rows(placement);
  if (b.length !== 8) return '-';
  const at = (sq: string) => b[8 - Number(sq[1])]?.[sq.charCodeAt(0) - 97];
  let s = '';
  if (at('e1') === 'K') {
    if (at('h1') === 'R') s += 'K';
    if (at('a1') === 'R') s += 'Q';
  }
  if (at('e8') === 'k') {
    if (at('h8') === 'r') s += 'k';
    if (at('a8') === 'r') s += 'q';
  }
  return s || '-';
}

export function buildFen(placement: string, turn: 'w' | 'b'): string {
  return `${placement} ${turn} ${deriveCastling(placement)} - 0 1`;
}

/** Null when the position can be analysed, otherwise a short reason. */
export function positionError(fen: string): string | null {
  const placement = fen.split(' ')[0];
  const b = rows(placement);
  if (b.length !== 8 || b.some((r) => r.length !== 8)) return 'That FEN doesn\'t describe an 8×8 board.';
  const flat = b.flat();
  const count = (p: string) => flat.filter((c) => c === p).length;
  if (count('K') !== 1 || count('k') !== 1) return 'Each side needs exactly one king.';
  if ([...b[0], ...b[7]].some((c) => c === 'P' || c === 'p')) return 'Pawns can\'t stand on the first or last rank.';
  if (count('P') > 8 || count('p') > 8) return 'Too many pawns.';
  try {
    new Chess(fen);
  } catch (e) {
    return (e as Error).message.replace(/^Invalid FEN: /, '') || 'Invalid FEN.';
  }
  // the side that just moved can't be in check
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  try {
    if (new Chess(parts.join(' ')).inCheck()) return `${parts[1] === 'w' ? 'White' : 'Black'} is in check but it's not their move.`;
  } catch {
    /* ignore */
  }
  return null;
}
