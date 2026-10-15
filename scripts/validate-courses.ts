/* Validates course content: structure + legality (src/courses/lint.ts) and, unless --no-engine,
 * that every LEARNER move is not a blunder according to Stockfish (eval drop ≤ --max-loss, default 150cp).
 * Opponent moves may be weak on purpose only when flagged `trap: true`; other weak opponent moves are warnings.
 * Run: npm run validate:courses [-- --no-engine] [-- --only=<course-id>] [-- --depth=14] [-- --max-loss=150]
 */
import { Chess } from 'chess.js';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { COURSES } from '../src/courses/catalog';
import { lintCourse, isUserPly } from '../src/courses/lint';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const useEngine = !args.includes('--no-engine');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const DEPTH = Number(args.find((a) => a.startsWith('--depth='))?.slice(8) ?? 14);
const MAX_LOSS = Number(args.find((a) => a.startsWith('--max-loss='))?.slice(11) ?? 150);
const CACHE_FILE = new URL('./.engine-cache-courses.json', import.meta.url);

type Score = { cp: number | null; mate: number | null };
type Engine = { analyse(fen: string, o: { depth: number; multipv?: number }): Promise<{ bestmove: string; lines: (Score & { pv: string[] })[] }>; quit(): void };

const cache: Record<string, Score & { best: string }> = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
let engine: Engine | null = null;
const errors: string[] = [];
const warnings: string[] = [];

/** Side-to-move score; mate folded into big numbers; mate 0 = side to move is mated. */
function num(s: Score): number {
  if (s.mate === 0) return -100000;
  if (s.mate !== null) return s.mate > 0 ? 100000 - s.mate * 100 : -100000 - s.mate * 100;
  return s.cp ?? 0;
}

async function evalFen(fen: string): Promise<Score & { best: string }> {
  const key = `${DEPTH}|${fen}`;
  if (cache[key]) return cache[key];
  const g = new Chess(fen);
  if (g.isCheckmate()) return (cache[key] = { cp: null, mate: 0, best: '' });
  if (g.isDraw() || g.isStalemate()) return (cache[key] = { cp: 0, mate: null, best: '' });
  const r = await engine!.analyse(fen, { depth: DEPTH });
  const top = r.lines[0] ?? { cp: 0, mate: null };
  return (cache[key] = { cp: top.cp, mate: top.mate, best: r.bestmove });
}

async function main() {
  const courses = COURSES.filter((c) => !only || c.id === only);
  if (useEngine) {
    const { createEngine } = require('./node-engine.cjs');
    engine = await createEngine('single');
  }
  let lines = 0;
  for (const c of courses) {
    errors.push(...lintCourse(c));
    if (!useEngine || c.status !== 'ready') continue;
    for (const ch of c.chapters)
      for (const line of ch.lines) {
        lines++;
        const g = new Chess(line.startFen);
        for (let i = 0; i < line.moves.length; i++) {
          const m = line.moves[i];
          const before = g.fen();
          try {
            g.move(m.san);
          } catch {
            break; // reported by lint
          }
          const sb = await evalFen(before);
          const sa = await evalFen(g.fen());
          const vb = num(sb);
          const va = -num(sa);
          const loss = vb - va;
          const where = `[${c.id}/${ch.id}/${line.id}] ply ${i + 1} ${m.san}`;
          if (isUserPly(line, i)) {
            if (vb >= 90000 && va < 90000) errors.push(`${where}: misses a forced mate (engine: ${sb.best})`);
            else if (vb < 90000 && loss > MAX_LOSS) errors.push(`${where}: learner move loses ${loss}cp (before ${vb}, after ${va}; engine prefers ${sb.best})`);
          } else if (!m.trap && loss > 200 && vb < 90000) {
            warnings.push(`${where}: opponent move loses ${loss}cp (engine: ${sb.best}) — add trap: true if intentional`);
          } else if (m.trap && loss < 60) {
            warnings.push(`${where}: flagged trap but only loses ${loss}cp`);
          }
        }
        // the learner should not end the line worse than roughly equal
        const end = await evalFen(g.fen());
        const endForUser = (g.turn() === (line.userSide === 'white' ? 'w' : 'b') ? 1 : -1) * num(end);
        if (endForUser < -120) warnings.push(`[${c.id}/${ch.id}/${line.id}] ends at ${endForUser}cp for the learner`);
        process.stdout.write('.');
      }
  }
  engine?.quit();
  if (useEngine) writeFileSync(CACHE_FILE, JSON.stringify(cache));
  console.log(`\nChecked ${courses.length} courses, ${lines} lines with the engine (depth ${DEPTH}).`);
  for (const w of warnings) console.log('WARN ', w);
  for (const e of errors) console.log('ERROR', e);
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

main();
