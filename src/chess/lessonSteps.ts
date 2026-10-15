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

/** Split coach text into bubble-sized pieces: at most `max` sentences (and roughly 190 characters) each,
 *  never across a paragraph break. Short text comes back as a single piece. */
export function chunkText(text: string, max = 2): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n{2,}/)) {
    const sentences = para.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9*"'(])/).filter(Boolean);
    let cur: string[] = [];
    for (const sen of sentences) {
      if (cur.length && (cur.length >= max || (cur.join(' ') + ' ' + sen).length > 190)) {
        out.push(cur.join(' '));
        cur = [];
      }
      cur.push(sen);
    }
    if (cur.length) out.push(cur.join(' '));
  }
  return out.length ? out : [text];
}

/** An "explain" step as one bubble per short piece of text, all on the same position and annotations. */
export function explainNarration(step: { text: string; fen: string } & Annotations): NarrationStep[] {
  return chunkText(step.text).map((text) => ({ text, fen: step.fen, highlights: highlightMap(step), arrows: arrowShapes(step), mood: 'neutral' as Mood }));
}

/** A "Watch" step as a narration: an intro on the start position, then one step per move that animates
 *  the move (arrow first) and then shows that move's highlights and arrows next to its explanation. */
export function demoNarration(step: DemoStep): NarrationStep[] {
  const out: NarrationStep[] = chunkText(step.text).map((text, i) => ({
    text,
    fen: i === 0 ? step.fen : undefined,
    highlights: highlightMap(step),
    arrows: arrowShapes(step),
    mood: 'neutral' as Mood,
  }));
  for (const m of step.moves) {
    // the move animates with its first sentence(s); any further pieces stay on the resulting position
    chunkText(m.text).forEach((text, i) =>
      out.push({ text, moves: i === 0 ? [m.san] : undefined, highlights: highlightMap(m), arrows: arrowShapes(m), mood: moodForSan(m.san) }),
    );
  }
  return out;
}
