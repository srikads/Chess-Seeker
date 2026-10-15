// Pure helpers to replay a course line: positions per ply, arrows, and checking a learner's move.
import { Chess } from 'chess.js';
import type { Line, LineMove } from './types';
import { isUserPly } from './lint';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface Ply {
  i: number;
  move: LineMove;
  san: string;
  from: string;
  to: string;
  captured: boolean;
  fenBefore: string;
  fenAfter: string;
  user: boolean;
}

export function startFen(line: Line): string {
  return line.startFen ?? START_FEN;
}

/** Replays the line once; stops at the first illegal move (content is validated by tests). */
export function plies(line: Line): Ply[] {
  const g = new Chess(line.startFen);
  const out: Ply[] = [];
  line.moves.forEach((move, i) => {
    if (out.length !== i) return;
    const fenBefore = g.fen();
    try {
      const m = g.move(move.san);
      out.push({ i, move, san: m.san, from: m.from, to: m.to, captured: !!m.captured, fenBefore, fenAfter: g.fen(), user: isUserPly(line, i) });
    } catch {
      /* illegal: stop */
    }
  });
  return out;
}

export interface Shape {
  orig: string;
  dest?: string;
  brush: string;
}

/** "f3e5" → arrow (green), "d8h4:red" → red arrow, "f7:red" → circle. */
export function parseArrow(a: string): Shape | null {
  const m = a.match(/^([a-h][1-8])([a-h][1-8])?(?::(\w+))?$/);
  if (!m) return null;
  return { orig: m[1], dest: m[2], brush: m[3] ?? 'green' };
}

export function shapesOf(move: LineMove): Shape[] {
  return (move.arrows ?? []).map(parseArrow).filter((s): s is Shape => !!s);
}

/** Does the learner's move (from/to/promotion) match the expected ply (or an accepted alternative)? */
export function isExpected(ply: Ply, mv: { from: string; to: string; promotion?: string }): { ok: boolean; san?: string } {
  const g = new Chess(ply.fenBefore);
  let san: string;
  try {
    san = g.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? 'q' }).san;
  } catch {
    return { ok: false };
  }
  return { ok: san === ply.san || (ply.move.accept ?? []).includes(san), san };
}

/** Progress-friendly label like "1.e4 e5 2.Nf3" for a slice of plies. */
export function moveNumberLabel(fenBefore: string, san: string): string {
  const [, turn, , , , full] = fenBefore.split(' ');
  return turn === 'w' ? `${full}.${san}` : `${full}...${san}`;
}
