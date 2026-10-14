// Course progress + spaced repetition (Leitner boxes). Pure functions + thin kv persistence.
import { kvGet, kvSet } from '../store/db';
import type { Course, Chapter } from './types';
import { lineKey } from './types';
import { DEFAULT_PATH, type PathChoice } from './catalog';

export const DAY = 86_400_000;
/** Box → days until the next review. Box 0 = due now (just learned or just failed). */
export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];
export const MAX_BOX = INTERVALS_DAYS.length - 1;

export interface LineState {
  learned: boolean;
  box: number;
  /** epoch ms when the line is due for practice */
  due: number;
  reps: number;
  lapses: number;
  last: number;
}

export interface CourseProgress {
  lines: Record<string, LineState>;
  /** last line opened, "<chapterId>/<lineId>" */
  lastLine?: string;
  /** best clean-line streak in practice */
  bestStreak?: number;
}

export type ReviewResult = 'clean' | 'hinted' | 'mistake';

export const emptyProgress = (): CourseProgress => ({ lines: {} });

/** Mark a line learned (first time: enters the SRS queue, due now). */
export function markLearned(p: CourseProgress, key: string, now = Date.now()): CourseProgress {
  const cur = p.lines[key];
  const next: LineState = cur ? { ...cur, learned: true } : { learned: true, box: 0, due: now, reps: 0, lapses: 0, last: now };
  return { ...p, lastLine: key, lines: { ...p.lines, [key]: next } };
}

/** Apply a practice result. clean → next box; hinted → same box, back tomorrow at the latest; mistake → box 0, due now. */
export function review(p: CourseProgress, key: string, result: ReviewResult, now = Date.now()): CourseProgress {
  const cur = p.lines[key] ?? { learned: true, box: 0, due: now, reps: 0, lapses: 0, last: now };
  let { box, lapses } = cur;
  let due: number;
  if (result === 'clean') {
    box = Math.min(MAX_BOX, box + 1);
    due = now + INTERVALS_DAYS[box] * DAY;
  } else if (result === 'hinted') {
    due = now + Math.max(1, INTERVALS_DAYS[box]) * DAY * 0.5;
  } else {
    box = 0;
    lapses++;
    due = now;
  }
  return { ...p, lastLine: key, lines: { ...p.lines, [key]: { learned: true, box, due, reps: cur.reps + 1, lapses, last: now } } };
}

/** 0 = not started, 0.5 = learned, 1 = practised from memory at least once. */
export function lineProgress(s: LineState | undefined): number {
  if (!s?.learned) return 0;
  return s.box >= 1 ? 1 : 0.5;
}

export function chapterProgress(ch: Chapter, p: CourseProgress): number {
  if (!ch.lines.length) return 0;
  return ch.lines.reduce((t, l) => t + lineProgress(p.lines[lineKey(ch.id, l.id)]), 0) / ch.lines.length;
}

export function courseProgress(c: Course, p: CourseProgress): number {
  const keys = c.chapters.flatMap((ch) => ch.lines.map((l) => lineKey(ch.id, l.id)));
  if (!keys.length) return 0;
  return keys.reduce((t, k) => t + lineProgress(p.lines[k]), 0) / keys.length;
}

/** Learned lines due for practice, most overdue first (course order breaks ties). */
export function dueKeys(c: Course, p: CourseProgress, now = Date.now(), chapterId?: string): string[] {
  const order = c.chapters.filter((ch) => !chapterId || ch.id === chapterId).flatMap((ch) => ch.lines.map((l) => lineKey(ch.id, l.id)));
  return order.filter((k) => p.lines[k]?.learned && p.lines[k].due <= now).sort((a, b) => p.lines[a].due - p.lines[b].due || order.indexOf(a) - order.indexOf(b));
}

/** First line (course order) not learned yet. */
export function nextToLearn(c: Course, p: CourseProgress): { chapter: string; line: string } | null {
  for (const ch of c.chapters) for (const l of ch.lines) if (!p.lines[lineKey(ch.id, l.id)]?.learned) return { chapter: ch.id, line: l.id };
  return null;
}

/** When the next review comes due (ms), or null if nothing is learned. */
export function nextDue(c: Course, p: CourseProgress): number | null {
  let best: number | null = null;
  for (const ch of c.chapters) for (const l of ch.lines) {
    const s = p.lines[lineKey(ch.id, l.id)];
    if (s?.learned && (best === null || s.due < best)) best = s.due;
  }
  return best;
}

/** In-session practice queue: a failed line goes to the back of the queue (at most twice more). */
export class PracticeQueue {
  private queue: string[];
  private retries = new Map<string, number>();
  streak = 0;
  done = 0;

  constructor(keys: string[]) {
    this.queue = [...keys];
  }

  get current(): string | undefined {
    return this.queue[0];
  }

  get remaining(): number {
    return this.queue.length;
  }

  /** Record the result for the current line and advance. */
  next(result: ReviewResult): string | undefined {
    const k = this.queue.shift();
    if (k === undefined) return undefined;
    this.done++;
    if (result === 'clean') this.streak++;
    else this.streak = 0;
    if (result === 'mistake') {
      const n = this.retries.get(k) ?? 0;
      if (n < 2) {
        this.retries.set(k, n + 1);
        this.queue.push(k);
      }
    }
    return this.queue[0];
  }
}

// ------------------------------------------------------------------ persistence (kv)

const KEY = (courseId: string) => `course:${courseId}`;

export async function loadProgress(courseId: string): Promise<CourseProgress> {
  try {
    const p = await kvGet<CourseProgress | null>(KEY(courseId), null);
    return p && typeof p === 'object' && p.lines ? p : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(courseId: string, p: CourseProgress): Promise<void> {
  await kvSet(KEY(courseId), p);
}

export async function loadAllProgress(ids: string[]): Promise<Map<string, CourseProgress>> {
  const out = new Map<string, CourseProgress>();
  await Promise.all(ids.map(async (id) => out.set(id, await loadProgress(id))));
  return out;
}

export async function loadPath(): Promise<PathChoice> {
  try {
    return { ...DEFAULT_PATH, ...(await kvGet<Partial<PathChoice>>('courses:path', {})) };
  } catch {
    return { ...DEFAULT_PATH };
  }
}

export async function savePath(p: PathChoice): Promise<void> {
  await kvSet('courses:path', p);
}
