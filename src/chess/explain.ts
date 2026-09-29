// Heuristic, plain-English explanations for moves. Stockfish tells us *what* is best;
// these helpers try to say *why* in beginner-friendly words.
import { Chess, type Move, type Square, type Color } from 'chess.js';
import { NAME, VALUE, SIDE, other, uciToMove, pvToSan, formatLine } from './util';

const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);
const pieceAt = (g: Chess, sq: Square) => g.get(sq);
const label = (g: Chess, sq: Square) => {
  const p = pieceAt(g, sq);
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

/** What does the side NOT to move threaten right now (if it were their move)? */
export function currentThreats(fen: string): string[] {
  const g = new Chess(fen);
  if (g.inCheck()) return [];
  const mover = g.turn();
  try {
    g.setTurn(other(mover));
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const m of g.moves({ verbose: true })) {
    const t = new Chess(g.fen());
    t.move(m);
    if (t.isCheckmate()) out.push(`${SIDE(other(mover))} threatens mate with ${m.san}`);
  }
  for (const sq of hangingPieces(g, mover)) out.push(`your ${label(g, sq)} is under attack`);
  return [...new Set(out)].slice(0, 3);
}

/** Describe a single move's ideas (without engine), e.g. "captures the knight", "forks king and rook". */
export function describeMove(fenBefore: string, m: Move): string[] {
  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  after.move(m);
  const reasons: string[] = [];
  const who = m.color;
  const piece = NAME[m.piece];

  if (after.isCheckmate()) return ['It is checkmate!'];
  if (m.isKingsideCastle() || m.isQueensideCastle()) reasons.push('castles — the king gets safe and the rooks connect');
  if (m.captured) {
    const recapturable = after.attackers(m.to, other(who)).length > 0;
    const gain = VALUE[m.captured] - (recapturable ? VALUE[m.piece] : 0);
    if (!recapturable) reasons.push(`wins the ${NAME[m.captured]} on ${m.to} for free`);
    else if (gain > 0) reasons.push(`captures the ${NAME[m.captured]} — even if recaptured, ${SIDE(who)} comes out ahead`);
    else if (gain === 0) reasons.push(`trades ${piece} for ${NAME[m.captured]}`);
    else reasons.push(`captures on ${m.to}`);
  }
  if (m.promotion) reasons.push(`promotes the pawn to a ${NAME[m.promotion]}`);
  if (after.inCheck()) reasons.push('gives check, so the opponent must respond to it');

  const targets = attackedTargets(after, m.to).filter((s) => s !== m.to);
  const newTargets = targets.filter((s) => !(before.get(m.from) && before.attackers(s, who).includes(m.from)));
  if (targets.length >= 2 && m.piece !== 'k') {
    reasons.push(`attacks two things at once (${targets.map((s) => label(after, s)).join(' and ')}) — a fork`);
  } else if (newTargets.length === 1 && !after.inCheck()) {
    reasons.push(`attacks the ${label(after, newTargets[0])}`);
  }

  // Discovered attack: a piece behind the mover now attacks something valuable.
  for (const row of after.board())
    for (const p of row) {
      if (!p || p.color !== who || p.square === m.to || !['b', 'r', 'q'].includes(p.type)) continue;
      const nowHits = attackedTargets(after, p.square).filter((s) => {
        const was = before.attackers(s, who).includes(p.square);
        return !was;
      });
      if (nowHits.length) {
        reasons.push(`uncovers the ${NAME[p.type]} on ${p.square}, which now attacks the ${label(after, nowHits[0])} (discovered attack)`);
      }
    }

  // Rescue / defend
  const hangBefore = hangingPieces(before, who);
  const hangAfter = hangingPieces(after, who);
  if (hangBefore.length && hangAfter.length < hangBefore.length && !m.captured) {
    if (hangBefore.includes(m.from)) reasons.push(`moves the ${piece} out of danger`);
    else reasons.push(`protects the ${label(before, hangBefore[0])}`);
  }

  // Stops a mate threat
  const threatsBefore = currentThreats(fenBefore).filter((t) => t.includes('mate'));
  if (threatsBefore.length) {
    const t = new Chess(after.fen());
    let stillMate = false;
    for (const mv of t.moves({ verbose: true })) {
      const c = new Chess(after.fen());
      c.move(mv);
      if (c.isCheckmate()) stillMate = true;
    }
    if (!stillMate) reasons.push(`stops the threat (${threatsBefore[0].replace(/^\w+ threatens /, '')})`);
  }

  // Opening principles
  const moveNo = before.moveNumber();
  const backRank = who === 'w' ? '1' : '8';
  if (moveNo <= 12 && (m.piece === 'n' || m.piece === 'b') && m.from[1] === backRank && !m.captured)
    reasons.push(`develops the ${piece} toward the centre`);
  if (CENTER.has(m.to) && m.piece === 'p' && moveNo <= 10) reasons.push('grabs space in the centre');
  else if (moveNo <= 12 && m.piece !== 'p' && m.piece !== 'k' && !m.captured && CENTER.has(m.to)) reasons.push('occupies a central square');
  if (m.piece === 'r' && isOpenFile(after, m.to[0])) reasons.push(`puts the rook on the open ${m.to[0]}-file`);
  if (m.piece === 'p' && isPassed(after, m.to as Square, who)) reasons.push('pushes a passed pawn — nothing can block it with a pawn');

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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Explain an engine-recommended move plus its main line. */
export function explainBest(fen: string, bestUci: string, pv: string[] = []): string {
  const g = new Chess(fen);
  let m: Move;
  try {
    m = g.move(uciToMove(bestUci));
  } catch {
    return '';
  }
  const reasons = describeMove(fen, m);
  let text = `**${m.san}** ${reasons.join('; ')}.`;
  const line = pvToSan(fen, pv.length ? pv : [bestUci], 6);
  if (line.length > 1) text += ` A likely continuation: ${formatLine(fen, line)}.`;
  return cap(text.replace(/^\*\*(.+?)\*\* /, '**$1** '));
}

/**
 * Explain why a played move is a mistake, using the engine's best reply to it.
 * `replyPv` = engine PV (UCI) from the position AFTER the played move.
 */
export function explainMistake(fenBefore: string, played: Move, replyPv: string[], replyMate: number | null): string {
  const after = new Chess(fenBefore);
  after.move(played);
  const fenAfter = after.fen();
  const parts: string[] = [];
  if (replyMate !== null && replyMate > 0) {
    const line = pvToSan(fenAfter, replyPv, replyMate * 2 - 1);
    parts.push(`it allows a forced checkmate in ${replyMate}: ${formatLine(fenAfter, line)}`);
  } else if (replyPv.length) {
    const reply = after.move(uciToMove(replyPv[0]));
    if (reply.captured) {
      parts.push(`the opponent answers **${reply.san}** and wins your ${NAME[reply.captured]}`);
    } else {
      const ideas = describeMove(fenAfter, reply).filter((r) => r !== 'improves the position');
      parts.push(`the opponent answers **${reply.san}**${ideas.length ? `, which ${ideas[0]}` : ''}`);
    }
  }
  const hang = hangingPieces(new Chess(fenAfter), played.color);
  if (hang.length && !(replyMate !== null && replyMate > 0) && !parts.some((p) => p.includes('wins your'))) parts.push(`your ${label(new Chess(fenAfter), hang[0])} is left unprotected`);
  return parts.length ? cap(parts.join('; ')) + '.' : 'It gives away a big part of your advantage.';
}
