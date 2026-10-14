import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { REPERTOIRES } from '../src/data/repertoire';
import { OPENING_IDEAS } from '../src/data/openingIdeas';
import { OpeningBook, type BookData } from '../src/data/openings';
import { grade, pickNext, progress, soonest, dueLabel, INTERVAL_DAYS, LEARNED_BOX, MAX_BOX, RETRY_MS, type Cards } from '../src/store/repertoire';

const book = OpeningBook.fromData(JSON.parse(readFileSync(new URL('../public/openings/openings.json', import.meta.url), 'utf8')) as BookData);
const DAY = 86_400_000;
const SQ = /^[a-h][1-8]$/;

describe('repertoire data', () => {
  it('has unique ids and legal lines that end on the learner\'s move', () => {
    const ids = new Set<string>();
    for (const r of REPERTOIRES) {
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
      const lineIds = new Set<string>();
      for (const line of r.lines) {
        expect(lineIds.has(line.id)).toBe(false);
        lineIds.add(line.id);
        const g = new Chess();
        for (const san of line.moves) expect(g.move(san).san).toBe(san);
        // the drill finishes with the learner's own move
        expect(line.moves.length % 2).toBe(r.color === 'white' ? 1 : 0);
      }
    }
  });

  it('follows named opening theory', () => {
    for (const r of REPERTOIRES)
      for (const line of r.lines) {
        const g = new Chess();
        const fens = [g.fen()];
        for (const san of line.moves) fens.push((g.move(san), g.fen()));
        expect(book.inBook(fens[2]), `${r.id}/${line.id}`).toBe(true);
        expect(book.identify(fens), `${r.id}/${line.id}`).not.toBeNull();
      }
  });
});

describe('opening ideas', () => {
  it('covers about twenty openings with legal moves and valid squares', () => {
    expect(OPENING_IDEAS.length).toBeGreaterThanOrEqual(20);
    for (const idea of OPENING_IDEAS) {
      const g = new Chess();
      for (const san of idea.moves) g.move(san);
      expect(book.lookup(g.fen()), idea.id).not.toBeNull();
      const h = new Chess();
      for (const s of idea.steps) {
        for (const san of s.moves ?? []) expect(h.move(san).san, `${idea.id}: ${san}`).toBe(san);
        for (const [a, b] of s.arrows ?? []) expect(SQ.test(a) && SQ.test(b), `${idea.id}: ${a}${b}`).toBe(true);
        for (const sq of Object.keys(s.highlights ?? {})) expect(SQ.test(sq)).toBe(true);
        expect(s.text.length).toBeLessThan(140); // one idea at a time
      }
      // the narration's moves start with the defining moves
      expect(h.history().slice(0, idea.moves.length)).toEqual(idea.moves);
    }
  });
});

describe('spaced repetition', () => {
  const now = 1_700_000_000_000;

  it('moves a clean line up a box and schedules it further out', () => {
    let c = grade(undefined, 0, now);
    expect(c).toMatchObject({ box: 1, reps: 1, lapses: 0, due: now + INTERVAL_DAYS[1] * DAY });
    c = grade(c, 0, now);
    expect(c.box).toBe(2);
    expect(c.due).toBe(now + INTERVAL_DAYS[2] * DAY);
    for (let i = 0; i < 20; i++) c = grade(c, 0, now);
    expect(c.box).toBe(MAX_BOX);
  });

  it('drops a box for one slip and resets for more', () => {
    const c = { box: 4, due: now, reps: 5, lapses: 0, last: 0 };
    expect(grade(c, 1, now)).toMatchObject({ box: 3, lapses: 1, due: now + RETRY_MS });
    expect(grade(c, 3, now)).toMatchObject({ box: 0, lapses: 1 });
    expect(grade(undefined, 2, now).box).toBe(0);
  });

  it('picks overdue lines first, then new ones, then nothing', () => {
    const ids = ['a', 'b', 'c'];
    const cards: Cards = {
      a: { box: 2, due: now + DAY, reps: 2, lapses: 0, last: 0 },
      b: { box: 1, due: now - 10, reps: 1, lapses: 0, last: 0 },
    };
    expect(pickNext(ids, cards, now)).toBe('b');
    cards.b.due = now + 2 * DAY;
    expect(pickNext(ids, cards, now)).toBe('c');
    cards.c = { box: 1, due: now + 3 * DAY, reps: 1, lapses: 0, last: 0 };
    expect(pickNext(ids, cards, now)).toBeNull();
    expect(soonest(ids, cards)).toBe('a');
  });

  it('reports progress per opening', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const cards: Cards = {
      a: { box: LEARNED_BOX + 2, due: now + DAY, reps: 4, lapses: 0, last: 0 },
      b: { box: LEARNED_BOX, due: now - 1, reps: 2, lapses: 0, last: 0 },
      c: { box: 0, due: now - 1, reps: 1, lapses: 1, last: 0 },
    };
    const p = progress(ids, cards, now);
    expect(p).toMatchObject({ total: 4, seen: 3, learned: 2, due: 2 });
    expect(p.pct).toBeGreaterThan(0);
    expect(p.pct).toBeLessThan(100);
    expect(progress(ids, {}, now).pct).toBe(0);
  });

  it('labels due times', () => {
    expect(dueLabel(now - 1, now)).toBe('due now');
    expect(dueLabel(now + 5 * 60_000, now)).toBe('in 5 min');
    expect(dueLabel(now + 3 * DAY, now)).toBe('in 3 days');
  });
});
