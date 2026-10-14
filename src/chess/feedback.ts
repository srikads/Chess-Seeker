// One-line, conversational move feedback for the in-game coach (one idea at a time).
import { Chess, type Move } from 'chess.js';
import type { MoveClass } from './classify';
import { describeMove, explainMistake } from './explain';

const LABEL: Record<MoveClass, string> = {
  brilliant: 'Brilliant!',
  great: 'Great move!',
  best: 'Best move!',
  excellent: 'Excellent.',
  good: 'Good move.',
  book: 'Book move.',
  inaccuracy: 'Inaccuracy.',
  mistake: 'Mistake.',
  miss: 'Missed chance.',
  blunder: 'Blunder.',
};

/** Lowercase the first letter (for joining a reason into a sentence). */
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Keep only the first clause of a longer explanation. */
const firstClause = (s: string) => s.split('; ')[0].replace(/\.$/, '');

export interface FeedbackInput {
  cls: MoveClass;
  fenBefore: string;
  move: Move;
  /** engine's best move in SAN before the move (null = unknown) */
  bestSan: string | null;
  /** engine PV (UCI) from the position after the move */
  replyPv: string[];
  /** mate for the opponent after the move (their POV, >0 = they mate) */
  replyMate: number | null;
}

/** "Best move! Nf3 develops the knight toward the centre." — at most two short sentences. */
export function feedbackLine(x: FeedbackInput): string {
  const { cls, move: m } = x;
  const san = `**${m.san}**`;
  const better = x.bestSan && x.bestSan !== m.san ? ` **${x.bestSan}** was better.` : '';
  switch (cls) {
    case 'brilliant':
      return `${LABEL[cls]} ${san} gives up material for a strong attack.`;
    case 'great':
      return `${LABEL[cls]} ${san} was the only good move here.`;
    case 'book':
      return `${LABEL[cls]} ${san} is a well-known opening move.`;
    case 'best':
    case 'excellent':
    case 'good': {
      const why = describeMove(x.fenBefore, m).filter((r) => r !== 'improves the position')[0];
      return why ? `${LABEL[cls]} ${san} ${why}.` : `${LABEL[cls]} ${san} keeps your position healthy.`;
    }
    case 'inaccuracy':
      return `${LABEL[cls]} Not bad, but${better ? better.replace(' was better.', ' was a little better.') : ' there was something a little better.'}`;
    case 'miss':
      return `${LABEL[cls]} They had slipped up, and you could punish it.${better}`;
    case 'mistake':
    case 'blunder': {
      const why = firstClause(explainMistake(x.fenBefore, m, x.replyPv, x.replyMate));
      return `${LABEL[cls]} ${why.startsWith('It ') ? why : `Now ${lc(why)}`}.${better}`;
    }
  }
}

/** Is `san` a legal move in `fen`? (guards stale engine output) */
export function sanOf(fen: string, uci: string): string | null {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  } catch {
    return null;
  }
}
