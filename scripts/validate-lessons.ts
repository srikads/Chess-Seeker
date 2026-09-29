/* Validates every lesson: FENs, legality of every SAN, square names, and
 * (unless --no-engine) that each "try it" learner move is actually good
 * according to Stockfish. Run: npm run validate:lessons [-- --no-engine] [-- --only=<lesson-id|track>]
 */
import { Chess } from 'chess.js';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ALL_LESSONS } from '../src/lessons/index';
import type { Annotations, Lesson, Step } from '../src/lessons/types';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const useEngine = !args.includes('--no-engine');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const DEPTH = Number(args.find((a) => a.startsWith('--depth='))?.slice(8) ?? 16);
const CACHE_FILE = new URL(`./.engine-cache-${only ?? 'all'}.json`, import.meta.url);

const errors: string[] = [];
const warnings: string[] = [];
const SQ = /^[a-h][1-8]$/;

type Score = { cp: number | null; mate: number | null };
type Engine = { analyse(fen: string, o: { depth: number; multipv?: number }): Promise<{ bestmove: string; lines: (Score & { pv: string[] })[] }>; quit(): void };

const cache: Record<string, Score & { best: string }> = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
let engine: Engine | null = null;

/** Score from the side-to-move's perspective, mate folded into big numbers. */
function toNum(s: Score): number {
  if (s.mate !== null) return s.mate > 0 ? 100000 - s.mate * 100 : -100000 - s.mate * 100;
  return s.cp ?? 0;
}

async function evalFen(fen: string): Promise<Score & { best: string }> {
  const key = `${DEPTH}|${fen}`;
  if (cache[key]) return cache[key];
  const g = new Chess(fen);
  if (g.isCheckmate()) return (cache[key] = { cp: null, mate: 0, best: '' }); // side to move is mated
  if (g.isDraw() || g.isStalemate()) return (cache[key] = { cp: 0, mate: null, best: '' });
  const r = await engine!.analyse(fen, { depth: DEPTH });
  const top = r.lines[0] ?? { cp: 0, mate: null };
  return (cache[key] = { cp: top.cp, mate: top.mate, best: r.bestmove });
}

/** mate: 0 means "side to move is checkmated" → very negative. */
function num(s: Score): number {
  if (s.mate === 0) return -100000;
  return toNum(s);
}

function checkAnn(where: string, a: Annotations | undefined) {
  if (!a) return;
  for (const h of a.highlights ?? []) if (!SQ.test(h.sq)) errors.push(`${where}: bad highlight square "${h.sq}"`);
  for (const ar of a.arrows ?? []) {
    if (!SQ.test(ar.from) || !SQ.test(ar.to)) errors.push(`${where}: bad arrow ${ar.from}->${ar.to}`);
  }
}

function load(where: string, fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch (e) {
    errors.push(`${where}: invalid FEN "${fen}" (${(e as Error).message})`);
    return null;
  }
}

function play(where: string, g: Chess, san: string): boolean {
  try {
    const m = g.move(san);
    if (m.san !== san && m.san.replace(/[+#]/g, '') !== san.replace(/[+#]/g, '')) {
      warnings.push(`${where}: SAN "${san}" normalised to "${m.san}"`);
    } else if (m.san !== san) {
      errors.push(`${where}: check/mate suffix wrong: wrote "${san}", correct is "${m.san}"`);
    }
    return true;
  } catch {
    errors.push(`${where}: illegal move "${san}" in ${g.fen()}`);
    return false;
  }
}

async function checkStep(lesson: Lesson, i: number, step: Step) {
  const where = `[${lesson.id} step ${i + 1} ${step.kind}]`;
  checkAnn(where, step);
  if (step.kind === 'quiz') {
    if (step.answer < 0 || step.answer >= step.options.length) errors.push(`${where}: answer index out of range`);
    if (step.fen) load(where, step.fen);
    return;
  }
  const g = load(where, step.fen);
  if (!g) return;
  if (g.isGameOver()) errors.push(`${where}: starting position is already game over`);

  if (step.kind === 'explain') return;

  if (step.kind === 'demo') {
    if (!step.moves.length) errors.push(`${where}: demo has no moves`);
    step.moves.forEach((m, k) => {
      checkAnn(`${where} move ${k + 1}`, m);
      if (!play(`${where} move ${k + 1}`, g, m.san)) return;
    });
    return;
  }

  if (step.kind === 'playout') {
    if (useEngine) {
      const s = await evalFen(step.fen);
      const v = num(s);
      if (step.goal === 'draw' && Math.abs(v) > 150) warnings.push(`${where}: goal draw but eval ${v}`);
      if (step.goal !== 'draw' && v < 300) errors.push(`${where}: goal ${step.goal} but learner eval only ${v}cp`);
    }
    return;
  }

  // try step
  if (!step.solution.length) return void errors.push(`${where}: empty solution`);
  if (step.solution.length % 2 === 0) errors.push(`${where}: solution must end with a learner move (odd length)`);
  if (!step.hints?.length) warnings.push(`${where}: no hints`);
  for (const alt of step.alsoAccept ?? []) {
    const t = new Chess(step.fen);
    play(`${where} alsoAccept`, t, alt);
  }
  for (let k = 0; k < step.solution.length; k++) {
    const san = step.solution[k];
    const learner = k % 2 === 0;
    const before = g.fen();
    if (!play(`${where} move ${k + 1}`, g, san)) return;
    if (!useEngine) continue;
    const sb = await evalFen(before);
    const sa = await evalFen(g.fen());
    const vb = num(sb);
    const va = -num(sa); // back to mover's perspective
    const loss = vb - va;
    const label = `${where} move ${k + 1} ${san}`;
    if (learner) {
      if (vb >= 90000) {
        if (va < 90000) errors.push(`${label}: misses a forced mate (engine best ${sb.best}, mate ${sb.mate})`);
      } else if (loss > 80 && !(va >= 400 && loss <= 250)) {
        errors.push(`${label}: engine prefers ${sb.best} (loss ${loss}cp, before ${vb}, after ${va})`);
      }
    } else if (loss > 200 && va < 90000 && vb < 90000) {
      warnings.push(`${label}: opponent reply is weak (loss ${loss}cp, engine prefers ${sb.best}) — fine if intentional`);
    }
  }
}

async function main() {
  const ids = new Set<string>();
  const lessons = ALL_LESSONS.filter((l) => !only || l.id === only || l.track === only);
  if (useEngine) {
    const { createEngine } = require('./node-engine.cjs');
    engine = await createEngine('single');
  }
  for (const lesson of lessons) {
    if (ids.has(lesson.id)) errors.push(`duplicate lesson id ${lesson.id}`);
    ids.add(lesson.id);
    if (!/^[a-z0-9-]+$/.test(lesson.id)) errors.push(`bad lesson id ${lesson.id}`);
    if (!lesson.steps.length) errors.push(`${lesson.id}: no steps`);
    if (!lesson.steps.some((s) => s.kind === 'try' || s.kind === 'playout'))
      warnings.push(`${lesson.id}: no interactive "try"/"playout" step`);
    for (let i = 0; i < lesson.steps.length; i++) await checkStep(lesson, i, lesson.steps[i]);
    process.stdout.write('.');
  }
  engine?.quit();
  writeFileSync(CACHE_FILE, JSON.stringify(cache));
  console.log(`\nChecked ${lessons.length} lessons.`);
  for (const w of warnings) console.log('WARN ', w);
  for (const e of errors) console.log('ERROR', e);
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

main();
