// Heuristic, plain-English explanations for moves. Stockfish tells us *what* is best;
// these helpers say *why* in a few beginner-friendly words ("wins the knight on e5 for free").
import { Chess, type Move, type Square, type Color, type PieceSymbol } from 'chess.js';
import { NAME, VALUE, SIDE, other, uciToMove, pvToSan, formatLine } from './util';

const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);
const label = (g: Chess, sq: Square) => {
  const p = g.get(sq);
  return p ? `${NAME[p.type]} on ${sq}` : sq;
};

/** Squares of `color` pieces that are en prise: attacked and undefended, or attacked by a cheaper piece. */
export function hangingPieces(g: Chess, color: Color): Square[] {
  const out: Square[] = [];
  for (const row of g.board())
    for (const p of row) {
      if (!p || p.color !== color || p.type === 'k') continue;
      const attackers = g.attackers(p.square, other(color));
      if (!attackers.length) continue;
      const defenders = g.attackers(p.square, color);
      const cheapest = Math.min(...attackers.map((s) => VALUE[g.get(s)!.type] || 100));
      if (!defenders.length || cheapest < VALUE[p.type]) out.push(p.square);
    }
  return out;
}

/** Enemy pieces (worth ≥3, or undefended) attacked by the piece on `sq`. */
export function attackedTargets(g: Chess, sq: Square): Square[] {
  const piece = g.get(sq);
  if (!piece) return [];
  const targets: Square[] = [];
  for (const row of g.board())
    for (const p of row) {
      if (!p || p.color === piece.color) continue;
      if (!g.attackers(p.square, piece.color).includes(sq)) continue;
      const defended = g.attackers(p.square, p.color).length > 0;
      if (p.type === 'k' || VALUE[p.type] > VALUE[piece.type] || !defended) targets.push(p.square);
    }
  return targets;
}

export interface Threat {
  kind: 'mate' | 'capture';
  /** the threatening move in SAN, as if the threatening side could move now */
  san: string;
  from: Square;
  to: Square;
  /** for captures: the piece that would be lost */
  piece?: PieceSymbol;
}

/** What the side NOT to move threatens right now (as if it were their turn): mates first, then captures. */
export function threatsOf(fen: string): Threat[] {
  const g = new Chess(fen);
  if (g.inCheck()) return [];
  const mover = g.turn();
  try {
    g.setTurn(other(mover));
  } catch {
    return [];
  }
  const out: Threat[] = [];
  const moves = g.moves({ verbose: true });
  for (const m of moves) {
    const t = new Chess(g.fen());
    t.move(m);
    if (t.isCheckmate()) out.push({ kind: 'mate', san: m.san, from: m.from, to: m.to });
  }
  const hanging = hangingPieces(g, mover).sort((a, b) => VALUE[g.get(b)!.type] - VALUE[g.get(a)!.type]);
  for (const sq of hanging) {
    // the cheapest piece that can take it
    const takes = moves.filter((m) => m.to === sq).sort((a, b) => VALUE[a.piece] - VALUE[b.piece]);
    if (takes[0]) out.push({ kind: 'capture', san: takes[0].san, from: takes[0].from, to: sq, piece: g.get(sq)!.type });
  }
  return out;
}

/** What does the side NOT to move threaten right now (if it were their move)? Short phrases. */
export function currentThreats(fen: string): string[] {
  const them = SIDE(other(new Chess(fen).turn()));
  const out = threatsOf(fen).map((t) => (t.kind === 'mate' ? `${them} threatens mate with ${t.san}` : `your ${NAME[t.piece!]} on ${t.to} is under attack`));
  return [...new Set(out)].slice(0, 3);
}

/** Describe a single move's ideas (without engine) in a few plain words, e.g. "wins the knight on e5 for free". */
export function describeMove(fenBefore: string, m: Move): string[] {
  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  after.move(m);
  const reasons: string[] = [];
  const who = m.color;
  const piece = NAME[m.piece];

  if (after.isCheckmate()) return ['is checkmate'];
  if (m.isKingsideCastle() || m.isQueensideCastle()) reasons.push('castles the king to safety');
  if (m.captured) {
    const recapturable = after.attackers(m.to, other(who)).length > 0;
    const gain = VALUE[m.captured] - (recapturable ? VALUE[m.piece] : 0);
    if (!recapturable) reasons.push(`wins the ${NAME[m.captured]} on ${m.to} for free`);
    else if (gain > 0) reasons.push(`takes the ${NAME[m.captured]} and comes out ahead`);
    else if (gain === 0) reasons.push(m.piece === m.captured ? `trades ${piece}s` : `trades ${piece} for ${NAME[m.captured]}`);
    else reasons.push(`captures on ${m.to}`);
  }
  if (m.promotion) reasons.push(`makes a new ${NAME[m.promotion]}`);

  const targets = attackedTargets(after, m.to).filter((s) => s !== m.to);
  const newTargets = targets.filter((s) => !(before.get(m.from) && before.attackers(s, who).includes(m.from)));
  if (targets.length >= 2 && m.piece !== 'k') {
    reasons.push(`forks the ${targets.map((s) => label(after, s)).join(' and the ')}`);
    if (after.inCheck()) reasons.push('gives check');
  } else if (after.inCheck()) reasons.push('gives check');
  else if (newTargets.length === 1) reasons.push(`attacks the ${label(after, newTargets[0])}`);

  // Discovered attack: a piece behind the mover now attacks something valuable.
  for (const row of after.board())
    for (const p of row) {
      if (!p || p.color !== who || p.square === m.to || !['b', 'r', 'q'].includes(p.type)) continue;
      const nowHits = attackedTargets(after, p.square).filter((s) => !before.attackers(s, who).includes(p.square));
      if (nowHits.length) reasons.push(`lets the ${NAME[p.type]} on ${p.square} hit the ${label(after, nowHits[0])} (a discovered attack)`);
    }

  // Rescue / defend
  const hangBefore = hangingPieces(before, who);
  const hangAfter = hangingPieces(after, who);
  if (hangBefore.length && hangAfter.length < hangBefore.length && !m.captured) {
    if (hangBefore.includes(m.from)) reasons.push(`saves the ${piece}`);
    else reasons.push(`protects the ${label(before, hangBefore[0])}`);
  }

  // Stops a mate threat
  const mateThreat = threatsOf(fenBefore).find((t) => t.kind === 'mate');
  if (mateThreat) {
    let stillMate = false;
    for (const mv of new Chess(after.fen()).moves({ verbose: true })) {
      const c = new Chess(after.fen());
      c.move(mv);
      if (c.isCheckmate()) stillMate = true;
    }
    if (!stillMate) reasons.push(`stops the mate threat ${mateThreat.san}`);
  }

  // Opening principles
  const moveNo = before.moveNumber();
  const backRank = who === 'w' ? '1' : '8';
  if (moveNo <= 12 && (m.piece === 'n' || m.piece === 'b') && m.from[1] === backRank && !m.captured) reasons.push(`develops the ${piece}`);
  if (CENTER.has(m.to) && m.piece === 'p' && moveNo <= 10) reasons.push('grabs the centre');
  else if (moveNo <= 12 && m.piece !== 'p' && m.piece !== 'k' && !m.captured && CENTER.has(m.to)) reasons.push('takes a central square');
  if (m.piece === 'r' && isOpenFile(after, m.to[0])) reasons.push(`puts the rook on the open ${m.to[0]}-file`);
  if (m.piece === 'p' && isPassed(after, m.to as Square, who)) reasons.push('pushes a passed pawn');

  if (!reasons.length) reasons.push('improves the position');
  return [...new Set(reasons)];
}

export function isOpenFile(g: Chess, file: string): boolean {
  for (let r = 1; r <= 8; r++) {
    const p = g.get(`${file}${r}` as Square);
    if (p && p.type === 'p') return false;
  }
  return true;
}

export function isPassed(g: Chess, sq: Square, color: Color): boolean {
  const f = sq.charCodeAt(0);
  const rank = Number(sq[1]);
  const dir = color === 'w' ? 1 : -1;
  for (let df = -1; df <= 1; df++) {
    const file = String.fromCharCode(f + df);
    if (file < 'a' || file > 'h') continue;
    for (let r = rank + dir; r >= 1 && r <= 8; r += dir) {
      const p = g.get(`${file}${r}` as Square);
      if (p && p.type === 'p' && p.color !== color) return false;
    }
  }
  return true;
}

/** Explain an engine-recommended move in one or two short sentences. */
export function explainBest(fen: string, bestUci: string, pv: string[] = []): string {
  const g = new Chess(fen);
  let m: Move;
  try {
    m = g.move(uciToMove(bestUci));
  } catch {
    return '';
  }
  const reasons = describeMove(fen, m).slice(0, 2);
  let text = `**${m.san}** ${reasons.join(' and ')}.`;
  const line = pvToSan(fen, pv.length ? pv : [bestUci], 4);
  if (line.length > 1) text += ` Then ${formatLine(fen, line)}.`;
  return text;
}

/**
 * Explain why a played move is a mistake, using the engine's best reply to it.
 * `replyPv` = engine PV (UCI) from the position AFTER the played move.
 */
export function explainMistake(fenBefore: string, played: Move, replyPv: string[], replyMate: number | null): string {
  const after = new Chess(fenBefore);
  after.move(played);
  const fenAfter = after.fen();
  if (replyMate !== null && replyMate > 0) {
    const line = pvToSan(fenAfter, replyPv, replyMate * 2 - 1);
    return replyMate === 1 && line[0] ? `It allows checkmate: **${line[0]}**.` : `It allows a forced mate in ${replyMate}: ${formatLine(fenAfter, line)}.`;
  }
  if (replyPv.length) {
    let reply: Move;
    try {
      reply = new Chess(fenAfter).move(uciToMove(replyPv[0]));
    } catch {
      return 'It gives away a big part of your advantage.';
    }
    if (reply.captured) return `The opponent answers **${reply.san}** and wins your ${NAME[reply.captured]}.`;
    const ideas = describeMove(fenAfter, reply).filter((r) => r !== 'improves the position');
    const hang = hangingPieces(after, played.color);
    const hangText = hang.length ? ` Your ${label(after, hang[0])} is left unprotected.` : '';
    return `The opponent answers **${reply.san}**${ideas.length ? `, which ${ideas[0]}` : ''}.${hangText}`;
  }
  return 'It gives away a big part of your advantage.';
}
