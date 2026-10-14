// "Insights" — personal stats computed on this device from stored games, puzzle attempts and lessons.
// Pure functions only (no DOM, no IndexedDB) so everything here is unit-tested.
//
// Game phases (used for accuracy-by-phase and time-by-phase):
//   • endgame    — the position BEFORE the move has at most 26 points of non-pawn material on the board
//                  (both sides together; N/B = 3, R = 5, Q = 9 — the start position has 62). Roughly: queens
//                  off plus a few trades, or queens on with almost nothing else.
//   • opening    — otherwise, the first 10 moves of each side (plies 0–19).
//   • middlegame — everything else.
import { Chess } from 'chess.js';
import type { GameRecord, PuzzleAttempt } from '../store/db';
import { moveAccuracy } from './classify';
import { motifsOf } from './motifs';

export type Phase = 'opening' | 'middlegame' | 'endgame';
export type Outcome = 'win' | 'draw' | 'loss';
export const PHASES: Phase[] = ['opening', 'middlegame', 'endgame'];

const PIECE_VAL: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
export const ENDGAME_MATERIAL = 26;
export const OPENING_PLIES = 20;

/** Non-pawn, non-king material on the board (both sides) from a FEN. */
export function pieceMaterial(fen: string): number {
  let t = 0;
  for (const ch of fen.split(' ')[0]) t += PIECE_VAL[ch.toLowerCase()] ?? 0;
  return t;
}

/** Phase of the move played at `ply` (0-based, counted from the game start) in the position `fenBefore`. */
export function phaseOf(ply: number, fenBefore: string): Phase {
  if (pieceMaterial(fenBefore) <= ENDGAME_MATERIAL) return 'endgame';
  return ply < OPENING_PLIES ? 'opening' : 'middlegame';
}

/** The side the user played (games played as "both" sides, e.g. hot-seat, are skipped). */
export function userSide(g: GameRecord): 'white' | 'black' | null {
  return g.userColor === 'both' ? null : g.userColor;
}

export function outcomeOf(g: GameRecord): Outcome | null {
  const side = userSide(g);
  if (!side || g.result === '*') return null;
  if (g.result === '1/2-1/2') return 'draw';
  return (g.result === '1-0') === (side === 'white') ? 'win' : 'loss';
}

// ------------------------------------------------------------------ openings
/** A tiny built-in opening name map (SAN prefixes). The longest matching prefix wins. */
const OPENINGS: [string, string][] = [
  ['e4', "King's Pawn"],
  ['e4 e5', 'Open Game'],
  ['e4 e5 Nf3', "King's Knight Opening"],
  ['e4 e5 Nf3 Nc6', "King's Knight Opening"],
  ['e4 e5 Nf3 Nc6 Bc4', 'Italian Game'],
  ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'Italian Game: Giuoco Piano'],
  ['e4 e5 Nf3 Nc6 Bc4 Nf6', 'Italian Game: Two Knights'],
  ['e4 e5 Nf3 Nc6 Bb5', 'Ruy Lopez'],
  ['e4 e5 Nf3 Nc6 d4', 'Scotch Game'],
  ['e4 e5 Nf3 Nc6 Nc3', 'Three Knights Game'],
  ['e4 e5 Nf3 Nc6 Nc3 Nf6', 'Four Knights Game'],
  ['e4 e5 Nf3 Nf6', 'Petrov Defence'],
  ['e4 e5 Nf3 d6', 'Philidor Defence'],
  ['e4 e5 f4', "King's Gambit"],
  ['e4 e5 Nc3', 'Vienna Game'],
  ['e4 e5 Bc4', "Bishop's Opening"],
  ['e4 e5 Qh5', 'Wayward Queen Attack'],
  ['e4 e5 d4', 'Centre Game'],
  ['e4 c5', 'Sicilian Defence'],
  ['e4 c5 Nf3 d6', 'Sicilian Defence'],
  ['e4 c5 Nc3', 'Sicilian: Closed'],
  ['e4 c5 c3', 'Sicilian: Alapin'],
  ['e4 e6', 'French Defence'],
  ['e4 c6', 'Caro-Kann Defence'],
  ['e4 d5', 'Scandinavian Defence'],
  ['e4 d6', 'Pirc Defence'],
  ['e4 g6', 'Modern Defence'],
  ['e4 Nf6', "Alekhine's Defence"],
  ['e4 Nc6', 'Nimzowitsch Defence'],
  ['d4', "Queen's Pawn"],
  ['d4 d5', "Queen's Pawn Game"],
  ['d4 d5 c4', "Queen's Gambit"],
  ['d4 d5 c4 e6', "Queen's Gambit Declined"],
  ['d4 d5 c4 c6', 'Slav Defence'],
  ['d4 d5 c4 dxc4', "Queen's Gambit Accepted"],
  ['d4 d5 Bf4', 'London System'],
  ['d4 d5 Nf3 Nf6 Bf4', 'London System'],
  ['d4 Nf6', 'Indian Defence'],
  ['d4 Nf6 Bf4', 'London System'],
  ['d4 Nf6 c4 g6', "King's Indian Defence"],
  ['d4 Nf6 c4 e6', 'Indian Defence'],
  ['d4 Nf6 c4 e6 Nc3 Bb4', 'Nimzo-Indian Defence'],
  ['d4 f5', 'Dutch Defence'],
  ['c4', 'English Opening'],
  ['Nf3', 'Réti Opening'],
  ['g3', "King's Fianchetto"],
  ['b3', 'Larsen Opening'],
  ['f4', "Bird's Opening"],
];
const OPENING_MAP = new Map(OPENINGS);

/** Name the opening from the first moves (up to 6 plies). Non-standard starts get a generic name. */
export function openingName(sans: string[], startFen?: string): string {
  if (startFen && startFen.split(' ')[0] !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') return 'Custom position';
  for (let n = Math.min(6, sans.length); n > 0; n--) {
    const name = OPENING_MAP.get(sans.slice(0, n).join(' '));
    if (name) return name;
  }
  return sans.length ? 'Other openings' : 'No moves';
}

// ------------------------------------------------------------------ results
export interface WDL {
  win: number;
  draw: number;
  loss: number;
}
const emptyWdl = (): WDL => ({ win: 0, draw: 0, loss: 0 });
export const wdlTotal = (w: WDL) => w.win + w.draw + w.loss;
/** Score in % (win = 1, draw = ½). */
export const wdlScore = (w: WDL) => (wdlTotal(w) ? Math.round((100 * (w.win + w.draw / 2)) / wdlTotal(w)) : 0);

// ------------------------------------------------------------------ per-game breakdown
export const ERROR_CLASSES = ['inaccuracy', 'mistake', 'miss', 'blunder'] as const;
export type ErrorClass = (typeof ERROR_CLASSES)[number];

/** Motifs that are tactics (the ones worth drilling), as opposed to general principles. */
const TACTICAL = new Set(['fork', 'pin', 'skewer', 'discovered', 'double-check', 'back-rank', 'smothered', 'mate', 'free-piece', 'remove-defender', 'sacrifice', 'promotion']);

export interface GameStats {
  date: number;
  outcome: Outcome | null;
  accuracy: number | null;
  /** per-phase [sum of move accuracy, moves] for the user's analysed moves */
  phaseAcc: Record<Phase, [number, number]>;
  /** per-phase [sum of seconds, moves] for the user's moves with a time */
  phaseTime: Record<Phase, [number, number]>;
  timeTrouble: number;
  errors: Record<ErrorClass, number>;
  /** tactics the user could have played instead of a mistake (from the engine's best move) */
  missed: { id: string; label: string; lesson: string }[];
  /** tactics the opponent could answer with after the user's mistake */
  allowed: { id: string; label: string; lesson: string }[];
  opening: string;
}

/** Parse "15+10" style ids into base ms + increment ms (null when untimed / unknown). */
export function parseTc(tc: string): { base: number; inc: number } | null {
  const m = /^(\d+)\+(\d+)$/.exec(tc);
  if (!m || Number(m[1]) === 0) return null;
  return { base: Number(m[1]) * 60_000, inc: Number(m[2]) * 1000 };
}

/** "Time trouble" = the user moved with less than max(30 s, 10 % of the base time) on the clock. */
export function timeTroubleLimit(baseMs: number) {
  return Math.max(30_000, baseMs * 0.1);
}

export function gameStats(g: GameRecord, withMotifs = true): GameStats {
  const side = userSide(g);
  const me = side === 'black' ? 1 : 0; // ply parity of the user's moves, from a standard start
  const startBlack = g.startFen.split(' ')[1] === 'b';
  const phaseAcc = { opening: [0, 0], middlegame: [0, 0], endgame: [0, 0] } as Record<Phase, [number, number]>;
  const phaseTime = { opening: [0, 0], middlegame: [0, 0], endgame: [0, 0] } as Record<Phase, [number, number]>;
  const errors = { inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 } as Record<ErrorClass, number>;
  const missed: GameStats['missed'] = [];
  const allowed: GameStats['allowed'] = [];
  const tc = parseTc(g.timeControl);
  let clock = tc?.base ?? 0;
  let timeTrouble = 0;
  let chess: Chess | null = null;
  try {
    chess = new Chess(g.startFen);
  } catch {
    chess = null;
  }
  for (let i = 0; i < g.sans.length && chess; i++) {
    const fenBefore = chess.fen();
    const mine = side !== null && ((i + (startBlack ? 1 : 0)) % 2 === me);
    const phase = phaseOf(i, fenBefore);
    let played;
    try {
      played = chess.move(g.sans[i]);
    } catch {
      break;
    }
    if (!mine) continue;
    const a = g.analysis?.[i];
    if (a) {
      phaseAcc[phase][0] += moveAccuracy(a.winLoss);
      phaseAcc[phase][1]++;
      if ((ERROR_CLASSES as readonly string[]).includes(a.cls)) {
        errors[a.cls as ErrorClass]++;
        if (withMotifs && a.cls !== 'inaccuracy') {
          try {
            if (a.best && a.best !== played.san) {
              const best = new Chess(fenBefore).move(a.best);
              missed.push(...motifsOf(fenBefore, best).filter((m) => TACTICAL.has(m.id)).slice(0, 1));
            }
            const reply = g.analysis?.[i + 1]?.best;
            if (reply) {
              const fenAfter = chess.fen();
              const r = new Chess(fenAfter).move(reply);
              allowed.push(...motifsOf(fenAfter, r).filter((m) => TACTICAL.has(m.id)).slice(0, 1));
            }
          } catch {
            /* engine line not legal here — skip */
          }
        }
      }
    }
    const t = g.times?.[i];
    if (typeof t === 'number' && t >= 0) {
      phaseTime[phase][0] += t / 1000;
      phaseTime[phase][1]++;
      if (tc) {
        if (clock < timeTroubleLimit(tc.base)) timeTrouble++;
        clock = clock - t + tc.inc;
      }
    }
  }
  const acc = side && g.accuracy ? g.accuracy[side] : null;
  return {
    date: g.date,
    outcome: outcomeOf(g),
    accuracy: typeof acc === 'number' && isFinite(acc) ? acc : null,
    phaseAcc,
    phaseTime,
    timeTrouble,
    errors,
    missed: missed.map(({ id, label, lesson }) => ({ id, label, lesson })),
    allowed: allowed.map(({ id, label, lesson }) => ({ id, label, lesson })),
    opening: openingName(g.sans, g.startFen),
  };
}

// ------------------------------------------------------------------ puzzles
export interface RatingPoint {
  date: number;
  rating: number;
}

/** Rebuild the puzzle-rating curve from attempts with the same Elo rule as the Puzzles screen.
 *  If `current` is given the curve is shifted so its last point matches it (attempt dates can drift). */
export function puzzleRatingHistory(attempts: PuzzleAttempt[], start = 800, current?: number): RatingPoint[] {
  const sorted = [...attempts].sort((a, b) => a.date - b.date);
  let r = start;
  const out: RatingPoint[] = [];
  sorted.forEach((a, n) => {
    const exp = 1 / (1 + 10 ** ((a.rating - r) / 400));
    const k = n < 20 ? 40 : 20;
    r = Math.max(100, r + k * ((a.solved ? 1 : 0) - exp));
    out.push({ date: a.date, rating: r });
  });
  if (current !== undefined && out.length) {
    const shift = current - out[out.length - 1].rating;
    for (const p of out) p.rating = Math.round(p.rating + shift);
  } else for (const p of out) p.rating = Math.round(p.rating);
  return out;
}

export interface ThemeStat {
  theme: string;
  solved: number;
  total: number;
  /** solve rate 0–100 */
  rate: number;
}

const IGNORED_THEMES = /^(lesson|lesson:.*|mix|mixed|short|long|veryLong|oneMove|master|masterVsMaster|superGM|crushing|advantage|equality|middlegame|opening|endgame)$/;

/** Solve rate per puzzle theme (themes with at least `min` attempts), best first. */
export function themeStats(attempts: PuzzleAttempt[], themesOf: (id: string) => string[] | undefined, min = 3): ThemeStat[] {
  const map = new Map<string, { solved: number; total: number }>();
  for (const a of attempts) {
    for (const t of themesOf(a.id) ?? []) {
      if (IGNORED_THEMES.test(t)) continue;
      const s = map.get(t) ?? { solved: 0, total: 0 };
      s.total++;
      if (a.solved) s.solved++;
      map.set(t, s);
    }
  }
  return [...map.entries()]
    .filter(([, s]) => s.total >= min)
    .map(([theme, s]) => ({ theme, ...s, rate: Math.round((100 * s.solved) / s.total) }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
}

// ------------------------------------------------------------------ the whole dashboard
export interface CountItem {
  id: string;
  label: string;
  lesson: string;
  count: number;
}

export interface OpeningStat extends WDL {
  name: string;
  color: 'white' | 'black';
  games: number;
  accuracy: number | null;
}

export interface Insights {
  games: number;
  analysed: number;
  wdl: WDL;
  /** chronological, analysed games only */
  accuracy: { date: number; value: number }[];
  avgAccuracy: number | null;
  phaseAccuracy: Record<Phase, number | null>;
  phaseMoves: Record<Phase, number>;
  /** chronological, analysed games only */
  errorsPerGame: { date: number; errors: Record<ErrorClass, number> }[];
  avgErrors: Record<ErrorClass, number>;
  missed: CountItem[];
  allowed: CountItem[];
  openings: OpeningStat[];
  byBot: (WDL & { level: number })[];
  secondsPerMove: Record<Phase, number | null>;
  timeTroubleMoves: number;
  timedGames: number;
  puzzleRating: RatingPoint[];
  themes: ThemeStat[];
}

const round1 = (x: number) => Math.round(x * 10) / 10;

function countItems(list: { id: string; label: string; lesson: string }[]): CountItem[] {
  const map = new Map<string, CountItem>();
  for (const m of list) {
    const c = map.get(m.id) ?? { ...m, count: 0 };
    c.count++;
    map.set(m.id, c);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function computeInsights(
  allGames: GameRecord[],
  attempts: PuzzleAttempt[] = [],
  o: { themesOf?: (id: string) => string[] | undefined; puzzleRating?: number; withMotifs?: boolean } = {},
): Insights {
  const games = allGames.filter((g) => userSide(g) !== null).sort((a, b) => a.date - b.date);
  const stats = games.map((g) => ({ g, s: gameStats(g, o.withMotifs !== false) }));
  const wdl = emptyWdl();
  for (const { s } of stats) if (s.outcome) wdl[s.outcome]++;

  const analysed = stats.filter(({ g }) => g.analysis?.length);
  const accuracy = analysed.filter(({ s }) => s.accuracy !== null).map(({ s }) => ({ date: s.date, value: round1(s.accuracy!) }));
  const avgAccuracy = accuracy.length ? round1(accuracy.reduce((a, x) => a + x.value, 0) / accuracy.length) : null;

  const phaseAccuracy = {} as Record<Phase, number | null>;
  const phaseMoves = {} as Record<Phase, number>;
  const secondsPerMove = {} as Record<Phase, number | null>;
  for (const p of PHASES) {
    const [sum, n] = analysed.reduce(([a, b], { s }) => [a + s.phaseAcc[p][0], b + s.phaseAcc[p][1]], [0, 0]);
    phaseAccuracy[p] = n >= 3 ? round1(sum / n) : null;
    phaseMoves[p] = n;
    const [ts, tn] = stats.reduce(([a, b], { s }) => [a + s.phaseTime[p][0], b + s.phaseTime[p][1]], [0, 0]);
    secondsPerMove[p] = tn >= 3 ? round1(ts / tn) : null;
  }

  const errorsPerGame = analysed.map(({ s }) => ({ date: s.date, errors: s.errors }));
  const avgErrors = {} as Record<ErrorClass, number>;
  for (const c of ERROR_CLASSES) avgErrors[c] = errorsPerGame.length ? round1(errorsPerGame.reduce((a, x) => a + x.errors[c], 0) / errorsPerGame.length) : 0;

  const openMap = new Map<string, OpeningStat & { accSum: number; accN: number }>();
  for (const { g, s } of stats) {
    const color = userSide(g)!;
    const key = `${color}|${s.opening}`;
    const op = openMap.get(key) ?? { name: s.opening, color, games: 0, ...emptyWdl(), accuracy: null, accSum: 0, accN: 0 };
    op.games++;
    if (s.outcome) op[s.outcome]++;
    if (s.accuracy !== null) (op.accSum += s.accuracy), op.accN++;
    openMap.set(key, op);
  }
  const openings = [...openMap.values()]
    .map(({ accSum, accN, ...op }) => ({ ...op, accuracy: accN ? round1(accSum / accN) : null }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));

  const botMap = new Map<number, WDL & { level: number }>();
  for (const { g, s } of stats) {
    if (g.botLevel === undefined || !s.outcome) continue;
    const b = botMap.get(g.botLevel) ?? { level: g.botLevel, ...emptyWdl() };
    b[s.outcome]++;
    botMap.set(g.botLevel, b);
  }

  const timed = stats.filter(({ g }) => parseTc(g.timeControl) && g.times?.length);
  return {
    games: games.length,
    analysed: analysed.length,
    wdl,
    accuracy,
    avgAccuracy,
    phaseAccuracy,
    phaseMoves,
    errorsPerGame,
    avgErrors,
    missed: countItems(analysed.flatMap(({ s }) => s.missed)),
    allowed: countItems(analysed.flatMap(({ s }) => s.allowed)),
    openings,
    byBot: [...botMap.values()].sort((a, b) => a.level - b.level),
    secondsPerMove,
    timeTroubleMoves: timed.reduce((a, { s }) => a + s.timeTrouble, 0),
    timedGames: timed.length,
    puzzleRating: puzzleRatingHistory(attempts, 800, o.puzzleRating),
    themes: o.themesOf ? themeStats(attempts, o.themesOf) : [],
  };
}

// ------------------------------------------------------------------ coach: top 3 things to work on
export interface Advice {
  id: string;
  title: string;
  text: string;
  /** app route, e.g. "/lesson/fork" */
  href: string;
  cta: string;
  kind: 'lesson' | 'puzzles' | 'play' | 'review';
  score: number;
}

/** Puzzle theme that drills a motif (Lichess theme keys). */
export const MOTIF_THEME: Record<string, string> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovered: 'discoveredAttack',
  'double-check': 'doubleCheck',
  'back-rank': 'backRankMate',
  smothered: 'smotheredMate',
  mate: 'mateIn2',
  'free-piece': 'hangingPiece',
  'remove-defender': 'capturingDefender',
  sacrifice: 'sacrifice',
  promotion: 'promotion',
};

const PHASE_ADVICE: Record<Phase, { lesson: string; theme: string; label: string }> = {
  opening: { lesson: 'develop-your-pieces', theme: 'opening', label: 'openings' },
  middlegame: { lesson: 'thinking-routine', theme: 'fork', label: 'middlegames' },
  endgame: { lesson: 'king-pawn-vs-king', theme: 'endgame', label: 'endgames' },
};

/** Pick the three most useful things to practise, most important first. `themeLabel` names puzzle themes. */
export function topAdvice(ins: Insights, themeLabel: (t: string) => string = (t) => t): Advice[] {
  const out: Advice[] = [];
  const perGame = (c: ErrorClass) => ins.avgErrors[c];
  if (ins.analysed >= 1 && perGame('blunder') >= 0.8) {
    out.push({
      id: 'blunders',
      title: 'Cut down on blunders',
      text: `You make about ${perGame('blunder')} blunders a game. Before each move, check: what does their last move attack, and is anything of mine undefended?`,
      href: '/lesson/hanging-pieces',
      cta: 'Hanging pieces lesson',
      kind: 'lesson',
      score: 50 + perGame('blunder') * 10,
    });
  }
  const allowed = ins.allowed[0];
  if (allowed && allowed.count >= 2) {
    out.push({
      id: `allowed-${allowed.id}`,
      title: `Watch out for: ${allowed.label}`,
      text: `After ${allowed.count} of your mistakes, your opponent had this tactic ready. Learn to see it coming.`,
      href: `/lesson/${allowed.lesson}`,
      cta: 'Learn the pattern',
      kind: 'lesson',
      score: 40 + allowed.count * 4,
    });
  }
  const missed = ins.missed[0];
  if (missed && missed.count >= 2) {
    const theme = MOTIF_THEME[missed.id];
    out.push({
      id: `missed-${missed.id}`,
      title: `Look for: ${missed.label}`,
      text: `You missed this winning idea ${missed.count} times. Puzzles train your eye for it.`,
      href: theme ? `/puzzles/${theme}` : `/lesson/${missed.lesson}`,
      cta: theme ? `${themeLabel(theme)} puzzles` : 'Learn the pattern',
      kind: theme ? 'puzzles' : 'lesson',
      score: 38 + missed.count * 4,
    });
  }
  const phases = PHASES.filter((p) => ins.phaseAccuracy[p] !== null) as Phase[];
  if (phases.length >= 2) {
    const worst = phases.reduce((a, b) => (ins.phaseAccuracy[a]! <= ins.phaseAccuracy[b]! ? a : b));
    const best = Math.max(...phases.map((p) => ins.phaseAccuracy[p]!));
    const gap = best - ins.phaseAccuracy[worst]!;
    if (gap >= 5) {
      const pa = PHASE_ADVICE[worst];
      out.push({
        id: `phase-${worst}`,
        title: `Sharpen your ${pa.label}`,
        text: `Your accuracy drops to ${ins.phaseAccuracy[worst]}% in the ${worst}, ${Math.round(gap)} points below your best phase.`,
        href: `/lesson/${pa.lesson}`,
        cta: 'Start a lesson',
        kind: 'lesson',
        score: 25 + gap,
      });
    }
  }
  const weakTheme = [...ins.themes].reverse().find((t) => t.total >= 5 && t.rate < 55);
  if (weakTheme) {
    out.push({
      id: `theme-${weakTheme.theme}`,
      title: `Practise ${themeLabel(weakTheme.theme).toLowerCase()} puzzles`,
      text: `You solve ${weakTheme.rate}% of ${themeLabel(weakTheme.theme).toLowerCase()} puzzles. A few each day will lift that fast.`,
      href: `/puzzles/${weakTheme.theme}`,
      cta: 'Practise now',
      kind: 'puzzles',
      score: 20 + (55 - weakTheme.rate),
    });
  }
  if (ins.timedGames >= 2 && ins.timeTroubleMoves / ins.timedGames >= 3) {
    out.push({
      id: 'time',
      title: 'Manage your clock',
      text: `You played ${Math.round(ins.timeTroubleMoves / ins.timedGames)} moves a game in time trouble. Spend less time on easy moves early on.`,
      href: '/lesson/time-management',
      cta: 'Time management lesson',
      kind: 'lesson',
      score: 30,
    });
  }
  if (ins.games - ins.analysed >= 1) {
    out.push({
      id: 'review',
      title: 'Review your games',
      text: `${ins.games - ins.analysed} of your games haven't been reviewed yet. Reviews are what fill this page.`,
      href: '/games',
      cta: 'Open games',
      kind: 'review',
      score: 15,
    });
  }
  if (ins.games < 5) {
    out.push({
      id: 'play',
      title: 'Play a few more games',
      text: 'Insights get sharper with every game. A long game against a bot is the best practice.',
      href: '/play',
      cta: 'Play a game',
      kind: 'play',
      score: 10,
    });
  }
  out.push({
    id: 'tactics',
    title: 'Keep solving tactics',
    text: 'Ten puzzles a day is the fastest way to stop missing forks and hanging pieces.',
    href: '/puzzles',
    cta: 'Solve puzzles',
    kind: 'puzzles',
    score: 5,
  });
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.score - a.score)
    .filter((a) => {
      const key = a.href;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}
