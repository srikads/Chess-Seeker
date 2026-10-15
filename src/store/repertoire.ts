// Spaced repetition for opening lines (Leitner boxes). Pure scheduling logic + kv persistence under 'rep:'.
import { kvGet, kvSet } from './db';

export interface Card {
  /** Leitner box: 0 = (re)learning, higher = longer gaps */
  box: number;
  /** epoch ms when the line is next due */
  due: number;
  reps: number;
  lapses: number;
  last: number;
}

export type Cards = Record<string, Card>;

const DAY = 86_400_000;
/** gap after a clean run, by the box the card moves into */
export const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35, 80];
export const MAX_BOX = INTERVAL_DAYS.length - 1;
/** a line counts as "learned" from this box on */
export const LEARNED_BOX = 2;
/** a failed line comes back after this delay (later in the same session) */
export const RETRY_MS = 5 * 60_000;

/** Schedule a line after a drill. `mistakes` = wrong moves the learner made in it. */
export function grade(card: Card | undefined, mistakes: number, now: number): Card {
  const c = card ?? { box: 0, due: now, reps: 0, lapses: 0, last: 0 };
  if (mistakes === 0) {
    const box = Math.min(MAX_BOX, c.box + 1);
    return { box, due: now + INTERVAL_DAYS[box] * DAY, reps: c.reps + 1, lapses: c.lapses, last: now };
  }
  // one slip drops a box; more than one starts the line over
  const box = mistakes === 1 ? Math.max(0, c.box - 1) : 0;
  return { box, due: now + RETRY_MS, reps: c.reps + 1, lapses: c.lapses + 1, last: now };
}

/** Next line to drill: overdue lines first (most overdue first), then new lines in order. Null = all caught up. */
export function pickNext(lineIds: string[], cards: Cards, now: number): string | null {
  const due = lineIds.filter((id) => cards[id] && cards[id].due <= now).sort((a, b) => cards[a].due - cards[b].due);
  if (due.length) return due[0];
  return lineIds.find((id) => !cards[id]) ?? null;
}

/** When every line is scheduled in the future: the one that comes back soonest (for "practise anyway"). */
export function soonest(lineIds: string[], cards: Cards): string | null {
  const seen = lineIds.filter((id) => cards[id]).sort((a, b) => cards[a].due - cards[b].due);
  return seen[0] ?? lineIds[0] ?? null;
}

export interface Progress {
  total: number;
  seen: number;
  learned: number;
  due: number;
  /** 0..100 */
  pct: number;
}

export function progress(lineIds: string[], cards: Cards, now: number): Progress {
  let seen = 0, learned = 0, due = 0, score = 0;
  for (const id of lineIds) {
    const c = cards[id];
    if (!c) continue;
    seen++;
    if (c.box >= LEARNED_BOX) learned++;
    if (c.due <= now) due++;
    score += Math.min(c.box, LEARNED_BOX + 1) / (LEARNED_BOX + 1);
  }
  return { total: lineIds.length, seen, learned, due, pct: lineIds.length ? Math.round((score / lineIds.length) * 100) : 0 };
}

/** "in 3 days" style label for a due time. */
export function dueLabel(due: number, now: number): string {
  const d = due - now;
  if (d <= 0) return 'due now';
  if (d < 3_600_000) return `in ${Math.max(1, Math.round(d / 60_000))} min`;
  if (d < DAY) return `in ${Math.round(d / 3_600_000)} h`;
  const days = Math.round(d / DAY);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

const key = (repId: string) => `rep:${repId}`;

export function loadCards(repId: string): Promise<Cards> {
  return kvGet<Cards>(key(repId), {});
}

export function saveCards(repId: string, cards: Cards): Promise<void> {
  return kvSet(key(repId), cards);
}
