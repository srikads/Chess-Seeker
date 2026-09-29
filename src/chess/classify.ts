// Chess.com-style move classification from engine win% (all values from the mover's point of view).
import { Chess, type Move } from 'chess.js';
import { hangingPieces } from './explain';
import { VALUE } from './util';

export type MoveClass = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';

export interface ClassifyInput {
  ply: number;
  /** mover's win% with best play before the move */
  winBefore: number;
  /** mover's win% after the move actually played */
  winAfter: number;
  /** mover's win% had they played the engine's 2nd choice (null = only one legal move) */
  winSecond: number | null;
  /** the played move is the engine's top choice */
  isBest: boolean;
  /** the move deliberately leaves material en prise */
  isSacrifice: boolean;
  /** class of the opponent's previous move */
  prevCls?: MoveClass;
  /** the move walks into a forced mate that wasn't there before */
  allowsMate?: boolean;
  /** the mover had a forced mate and this move throws it away */
  missedMate?: boolean;
  /** simply taking back on the square the opponent just captured on */
  isRecapture?: boolean;
}

export function classifyMove(x: ClassifyInput): MoveClass {
  const loss = Math.max(0, x.winBefore - x.winAfter);
  // Forced mates matter even when the position was already decided.
  if (x.allowsMate) return 'blunder';
  if (x.missedMate) return 'miss';
  if (x.ply < 6 && loss < 4) return 'book';
  if (x.isBest || loss <= 1) {
    // Brilliant: a sound sacrifice that doesn't leave you worse (and wasn't a trivial win anyway).
    if (x.isSacrifice && x.winAfter >= 45 && x.winBefore < 97) return 'brilliant';
    // Great: the only good move — the next best choice is clearly worse.
    if (x.winSecond !== null && x.winBefore - x.winSecond >= 12 && x.winBefore < 97 && !x.isRecapture) return 'great';
    return 'best';
  }
  // Miss: the opponent just erred and this move lets the chance slip (big blunders stay blunders).
  if ((x.prevCls === 'mistake' || x.prevCls === 'blunder') && loss >= 10 && loss < 30) return 'miss';
  if (loss < 3) return 'excellent';
  if (loss < 7) return 'good';
  if (loss < 12) return 'inaccuracy';
  if (loss < 22) return 'mistake';
  return 'blunder';
}

/** Does this move leave the moved piece (worth more than what it took) hanging? */
export function isSacrifice(fenBefore: string, m: Move): boolean {
  if (m.piece === 'p' || m.piece === 'k' || m.promotion) return false;
  const after = new Chess(fenBefore);
  after.move(m);
  if (after.isCheckmate()) return false;
  const gained = m.captured ? VALUE[m.captured] : 0;
  return VALUE[m.piece] > gained + 1 && hangingPieces(after, m.color).includes(m.to);
}

/** Lichess-style accuracy from win% loss. */
export const moveAccuracy = (loss: number) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
