// Turns a puzzle's solution into short coach steps that drive the board: one idea per step,
// each move animated while the words explain it.
import { Chess, type Move, type Square } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import type { NarrationStep } from '../ui/coach';
import { attackedTargets, describeMove, hangingPieces } from '../chess/explain';
import { motifsOf } from '../chess/motifs';
import { NAME, VALUE, other } from '../chess/util';
import { puzzleStart, type Puzzle } from './puzzles';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const THEME_INTRO: [string, string][] = [
  ['mateIn1', 'There is a checkmate in one move. Look at every check.'],
  ['mateIn2', 'You can force checkmate in two moves. Start with a check.'],
  ['mateIn3', 'There is a forced checkmate here. Checks first!'],
  ['backRankMate', 'The king is stuck behind its own pawns. Look at the back rank.'],
  ['smotheredMate', 'The king is boxed in by its own pieces. A knight could finish it.'],
  ['fork', 'Look for a move that attacks two things at once.'],
  ['pin', 'Something is lined up with a bigger piece behind it. Can you pin it?'],
  ['skewer', 'Two pieces are on one line. Attack the front one!'],
  ['hangingPiece', 'Something is not protected. Can you find it?'],
  ['discoveredAttack', 'Move one piece out of the way to unleash another.'],
  ['promotion', 'A pawn is close to becoming a queen.'],
];

/** Short, plain reason for a move (first idea only). */
function reasonFor(fen: string, m: Move): string {
  const after = new Chess(fen);
  after.move(m);
  if (after.isCheckmate()) return 'checkmate! The king has no safe square left';
  const motif = motifsOf(fen, m)[0];
  const reasons = describeMove(fen, m).filter((r) => r !== 'improves the position');
  const first = reasons[0] ?? (after.inCheck() ? 'gives check' : 'is the strongest move');
  // keep it to one idea: cut long chains at the first dash / semicolon
  const short = first.split(/ — |; /)[0];
  return motif && !short.toLowerCase().includes(motif.label.toLowerCase()) && ['fork', 'pin', 'skewer', 'discovered', 'double-check', 'remove-defender'].includes(motif.id)
    ? `${short}. That's a **${motif.label.toLowerCase()}**`
    : short;
}

function replyText(fen: string, m: Move, oppName: string): string {
  const g = new Chess(fen);
  const forced = g.moves().length === 1;
  if (g.inCheck()) return `${oppName} must get out of check: **${m.san}**${forced ? ' is the only move' : ''}.`;
  if (m.captured) return `${oppName} takes back with **${m.san}**.`;
  if (forced) return `${oppName} has only one move: **${m.san}**.`;
  return `${oppName} replies **${m.san}**.`;
}

function materialOf(g: Chess, color: 'w' | 'b'): number {
  let s = 0;
  for (const row of g.board()) for (const p of row) if (p && p.color === color) s += VALUE[p.type];
  return s;
}

/** Arrows from the moved piece to what it now attacks (shows forks and threats). */
function threatArrows(after: Chess, m: Move): DrawShape[] {
  return attackedTargets(after, m.to as Square)
    .slice(0, 3)
    .map((t) => ({ orig: m.to as Key, dest: t as Key, brush: 'red' }));
}

/** Narration for the whole solution, from the position before the opponent's setup move. */
export function buildPuzzleNarration(p: Puzzle): { startFen: string; steps: NarrationStep[] } {
  const { fen: start, solution, setupSan } = puzzleStart(p);
  const me = new Chess(start).turn();
  const oppName = me === 'w' ? 'Black' : 'White';
  const steps: NarrationStep[] = [];
  const intro = THEME_INTRO.find(([t]) => p.themes.includes(t))?.[1] ?? 'Check every check, capture and threat first.';

  if (setupSan) {
    const before = new Chess(p.fen);
    const set = before.move(setupSan);
    const hang = hangingPieces(new Chess(start), other(me));
    const extra = hang.length && !p.themes.some((t) => t.startsWith('mateIn'))
      ? ` Now the ${NAME[new Chess(start).get(hang[0] as Square)!.type]} on ${hang[0]} is in trouble.`
      : '';
    steps.push({ fen: p.fen, moves: [setupSan], text: `${oppName} just played **${setupSan}**.${extra}`, mood: 'thinking', flash: hang.length ? { squares: [hang[0]], color: 'red' } : undefined });
    steps.push({ fen: start, lastMove: [set.from, set.to], text: intro, mood: 'thinking' });
  } else {
    steps.push({ fen: start, text: intro, mood: 'thinking' });
  }

  const g = new Chess(start);
  const startMat = materialOf(g, me) - materialOf(g, other(me));
  for (let i = 0; i < solution.length; i++) {
    const u = solution[i];
    const fen = g.fen();
    let m: Move;
    try {
      m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    } catch {
      break;
    }
    if (i % 2 === 0) {
      const mate = g.isCheckmate();
      steps.push({
        text: `**${m.san}** ${reasonFor(fen, m)}.`,
        moves: [m.san],
        mood: mate ? 'excited' : 'happy',
        arrows: mate ? undefined : threatArrows(g, m),
        badge: { sq: m.to, cls: mate ? 'best' : 'good' },
      });
    } else {
      steps.push({ text: replyText(fen, m, oppName), moves: [m.san], mood: 'neutral' });
    }
  }

  if (!g.isCheckmate()) {
    const gain = materialOf(g, me) - materialOf(g, other(me)) - startMat;
    const text =
      gain >= 9 ? 'You win the queen. That is the puzzle!'
      : gain >= 5 ? 'You come out a rook ahead. Nice!'
      : gain >= 3 ? 'You win a whole piece. Well done!'
      : gain >= 1 ? 'You win material and keep the advantage.'
      : 'Your position is now much better.';
    steps.push({ text, mood: 'happy' });
  }
  return { startFen: setupSan ? p.fen : start, steps: steps.map((s) => ({ ...s, text: cap(s.text) })) };
}
