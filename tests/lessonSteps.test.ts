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
  it('one intro + one step per demo move, every move legal in sequence', () => {
    let demos = 0;
    for (const l of ALL_LESSONS)
      for (const s of l.steps) {
        if (s.kind !== 'demo') continue;
        demos++;
        const steps = demoNarration(s);
        expect(steps).toHaveLength(s.moves.length + 1);
        expect(steps[0].fen).toBe(s.fen);
        const g = new Chess(s.fen);
        for (const st of steps.slice(1)) {
          expect(st.fen).toBeUndefined(); // continues from the previous step
          for (const m of st.moves ?? []) expect(() => g.move(m)).not.toThrow();
        }
      }
    expect(demos).toBeGreaterThan(0);
  });
});
