// "Is it safe?" — the blunder-check habit, without an engine.
// Checks, captures and threats (CCT) for both sides, the pieces a move would leave hanging,
// and the threats the opponent has right now. Pure functions: tested in tests/safety.test.ts.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { hangingPieces } from './explain';
import { NAME, VALUE, other } from './util';

export interface CctMove {
  from: Square;
  to: Square;
  san: string;
  /** captures: wins material (target undefended or worth more than the capturer); threats: hits a valuable/loose piece */
  good: boolean;
}

export interface Cct {
  checks: CctMove[];
  captures: CctMove[];
  threats: CctMove[];
}

const EMPTY: Cct = { checks: [], captures: [], threats: [] };

/** A position where `color` is to move (en passant dropped). Null if that would be illegal (e.g. the other king is in check). */
export function withTurn(fen: string, color: Color): Chess | null {
  const parts = fen.split(' ');
  if (parts[1] === color) return new Chess(fen);
  parts[1] = color;
  parts[3] = '-';
  try {
    const g = new Chess(parts.join(' '));
    // the side that just "passed" must not be left in check
    const k = g.findPiece({ type: 'k', color: other(color) })[0];
    if (k && g.isAttacked(k, color)) return null;
    return g;
  } catch {
    return null;
  }
}

/** Enemy pieces that the piece on `sq` attacks and that are worth attacking (loose, or worth more). */
function targetsOf(g: Chess, sq: Square): Square[] {
  const piece = g.get(sq);
  if (!piece) return [];
  const out: Square[] = [];
  for (const row of g.board())
    for (const p of row) {
      if (!p || p.color === piece.color || p.type === 'k') continue;
      if (!g.attackers(p.square, piece.color).includes(sq)) continue;
      const defended = g.attackers(p.square, p.color).length > 0;
      if (!defended || VALUE[p.type] > VALUE[piece.type]) out.push(p.square);
    }
  return out;
}

const cm = (m: Move, good: boolean): CctMove => ({ from: m.from, to: m.to, san: m.san, good });

/** Checks, captures and threats available to `color` in this position (as if it were their move). */
export function cct(fen: string, color: Color): Cct {
  const g = withTurn(fen, color);
  if (!g) return EMPTY;
  const out: Cct = { checks: [], captures: [], threats: [] };
  for (const m of g.moves({ verbose: true })) {
    const t = new Chess(g.fen());
    t.move(m);
    if (t.inCheck()) {
      out.checks.push(cm(m, t.isCheckmate()));
      continue;
    }
    if (m.captured) {
      const recapturable = t.attackers(m.to, other(color)).length > 0;
      out.captures.push(cm(m, !recapturable || VALUE[m.captured] > VALUE[m.piece]));
      continue;
    }
    const before = new Set(m.piece === 'k' ? [] : targetsOf(g, m.from));
    // a threat only counts if the piece is not simply lost on its new square
    const safe = !hangingPieces(t, color).includes(m.to);
    const fresh = m.piece === 'k' ? [] : targetsOf(t, m.to).filter((s) => !before.has(s));
    if (fresh.length && safe) out.threats.push(cm(m, fresh.some((s) => VALUE[t.get(s)!.type] >= 3)));
  }
  const rank = (a: CctMove, b: CctMove) => Number(b.good) - Number(a.good);
  out.checks.sort(rank);
  out.captures.sort(rank);
  out.threats.sort(rank);
  return out;
}

export type CctKind = keyof Cct;

const list = (ms: CctMove[]) => {
  const sans = ms.slice(0, 2).map((m) => `**${m.san}**`);
  return ms.length > 2 ? `${sans.join(', ')} and ${ms.length - 2} more` : sans.join(' and ');
};

/** One or two short sentences for a CCT chip: what you have, what they have. */
export function cctSummary(kind: CctKind, mine: CctMove[], theirs: CctMove[]): string {
  const word = { checks: 'check', captures: 'capture', threats: 'threat' }[kind];
  const verb = { checks: 'can check with', captures: 'can capture with', threats: 'can attack with' }[kind];
  const goodMine = mine.filter((m) => m.good);
  const goodTheirs = theirs.filter((m) => m.good);
  const you = mine.length
    ? `You ${verb} ${list(goodMine.length ? goodMine : mine)}.`
    : `You have no ${word}s right now.`;
  const them = theirs.length
    ? `They ${verb} ${list(goodTheirs.length ? goodTheirs : theirs)}${kind === 'captures' && goodTheirs.length ? ', so guard that piece!' : '.'}`
    : `They have no ${word}s. Nice and calm.`;
  return `${you} ${them}`;
}

export interface Threat {
  /** the enemy piece that can strike */
  from: Square;
  /** the square it hits (your piece, or the king's mating square) */
  to: Square;
  /** short plain-English description */
  text: string;
  kind: 'hanging' | 'mate';
}

/** Cheapest enemy attacker of `sq`. */
function cheapestAttacker(g: Chess, sq: Square, by: Color): Square | null {
  const list = g.attackers(sq, by);
  if (!list.length) return null;
  return list.reduce((a, b) => (VALUE[g.get(a)!.type] <= VALUE[g.get(b)!.type] ? a : b));
}

/** What is the opponent threatening against the side to move right now? (hanging pieces, mate in one) */
export function threatsAgainst(fen: string): Threat[] {
  const g = new Chess(fen);
  const me = g.turn();
  const them = other(me);
  const out: Threat[] = [];
  const opp = withTurn(fen, them);
  if (opp && !g.inCheck()) {
    for (const m of opp.moves({ verbose: true })) {
      const t = new Chess(opp.fen());
      t.move(m);
      if (t.isCheckmate()) out.push({ from: m.from, to: m.to, text: `they threaten checkmate with ${m.san}`, kind: 'mate' });
    }
  }
  const hang = hangingPieces(g, me).sort((a, b) => VALUE[g.get(b)!.type] - VALUE[g.get(a)!.type]);
  for (const sq of hang) {
    const from = cheapestAttacker(g, sq, them);
    if (!from) continue;
    const by = NAME[g.get(from)!.type];
    out.push({ from, to: sq, text: `their ${by} attacks your ${NAME[g.get(sq)!.type]} on ${sq}`, kind: 'hanging' });
  }
  return out.slice(0, 3);
}

export interface MoveSafety {
  /** your pieces that are en prise after the move */
  hanging: Square[];
  /** of those, the ones this move put (or left) in danger that were fine before */
  newlyHanging: Square[];
  /** enemy piece → your piece it can take, for the newly hanging pieces */
  attackers: { from: Square; to: Square }[];
  /** SAN of a mate in one the move allows, or null */
  allowsMate: { san: string; from: Square; to: Square } | null;
  safe: boolean;
  /** one short sentence for the coach */
  text: string;
}

/** Blunder check for a move the user is about to commit. */
export function moveSafety(fenBefore: string, move: { from: string; to: string; promotion?: string }): MoveSafety {
  const before = new Chess(fenBefore);
  const me = before.turn();
  const them = other(me);
  const after = new Chess(fenBefore);
  const m = after.move(move);
  const res: MoveSafety = { hanging: [], newlyHanging: [], attackers: [], allowsMate: null, safe: true, text: '' };
  if (after.isGameOver()) return res;

  for (const r of after.moves({ verbose: true })) {
    if (!r.san.endsWith('#')) continue;
    res.allowsMate = { san: r.san, from: r.from, to: r.to };
    break;
  }
  const wasHanging = new Set(hangingPieces(before, me));
  res.hanging = hangingPieces(after, me);
  res.newlyHanging = res.hanging.filter((sq) => {
    if (sq === m.to) {
      // a fair or winning trade is not a blunder
      if (m.captured && VALUE[m.captured] >= VALUE[m.piece]) return false;
      return true;
    }
    return !wasHanging.has(sq);
  });
  for (const sq of res.newlyHanging) {
    const from = cheapestAttacker(after, sq, them);
    if (from) res.attackers.push({ from, to: sq });
  }
  res.safe = !res.allowsMate && res.newlyHanging.length === 0;
  if (res.allowsMate) res.text = `Careful! After this they can play ${res.allowsMate.san}: checkmate.`;
  else if (res.newlyHanging.length) {
    const sq = res.newlyHanging.sort((a, b) => VALUE[after.get(b)!.type] - VALUE[after.get(a)!.type])[0];
    res.text = `Your ${NAME[after.get(sq)!.type]} on ${sq} could be taken. Is it safe?`;
  } else res.text = 'Looks safe: nothing new left hanging.';
  return res;
}
