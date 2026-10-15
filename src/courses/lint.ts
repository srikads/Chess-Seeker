// Structural + legality checks for course content (no engine). Used by tests and scripts/validate-courses.ts.
import { Chess } from 'chess.js';
import type { Course, Line } from './types';

const ID = /^[a-z0-9-]+$/;
const SQ = /^[a-h][1-8]$/;
export const BRUSHES = ['green', 'red', 'blue', 'yellow', 'paleGreen', 'paleBlue', 'paleRed', 'paleGrey'];
const ARROW = new RegExp(`^[a-h][1-8](?:[a-h][1-8])?(?::(?:${BRUSHES.join('|')}))?$`);
const HL = ['green', 'red', 'blue', 'yellow'];
export const MAX_NOTE = 170;

/** Number of sentences in a coach note (a sentence ends with . ! or ? followed by a space or the end). */
export function sentences(text: string): number {
  return (text.trim().match(/[.!?](?=\s|$)/g) ?? []).length || 1;
}

/** Is ply `i` of the line played by the learner? */
export function isUserPly(line: Line, i: number): boolean {
  const first = new Chess(line.startFen).turn() === 'w' ? 'white' : 'black';
  const mover = i % 2 === 0 ? first : first === 'white' ? 'black' : 'white';
  return mover === line.userSide;
}

export function lintLine(where: string, line: Line): string[] {
  const errs: string[] = [];
  if (!ID.test(line.id)) errs.push(`${where}: bad line id`);
  if (!line.title) errs.push(`${where}: missing title`);
  if (!line.summary) errs.push(`${where}: missing summary`);
  if (!line.moves.length) return [...errs, `${where}: no moves`];
  let g: Chess;
  try {
    g = new Chess(line.startFen);
  } catch (e) {
    return [...errs, `${where}: bad startFen (${(e as Error).message})`];
  }
  if (line.startFen && (g.turn() === 'w' ? 'white' : 'black') !== line.userSide)
    errs.push(`${where}: a line with startFen must start with the learner to move`);
  if (!line.moves.some((_, i) => isUserPly(line, i))) errs.push(`${where}: learner never moves`);
  for (const [k, note] of [['intro', line.intro], ['summary', line.summary]] as const) {
    if (note && (sentences(note) > 2 || note.length > MAX_NOTE)) errs.push(`${where}: ${k} is longer than 2 sentences / ${MAX_NOTE} chars`);
  }
  for (let i = 0; i < line.moves.length; i++) {
    const m = line.moves[i];
    const at = `${where} ply ${i + 1} ${m.san}`;
    const user = isUserPly(line, i);
    const before = g.fen();
    try {
      const mv = g.move(m.san);
      if (mv.san !== m.san) errs.push(`${at}: write SAN exactly as "${mv.san}"`);
    } catch {
      errs.push(`${at}: illegal in ${before}`);
      break;
    }
    if (m.text && (sentences(m.text) > 2 || m.text.length > MAX_NOTE)) errs.push(`${at}: note longer than 2 sentences / ${MAX_NOTE} chars`);
    for (const a of m.arrows ?? []) if (!ARROW.test(a)) errs.push(`${at}: bad arrow "${a}"`);
    for (const [sq, c] of Object.entries(m.highlights ?? {})) if (!SQ.test(sq) || !HL.includes(c)) errs.push(`${at}: bad highlight ${sq}:${c}`);
    if (m.trap && user) errs.push(`${at}: trap: true is only for opponent moves`);
    if (m.accept?.length) {
      if (!user) errs.push(`${at}: accept is only for learner moves`);
      if (i !== line.moves.length - 1) errs.push(`${at}: accept is only allowed on the final move`);
      for (const alt of m.accept) {
        try {
          const t = new Chess(before).move(alt);
          if (t.san !== alt) errs.push(`${at}: accept SAN should be "${t.san}"`);
        } catch {
          errs.push(`${at}: accept move "${alt}" is illegal`);
        }
      }
    }
  }
  return errs;
}

export function lintCourse(c: Course): string[] {
  const errs: string[] = [];
  const w = `[${c.id}]`;
  if (!ID.test(c.id)) errs.push(`${w} bad course id`);
  if (!c.title || !c.subtitle || !c.description) errs.push(`${w} missing title/subtitle/description`);
  if (!/^#[0-9a-f]{6}$/i.test(c.cover.bg) || !/^#[0-9a-f]{6}$/i.test(c.cover.fg)) errs.push(`${w} cover colours must be #rrggbb`);
  if (!c.cover.label || c.cover.label.length > 8) errs.push(`${w} cover label must be 1–8 chars`);
  if (!c.categories.length) errs.push(`${w} needs at least one category`);
  if (c.status === 'soon') {
    if (c.chapters.length) errs.push(`${w} coming-soon courses have no chapters`);
    return errs;
  }
  if (!c.chapters.length) errs.push(`${w} needs chapter titles`);
  const chIds = new Set<string>();
  for (const ch of c.chapters) {
    const cw = `${w}/${ch.id}`;
    if (!ID.test(ch.id)) errs.push(`${cw} bad chapter id`);
    if (chIds.has(ch.id)) errs.push(`${cw} duplicate chapter id`);
    chIds.add(ch.id);
    if (!ch.title) errs.push(`${cw} missing title`);
    if (c.status === 'ready') {
      if (!ch.lines.length) errs.push(`${cw} ready course with an empty chapter`);
      if (!ch.intro) errs.push(`${cw} missing intro`);
    }
    const lineIds = new Set<string>();
    for (const l of ch.lines) {
      if (lineIds.has(l.id)) errs.push(`${cw}/${l.id} duplicate line id`);
      lineIds.add(l.id);
      if (c.side !== 'both' && l.userSide !== c.side) errs.push(`${cw}/${l.id} userSide ${l.userSide} but course side is ${c.side}`);
      errs.push(...lintLine(`${cw}/${l.id}`, l));
    }
  }
  return errs;
}
