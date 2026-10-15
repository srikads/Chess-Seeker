import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { COURSES, filterCourses, isPlayable, pathCourses, DEFAULT_PATH, PATH_OPTIONS, courseById } from '../src/courses/catalog';
import { lintCourse } from '../src/courses/lint';

// Fast structural + legality checks (engine checks live in scripts/validate-courses.ts).
describe('course catalog', () => {
  it('has 30 courses plus coming-soon tiles', () => {
    expect(COURSES.filter((c) => c.status !== 'soon').length).toBe(30);
    expect(COURSES.filter((c) => c.status === 'soon').length).toBeGreaterThanOrEqual(4);
  });
  it('has unique ids', () => {
    const ids = COURSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('path options point at real courses', () => {
    for (const id of pathCourses(DEFAULT_PATH)) expect(courseById(id), id).toBeTruthy();
    for (const o of PATH_OPTIONS) for (const id of o.options) expect(courseById(id), id).toBeTruthy();
  });
  it('filters by chip and search', () => {
    expect(filterCourses(COURSES, 'soon').every((c) => c.status === 'soon')).toBe(true);
    expect(filterCourses(COURSES, 'white').every((c) => c.categories.includes('white') && c.status !== 'soon')).toBe(true);
    expect(filterCourses(COURSES, 'all', 'caro').map((c) => c.id)).toContain('caro-kann');
    expect(filterCourses(COURSES, 'skill', 'caro')).toHaveLength(0);
  });
  it('the exemplar courses are ready', () => {
    for (const id of ['italian', 'caro-kann', 'checkmates']) expect(isPlayable(courseById(id)!)).toBe(true);
  });
});

for (const c of COURSES) {
  describe(`course ${c.id}`, () => {
    it('passes lint (legal moves, user side, arrows, notes)', () => {
      expect(lintCourse(c)).toEqual([]);
    });
    if (c.status === 'ready') {
      it('every line replays to its last move', () => {
        for (const ch of c.chapters)
          for (const l of ch.lines) {
            const g = new Chess(l.startFen);
            for (const m of l.moves) g.move(m.san);
            expect(g.history().length).toBe(l.moves.length);
          }
      });
    }
  });
}
