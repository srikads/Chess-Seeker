// Game Review report card: phase grades, classification counts and the coach's opening line.
import { Chess } from 'chess.js';
import type { MoveAnalysis } from '../store/db';
import { moveAccuracy, type MoveClass } from './classify';
import { performance } from './performance';

export type Phase = 'opening' | 'middlegame' | 'endgame';
export type Side = 'white' | 'black';

export const CLASS_ORDER: MoveClass[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];

const PIECE_PTS: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };

/** Non-pawn, non-king material on the board (both sides), and whether any queen is left. */
function material(fen: string): { total: number; queens: boolean } {
  let total = 0;
  let queens = false;
  for (const ch of fen.split(' ')[0]) {
    const p = ch.toLowerCase();
    if (PIECE_PTS[p]) total += PIECE_PTS[p];
    if (p === 'q') queens = true;
  }
  return { total, queens };
}

/** An endgame: few pieces left (pawns and kings don't count). */
export function isEndgamePosition(fen: string): boolean {
  const { total, queens } = material(fen);
  return queens ? total <= 18 : total <= 20;
}

/**
 * Phase of each move (index = ply). Opening = the first 10 moves each; endgame = from the first position with few
 * pieces left (and it stays endgame); middlegame = everything else.
 */
export function phasesOf(fens: string[], plies: number): Phase[] {
  const out: Phase[] = [];
  let end = false;
  for (let i = 0; i < plies; i++) {
    if (!end && fens[i] && isEndgamePosition(fens[i])) end = true;
    out.push(end ? 'endgame' : i < 20 ? 'opening' : 'middlegame');
  }
  return out;
}

export interface PhaseGrade {
  phase: Phase;
  /** null when the side made no moves in that phase */
  accuracy: number | null;
  cls: MoveClass | null;
  moves: number;
}

/** Badge for a phase from its accuracy; a brilliant/great move in a clean phase earns that badge. */
export function gradeFor(acc: number, classes: MoveClass[]): MoveClass {
  if (acc >= 80 && classes.includes('brilliant')) return 'brilliant';
  if (acc >= 80 && classes.includes('great')) return 'great';
  if (acc >= 92) return 'best';
  if (acc >= 82) return 'excellent';
  if (acc >= 70) return 'good';
  if (acc >= 55) return 'inaccuracy';
  if (acc >= 40) return 'mistake';
  return 'blunder';
}

const moverOf = (i: number, whiteFirst: boolean): Side => ((i % 2 === 0) === whiteFirst ? 'white' : 'black');

export function phaseGrades(analysis: MoveAnalysis[], phases: Phase[], side: Side, whiteFirst = true): PhaseGrade[] {
  return (['opening', 'middlegame', 'endgame'] as Phase[]).map((phase) => {
    const ms = analysis.filter((_, i) => phases[i] === phase && moverOf(i, whiteFirst) === side);
    if (!ms.length) return { phase, accuracy: null, cls: null, moves: 0 };
    const acc = Math.round(ms.reduce((s, m) => s + moveAccuracy(m.winLoss), 0) / ms.length);
    return { phase, accuracy: acc, cls: gradeFor(acc, ms.map((m) => m.cls)), moves: ms.length };
  });
}

export function classCounts(analysis: MoveAnalysis[], side: Side, whiteFirst = true): Record<MoveClass, number> {
  const out = Object.fromEntries(CLASS_ORDER.map((c) => [c, 0])) as Record<MoveClass, number>;
  analysis.forEach((m, i) => {
    if (moverOf(i, whiteFirst) === side) out[m.cls]++;
  });
  return out;
}

/** Estimated "game rating" for one side (see performance.ts: accuracy mapped onto rating anchors). */
export function gameRating(analysis: MoveAnalysis[], side: Side, whiteFirst = true): number | null {
  return performance(analysis, side, whiteFirst).rating;
}

/** The coach's one- or two-sentence verdict on the game, from the user's side. */
export function summaryLine(o: { result: string; you: Side | 'both'; accuracy: number; counts: Record<MoveClass, number> }): string {
  const acc = Math.round(o.accuracy);
  const word = acc >= 90 ? 'excellent' : acc >= 80 ? 'solid' : acc >= 65 ? 'decent' : 'shaky';
  const won = (o.result === '1-0' && o.you === 'white') || (o.result === '0-1' && o.you === 'black');
  const lost = (o.result === '0-1' && o.you === 'white') || (o.result === '1-0' && o.you === 'black');
  const first =
    o.you === 'both'
      ? `Let's walk through this game together.`
      : won
        ? `You won with ${word} play: ${acc}% accuracy!`
        : lost
          ? `A tough one, but there's a lot to learn here.`
          : o.result === '1/2-1/2'
            ? `A hard-fought draw with ${acc}% accuracy.`
            : `You played with ${acc}% accuracy.`;
  const bad = o.counts.blunder + o.counts.mistake + o.counts.miss;
  const second =
    o.counts.brilliant > 0
      ? `You even found a brilliant move!`
      : bad === 0
        ? `No mistakes or blunders. Great job!`
        : `Let's look at your ${bad} key mistake${bad === 1 ? '' : 's'} together.`;
  return `${first} ${second}`;
}

/** FEN of every position in a game (index 0 = start). */
export function gameFens(startFen: string, sans: string[]): string[] {
  const g = new Chess(startFen);
  const out = [g.fen()];
  for (const s of sans) {
    g.move(s);
    out.push(g.fen());
  }
  return out;
}
