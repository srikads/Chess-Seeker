// "Played like a ~1200" — a rough game-performance rating from the move accuracy of one side.
import type { MoveAnalysis } from '../store/db';
import { moveAccuracy } from './classify';

/**
 * Accuracy (Lichess formula, 0–100) → approximate rating, interpolated between anchor points.
 * Calibrated to typical accuracies at each level; a single game is noisy, so treat it as a ballpark.
 */
const ANCHORS: [number, number][] = [
  [30, 100],
  [45, 250],
  [55, 450],
  [62, 650],
  [68, 850],
  [74, 1100],
  [80, 1400],
  [85, 1700],
  [89, 2000],
  [93, 2300],
  [96, 2600],
  [98.5, 2900],
];

/** Fewer non-book moves than this and the estimate is meaningless. */
export const MIN_MOVES = 6;

export function ratingFromAccuracy(acc: number): number {
  if (acc <= ANCHORS[0][0]) return ANCHORS[0][1];
  for (let k = 1; k < ANCHORS.length; k++) {
    const [a1, r1] = ANCHORS[k];
    if (acc <= a1) {
      const [a0, r0] = ANCHORS[k - 1];
      const r = r0 + ((acc - a0) / (a1 - a0)) * (r1 - r0);
      return Math.round(r / 50) * 50;
    }
  }
  return ANCHORS[ANCHORS.length - 1][1];
}

/** Rating in a display name such as "Knightly Ned (600)" or "Magnus (2830)". */
export function ratingInName(name: string): number | null {
  const m = name.match(/\((\d{3,4})\)\s*$/);
  return m ? Number(m[1]) : null;
}

export interface Performance {
  /** estimated rating for this game, or null with too few moves */
  rating: number | null;
  /** moves counted (book moves excluded) */
  moves: number;
}

/**
 * Performance of one side. Book moves are skipped (everyone plays them perfectly), and each
 * remaining move's accuracy comes from the win% it lost, like the headline accuracy.
 */
export function performance(analysis: MoveAnalysis[], side: 'white' | 'black', whiteFirst = true): Performance {
  const accs: number[] = [];
  analysis.forEach((m, i) => {
    const mover = (i % 2 === 0) === whiteFirst ? 'white' : 'black';
    if (mover !== side || m.cls === 'book') return;
    accs.push(moveAccuracy(m.winLoss));
  });
  if (accs.length < MIN_MOVES) return { rating: null, moves: accs.length };
  const avg = accs.reduce((x, y) => x + y, 0) / accs.length;
  return { rating: ratingFromAccuracy(avg), moves: accs.length };
}
