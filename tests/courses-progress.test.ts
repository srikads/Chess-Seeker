import { describe, it, expect } from 'vitest';
import {
  DAY,
  INTERVALS_DAYS,
  MAX_BOX,
  PracticeQueue,
  chapterProgress,
  courseProgress,
  dueKeys,
  emptyProgress,
  lineProgress,
  markLearned,
  nextDue,
  nextToLearn,
  review,
} from '../src/courses/progress';
import { courseById } from '../src/courses/catalog';
import { isExpected, parseArrow, plies } from '../src/courses/line';
import { sentences } from '../src/courses/lint';
import type { Course } from '../src/courses/types';

const NOW = 1_700_000_000_000;
const mini: Course = {
  id: 'mini',
  title: 'Mini',
  subtitle: 's',
  side: 'white',
  categories: ['white'],
  level: 'beginner',
  cover: { bg: '#000000', fg: '#ffffff', label: 'x', sub: 'x' },
  description: 'd',
  status: 'ready',
  chapters: [
    { id: 'a', title: 'A', intro: 'i', lines: [{ id: 'l1', title: 't', userSide: 'white', moves: [{ san: 'e4' }, { san: 'e5' }], summary: 's' }, { id: 'l2', title: 't', userSide: 'white', moves: [{ san: 'd4' }], summary: 's' }] },
    { id: 'b', title: 'B', intro: 'i', lines: [{ id: 'l1', title: 't', userSide: 'white', moves: [{ san: 'c4' }], summary: 's' }] },
  ],
};

describe('spaced repetition', () => {
  it('learning puts a line in box 0, due now', () => {
    const p = markLearned(emptyProgress(), 'a/l1', NOW);
    expect(p.lines['a/l1']).toMatchObject({ learned: true, box: 0, due: NOW });
    expect(dueKeys(mini, p, NOW)).toEqual(['a/l1']);
  });
  it('re-learning keeps the SRS state', () => {
    let p = review(markLearned(emptyProgress(), 'a/l1', NOW), 'a/l1', 'clean', NOW);
    p = markLearned(p, 'a/l1', NOW + 5);
    expect(p.lines['a/l1'].box).toBe(1);
  });
  it('clean answers climb the boxes with growing intervals', () => {
    let p = markLearned(emptyProgress(), 'a/l1', NOW);
    for (let b = 1; b <= MAX_BOX + 2; b++) {
      p = review(p, 'a/l1', 'clean', NOW);
      const box = Math.min(b, MAX_BOX);
      expect(p.lines['a/l1'].box).toBe(box);
      expect(p.lines['a/l1'].due).toBe(NOW + INTERVALS_DAYS[box] * DAY);
    }
    expect(dueKeys(mini, p, NOW)).toEqual([]);
    expect(dueKeys(mini, p, NOW + 31 * DAY)).toEqual(['a/l1']);
  });
  it('a mistake sends the line back to box 0 and counts a lapse', () => {
    let p = markLearned(emptyProgress(), 'a/l1', NOW);
    p = review(p, 'a/l1', 'clean', NOW);
    p = review(p, 'a/l1', 'clean', NOW);
    p = review(p, 'a/l1', 'mistake', NOW);
    expect(p.lines['a/l1']).toMatchObject({ box: 0, due: NOW, lapses: 1, reps: 3 });
  });
  it('a hinted answer keeps the box and comes back sooner', () => {
    let p = markLearned(emptyProgress(), 'a/l1', NOW);
    p = review(p, 'a/l1', 'clean', NOW); // box 1
    p = review(p, 'a/l1', 'hinted', NOW);
    expect(p.lines['a/l1'].box).toBe(1);
    expect(p.lines['a/l1'].due).toBe(NOW + DAY / 2);
  });
  it('due lines are sorted by how overdue they are', () => {
    let p = markLearned(emptyProgress(), 'a/l1', NOW);
    p = markLearned(p, 'b/l1', NOW - 1000);
    p = markLearned(p, 'a/l2', NOW - 500);
    expect(dueKeys(mini, p, NOW)).toEqual(['b/l1', 'a/l2', 'a/l1']);
    expect(dueKeys(mini, p, NOW, 'a')).toEqual(['a/l2', 'a/l1']);
    expect(nextDue(mini, p)).toBe(NOW - 1000);
  });
});

describe('progress math', () => {
  it('counts learned as half, practised as full', () => {
    expect(lineProgress(undefined)).toBe(0);
    let p = markLearned(emptyProgress(), 'a/l1', NOW);
    expect(lineProgress(p.lines['a/l1'])).toBe(0.5);
    expect(chapterProgress(mini.chapters[0], p)).toBe(0.25);
    p = review(p, 'a/l1', 'clean', NOW);
    expect(chapterProgress(mini.chapters[0], p)).toBe(0.5);
    expect(courseProgress(mini, p)).toBeCloseTo(1 / 3);
    p = markLearned(p, 'a/l2', NOW);
    p = review(p, 'a/l2', 'clean', NOW);
    p = markLearned(p, 'b/l1', NOW);
    p = review(p, 'b/l1', 'clean', NOW);
    expect(courseProgress(mini, p)).toBe(1);
  });
  it('a failed line still counts as learned', () => {
    let p = markLearned(emptyProgress(), 'a/l1', NOW);
    p = review(p, 'a/l1', 'clean', NOW);
    p = review(p, 'a/l1', 'mistake', NOW);
    expect(lineProgress(p.lines['a/l1'])).toBe(0.5);
  });
  it('next line to learn follows course order', () => {
    let p = emptyProgress();
    expect(nextToLearn(mini, p)).toEqual({ chapter: 'a', line: 'l1' });
    p = markLearned(p, 'a/l1', NOW);
    p = markLearned(p, 'a/l2', NOW);
    expect(nextToLearn(mini, p)).toEqual({ chapter: 'b', line: 'l1' });
    p = markLearned(p, 'b/l1', NOW);
    expect(nextToLearn(mini, p)).toBeNull();
  });
});

describe('practice queue', () => {
  it('re-queues mistakes at the back, at most twice', () => {
    const q = new PracticeQueue(['x', 'y']);
    expect(q.current).toBe('x');
    expect(q.next('mistake')).toBe('y');
    expect(q.next('clean')).toBe('x');
    expect(q.streak).toBe(1);
    expect(q.next('mistake')).toBe('x');
    expect(q.streak).toBe(0);
    expect(q.next('mistake')).toBeUndefined();
    expect(q.done).toBe(4);
  });
});

describe('line helpers', () => {
  it('replays plies and marks the learner side', () => {
    const line = courseById('caro-kann')!.chapters[0].lines[0];
    const ps = plies(line);
    expect(ps).toHaveLength(line.moves.length);
    expect(ps[0].user).toBe(false);
    expect(ps[1]).toMatchObject({ san: 'c6', user: true, from: 'c7', to: 'c6' });
  });
  it('checks expected moves and accepted alternatives', () => {
    const line = courseById('checkmates')!.chapters[0].lines[0];
    const [p0] = plies(line);
    expect(isExpected(p0, { from: 'a1', to: 'a8' })).toEqual({ ok: true, san: 'Ra8#' });
    expect(isExpected(p0, { from: 'a1', to: 'a7' }).ok).toBe(false);
    expect(isExpected(p0, { from: 'a1', to: 'h8' }).ok).toBe(false);
    expect(isExpected({ ...p0, move: { ...p0.move, accept: ['Ra7'] } }, { from: 'a1', to: 'a7' }).ok).toBe(true);
  });
  it('parses arrow shorthand', () => {
    expect(parseArrow('f3e5')).toEqual({ orig: 'f3', dest: 'e5', brush: 'green' });
    expect(parseArrow('d8h4:red')).toEqual({ orig: 'd8', dest: 'h4', brush: 'red' });
    expect(parseArrow('f7:paleRed')).toEqual({ orig: 'f7', dest: undefined, brush: 'paleRed' });
    expect(parseArrow('z9')).toBeNull();
  });
  it('counts sentences', () => {
    expect(sentences('Grab the center.')).toBe(1);
    expect(sentences('Check! The king must move.')).toBe(2);
    expect(sentences('Nd5# is mate')).toBe(1);
  });
});
