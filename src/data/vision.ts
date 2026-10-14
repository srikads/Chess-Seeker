// Board Vision trainer logic (pure): coordinates, knight jumps, "is it defended?", "spot the hanging piece".
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

export const FILES = 'abcdefgh';
export const ALL_SQUARES: Square[] = [...FILES].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}` as Square));

export type Rnd = () => number;
export const pick = <T>(arr: readonly T[], rnd: Rnd): T => arr[Math.floor(rnd() * arr.length)];

/** Deterministic PRNG (mulberry32) for tests and reproducible sessions. */
export function seeded(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random square, different from the previous one. */
export function randomSquare(rnd: Rnd, not?: string): Square {
  let s: Square;
  do s = pick(ALL_SQUARES, rnd);
  while (s === not);
  return s;
}

/** Which square is under a point on the board. `x`,`y` are relative to the board's top-left, `size` its width. */
export function squareAt(x: number, y: number, size: number, orientation: 'white' | 'black'): Square | null {
  const fx = Math.floor((x / size) * 8);
  const fy = Math.floor((y / size) * 8);
  if (fx < 0 || fx > 7 || fy < 0 || fy > 7) return null;
  const file = orientation === 'white' ? fx : 7 - fx;
  const rank = orientation === 'white' ? 7 - fy : fy;
  return `${FILES[file]}${rank + 1}` as Square;
}

/** Squares a knight on `sq` can jump to. */
export function knightTargets(sq: string): Square[] {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]) - 1;
  const out: Square[] = [];
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const nf = f + df, nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(`${FILES[nf]}${nr + 1}` as Square);
  }
  return out;
}

/** Pieces of the same colour that guard the piece on `sq`. */
export function defendersOf(g: Chess, sq: Square): Square[] {
  const p = g.get(sq);
  if (!p) return [];
  return g.attackers(sq, p.color);
}

/** Enemy pieces that attack the piece on `sq`. */
export function attackersOf(g: Chess, sq: Square): Square[] {
  const p = g.get(sq);
  if (!p) return [];
  return g.attackers(sq, p.color === 'w' ? 'b' : 'w');
}

/** Non-king pieces that are attacked and have no defender (both colours). */
export function hangingSquares(g: Chess): Square[] {
  const out: Square[] = [];
  for (const row of g.board())
    for (const p of row) if (p && p.type !== 'k' && attackersOf(g, p.square).length && !defendersOf(g, p.square).length) out.push(p.square);
  return out;
}

const PIECES: PieceSymbol[] = ['q', 'r', 'r', 'b', 'b', 'n', 'n', 'p', 'p', 'p', 'p'];

/** A random but legal-looking middlegame position: both kings, a handful of pieces each, nobody in check. */
export function randomPosition(rnd: Rnd): string {
  for (let tries = 0; tries < 200; tries++) {
    const g = new Chess();
    g.clear();
    const used = new Set<string>();
    const place = (type: PieceSymbol, color: Color): boolean => {
      for (let k = 0; k < 30; k++) {
        const sq = pick(ALL_SQUARES, rnd);
        if (used.has(sq)) continue;
        if (type === 'p' && (sq[1] === '1' || sq[1] === '8')) continue;
        if (g.put({ type, color }, sq)) {
          used.add(sq);
          return true;
        }
      }
      return false;
    };
    place('k', 'w');
    place('k', 'b');
    for (const color of ['w', 'b'] as Color[]) {
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) place(pick(PIECES, rnd), color);
    }
    const wk = g.findPiece({ type: 'k', color: 'w' })[0];
    const bk = g.findPiece({ type: 'k', color: 'b' })[0];
    if (!wk || !bk) continue;
    if (Math.abs(wk.charCodeAt(0) - bk.charCodeAt(0)) <= 1 && Math.abs(Number(wk[1]) - Number(bk[1])) <= 1) continue;
    if (g.attackers(wk, 'b').length || g.attackers(bk, 'w').length) continue;
    const fen = g.fen();
    try {
      new Chess(fen);
      return fen;
    } catch {
      /* try again */
    }
  }
  return '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
}

export interface DefendedQuestion {
  fen: string;
  sq: Square;
  defended: boolean;
  defenders: Square[];
}

/** "Is the highlighted piece defended?" — answers come out roughly half yes, half no. */
export function defendedQuestion(rnd: Rnd, pool: string[] = []): DefendedQuestion {
  const want = rnd() < 0.5;
  for (let tries = 0; tries < 300; tries++) {
    const fen = pool.length && tries < 60 ? pick(pool, rnd) : randomPosition(rnd);
    const g = new Chess(fen);
    const cands = g
      .board()
      .flat()
      .filter((p) => p && p.type !== 'k')
      .map((p) => p!.square)
      .filter((sq) => (defendersOf(g, sq).length > 0) === want);
    if (!cands.length) continue;
    const sq = pick(cands, rnd);
    return { fen, sq, defended: want, defenders: defendersOf(g, sq) };
  }
  const fen = randomPosition(rnd);
  const g = new Chess(fen);
  const sq = g.board().flat().find((p) => p && p.type !== 'k')?.square ?? 'e1';
  return { fen, sq, defended: defendersOf(g, sq).length > 0, defenders: defendersOf(g, sq) };
}

export interface HangingQuestion {
  fen: string;
  sq: Square;
  attackers: Square[];
}

/** A position with exactly one hanging piece on the whole board. */
export function hangingQuestion(rnd: Rnd, pool: string[] = []): HangingQuestion {
  for (let tries = 0; tries < 2000; tries++) {
    const fen = pool.length && tries < 80 ? pick(pool, rnd) : randomPosition(rnd);
    const g = new Chess(fen);
    if (g.inCheck()) continue;
    const hang = hangingSquares(g);
    if (hang.length !== 1) continue;
    return { fen, sq: hang[0], attackers: attackersOf(g, hang[0]) };
  }
  // fallback: the e4 pawn attacks the lone knight on d5
  const fen = '4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1';
  return { fen, sq: 'd5', attackers: ['e4'] };
}
