// Classify a move on the analysis board from two engine snapshots (before and after the move).
import { Chess, type Move } from 'chess.js';
import { classifyMove, isSacrifice, type MoveClass } from './classify';
import { scoreNum, winPct, type PvLine } from '../engine/engine';

export interface LiveClassifyInput {
  fenBefore: string;
  move: Move;
  /** engine lines in the position before the move (side to move = the mover) */
  before: PvLine[];
  /** engine lines after the move (side to move = the opponent); may be empty when the game is over */
  after: PvLine[];
  ply: number;
  prevCls?: MoveClass;
  /** square the previous move landed on (recapture detection) */
  prevTo?: string;
  /** the position after the move is in the opening book */
  inBook?: boolean;
}

export function classifyLive(x: LiveClassifyInput): MoveClass | null {
  const g = new Chess(x.fenBefore);
  g.move(x.move);
  if (g.isCheckmate()) return 'best';
  const top = x.before[0];
  if (!top) return null;
  if (x.inBook) return 'book';
  const uci = x.move.from + x.move.to + (x.move.promotion ?? '');
  // drawn or stalemated after the move: compare with a 0 score
  const afterTop = x.after[0] ?? (g.isGameOver() ? { cp: 0, mate: null } : null);
  if (!afterTop) return null;
  const winBefore = winPct(scoreNum(top));
  const winAfter = 100 - winPct(scoreNum(afterTop));
  const second = x.before[1];
  return classifyMove({
    ply: x.ply,
    winBefore,
    winAfter,
    winSecond: second ? winPct(scoreNum(second)) : null,
    isBest: top.pv[0] === uci,
    isSacrifice: isSacrifice(x.fenBefore, x.move),
    prevCls: x.prevCls,
    allowsMate: afterTop.mate !== null && afterTop.mate > 0 && !(top.mate !== null && top.mate < 0),
    missedMate: top.mate !== null && top.mate > 0 && !(afterTop.mate !== null && afterTop.mate < 0),
    isRecapture: !!x.move.captured && x.prevTo === x.move.to,
  });
}
