import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { ALL_LESSONS } from '../src/lessons';
import { demoNarration, highlightMap, arrowShapes } from '../src/chess/lessonSteps';

describe('lesson narration', () => {
  it('maps annotations', () => {
    expect(highlightMap({ highlights: [{ sq: 'e4', mark: 'red' }] })).toEqual({ e4: 'red' });
    expect(highlightMap({})).toBeUndefined();
    expect(arrowShapes({ arrows: [{ from: 'b5', to: 'e8', mark: 'red' }] })).toEqual([{ orig: 'b5', dest: 'e8', brush: 'red' }]);
  });
  it('every demo move animates exactly once, in order, in bubbles of at most two sentences', () => {
    let demos = 0;
    for (const l of ALL_LESSONS)
      for (const s of l.steps) {
        if (s.kind !== 'demo') continue;
        demos++;
        const steps = demoNarration(s);
        expect(steps.flatMap((st) => st.moves ?? [])).toEqual(s.moves.map((m) => m.san));
        expect(steps[0].fen).toBe(s.fen);
        for (const st of steps) expect(st.text.split(/(?<=[.!?])\s+(?=[A-Z0-9*"'(])/).length).toBeLessThanOrEqual(2);
        const g = new Chess(s.fen);
        for (const st of steps.slice(1)) {
          expect(st.fen).toBeUndefined(); // continues from the previous step
          for (const m of st.moves ?? []) expect(() => g.move(m)).not.toThrow();
        }
      }
    expect(demos).toBeGreaterThan(0);
  });
});

import { chunkText } from '../src/chess/lessonSteps';

describe('chunkText', () => {
  it('keeps short text in one bubble', () => {
    expect(chunkText('The knight forks. Win the rook.')).toEqual(['The knight forks. Win the rook.']);
  });
  it('splits long text into pieces of at most two sentences', () => {
    const parts = chunkText('One. Two. Three. Four. Five.');
    expect(parts).toEqual(['One. Two.', 'Three. Four.', 'Five.']);
  });
  it('never joins across paragraphs and keeps move notation intact', () => {
    const parts = chunkText('Play Nf3. It develops.\n\nThen e4. The centre is yours. Black must react.');
    expect(parts).toEqual(['Play Nf3. It develops.', 'Then e4. The centre is yours.', 'Black must react.']);
  });
  it('splits a long two-sentence piece by length', () => {
    const a = 'A'.repeat(120) + '.';
    const b = 'B'.repeat(120) + '.';
    expect(chunkText(`${a} ${b}`)).toEqual([a, b]);
  });
});
