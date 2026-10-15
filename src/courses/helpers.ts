// Small authoring helpers so course files stay readable.
import type { Chapter, LineMove } from './types';

/** A move with an optional coach line and extras: M('Bc4', 'Aims at f7.', { arrows: ['c4f7:red'] }). */
export function M(san: string, text?: string, extra: Omit<LineMove, 'san' | 'text'> = {}): LineMove {
  return { san, ...(text ? { text } : {}), ...extra };
}

/** Several moves without notes: plain('e4 e5 Nf3 Nc6'). Move numbers like "1." or "3..." are ignored. */
export function plain(moves: string): LineMove[] {
  return moves
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.+$/.test(t))
    .map((t) => ({ san: t.replace(/^\d+\.+/, '') }));
}

/** Opponent move that is a deliberate mistake we teach how to punish. */
export function T(san: string, text?: string, extra: Omit<LineMove, 'san' | 'text' | 'trap'> = {}): LineMove {
  return { ...M(san, text, extra), trap: true };
}

/** Chapter titles for a course that is not authored yet ("In production"). */
export function outline(titles: string[]): Chapter[] {
  return titles.map((title, i) => ({ id: `ch${i + 1}`, title, intro: '', lines: [] }));
}
