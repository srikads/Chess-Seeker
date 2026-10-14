// Pure helpers that turn lesson data into coach narration and board annotations.
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import type { Annotations, DemoStep } from '../lessons/types';
import type { NarrationStep, Mood } from '../ui/coach';

/** Lesson highlights → `{ e4: 'green' }` for BoardView.highlight(). */
export function highlightMap(a: Annotations | undefined): Record<string, string> | undefined {
  if (!a?.highlights?.length) return undefined;
  return Object.fromEntries(a.highlights.map((x) => [x.sq, x.mark]));
}

/** Lesson arrows → chessground shapes for BoardView.arrows(). */
export function arrowShapes(a: Annotations | undefined): DrawShape[] | undefined {
  if (!a?.arrows?.length) return undefined;
  return a.arrows.map((x) => ({ orig: x.from as Key, dest: x.to as Key, brush: x.mark }));
}

/** Mood for a demo line: captures, checks and mates get a livelier owl. */
function moodForSan(san: string): Mood {
  if (san.includes('#')) return 'excited';
  if (san.includes('+') || san.includes('x')) return 'happy';
  return 'neutral';
}

/** A "Watch" step as a narration: an intro on the start position, then one step per move that animates
 *  the move (arrow first) and then shows that move's highlights and arrows next to its explanation. */
export function demoNarration(step: DemoStep): NarrationStep[] {
  const out: NarrationStep[] = [
    { text: step.text, fen: step.fen, highlights: highlightMap(step), arrows: arrowShapes(step), mood: 'neutral' },
  ];
  for (const m of step.moves) {
    out.push({ text: m.text, moves: [m.san], highlights: highlightMap(m), arrows: arrowShapes(m), mood: moodForSan(m.san) });
  }
  return out;
}
