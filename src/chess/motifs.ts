// Detects the chess technique behind a move and links it to the lesson that teaches it.
import { Chess, type Move, type Square, type Color } from 'chess.js';
import { attackedTargets, hangingPieces, isOpenFile, isPassed } from './explain';
import { VALUE, other } from './util';
import { isSacrifice } from './classify';

export interface Motif {
  id: string;
  label: string;
  /** lesson id that teaches it */
  lesson: string;
}

const M = {
  backRank: { id: 'back-rank', label: 'Back-rank mate', lesson: 'back-rank-mate' },
  smothered: { id: 'smothered', label: 'Smothered mate', lesson: 'mating-patterns' },
  mate: { id: 'mate', label: 'Mating pattern', lesson: 'mating-patterns' },
  doubleCheck: { id: 'double-check', label: 'Double check', lesson: 'double-check' },
  discovered: { id: 'discovered', label: 'Discovered attack', lesson: 'discovered-attack' },
  fork: { id: 'fork', label: 'Fork', lesson: 'fork' },
  pin: { id: 'pin', label: 'Pin', lesson: 'pin' },
  skewer: { id: 'skewer', label: 'Skewer', lesson: 'skewer' },
  removeDefender: { id: 'remove-defender', label: 'Removing the defender', lesson: 'removing-the-defender' },
  sacrifice: { id: 'sacrifice', label: 'Sacrifice / decoy', lesson: 'deflection-decoy' },
  freePiece: { id: 'free-piece', label: 'Winning a hanging piece', lesson: 'hanging-pieces' },
  castle: { id: 'castle', label: 'King safety', lesson: 'king-safety-castling' },
  develop: { id: 'develop', label: 'Development', lesson: 'develop-your-pieces' },
  centre: { id: 'centre', label: 'Centre control', lesson: 'control-the-centre' },
  earlyQueen: { id: 'early-queen', label: 'Early queen move', lesson: 'queen-out-early' },
  openFile: { id: 'open-file', label: 'Rook on an open file', lesson: 'rooks-open-files' },
  passed: { id: 'passed', label: 'Passed pawn', lesson: 'pawn-structure-basics' },
  rookBehind: { id: 'rook-behind', label: 'Rook behind the passed pawn', lesson: 'rook-behind-passer' },
  promotion: { id: 'promotion', label: 'Pawn promotion', lesson: 'king-pawn-vs-king' },
  activeKing: { id: 'active-king', label: 'Active king in the endgame', lesson: 'active-king-outside-passer' },
} satisfies Record<string, Motif>;

const DIRS: Record<string, [number, number][]> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
};

const sqAt = (f: number, r: number) => (f >= 0 && f < 8 && r >= 0 && r < 8 ? (`${'abcdefgh'[f]}${r + 1}` as Square) : null);

/** Pins and skewers created by a line piece on `sq`. */
function lineTactics(g: Chess, sq: Square): Motif[] {
  const p = g.get(sq);
  if (!p || !DIRS[p.type]) return [];
  const out: Motif[] = [];
  const f0 = sq.charCodeAt(0) - 97;
  const r0 = Number(sq[1]) - 1;
  for (const [df, dr] of DIRS[p.type]) {
    const hits: { sq: Square; type: string; color: Color }[] = [];
    for (let k = 1; k < 8 && hits.length < 2; k++) {
      const s = sqAt(f0 + df * k, r0 + dr * k);
      if (!s) break;
      const q = g.get(s);
      if (q) hits.push({ sq: s, type: q.type, color: q.color });
    }
    if (hits.length < 2 || hits[0].color === p.color || hits[1].color === p.color) continue;
    const front = hits[0].type === 'k' ? 100 : VALUE[hits[0].type as 'p'];
    const back = hits[1].type === 'k' ? 100 : VALUE[hits[1].type as 'p'];
    if (hits[0].type === 'p') continue;
    if (back > front && front >= 3) out.push(M.pin);
    else if (front > back && back >= 3 && front > VALUE[p.type]) out.push(M.skewer);
  }
  return out;
}

function isEndgame(g: Chess): boolean {
  let pieces = 0;
  let queens = 0;
  for (const row of g.board()) for (const p of row) if (p && p.type !== 'k' && p.type !== 'p') (pieces++, p.type === 'q' && queens++);
  return queens === 0 ? pieces <= 4 : pieces <= 2;
}

/** Techniques visible in a move, most instructive first (max 3). */
export function motifsOf(fenBefore: string, m: Move): Motif[] {
  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  after.move(m);
  const me = m.color;
  const out: Motif[] = [];

  if (after.isCheckmate()) {
    const k = after.findPiece({ type: 'k', color: other(me) })[0];
    const backRank = k && (k[1] === '1' || k[1] === '8') && (m.piece === 'r' || m.piece === 'q') && m.to[1] === k[1];
    if (m.piece === 'n' && k && isSmothered(after, k)) out.push(M.smothered);
    else if (backRank) out.push(M.backRank);
    else out.push(M.mate);
  }
  if (after.inCheck()) {
    const k = after.findPiece({ type: 'k', color: other(me) })[0];
    if (k && after.attackers(k, me).length >= 2) out.push(M.doubleCheck);
  }
  // discovered attack: a line piece behind the mover now hits something valuable
  for (const row of after.board())
    for (const p of row) {
      if (!p || p.color !== me || p.square === m.to || !DIRS[p.type]) continue;
      if (attackedTargets(after, p.square).some((s) => !before.attackers(s, me).includes(p.square))) {
        out.push(M.discovered);
        break;
      }
    }
  if (m.piece !== 'k' && attackedTargets(after, m.to).length >= 2) out.push(M.fork);
  out.push(...lineTactics(after, m.to));
  if (isSacrifice(fenBefore, m)) out.push(M.sacrifice);
  if (m.captured) {
    const hangBefore = hangingPieces(before, other(me));
    if (hangBefore.includes(m.to)) out.push(M.freePiece);
    // capturing a defender leaves another enemy piece hanging
    const newlyHanging = hangingPieces(after, other(me)).filter((s) => !hangBefore.includes(s));
    if (newlyHanging.length) out.push(M.removeDefender);
  }
  if (m.promotion) out.push(M.promotion);
  if (m.isKingsideCastle() || m.isQueensideCastle()) out.push(M.castle);

  const moveNo = before.moveNumber();
  if (moveNo <= 10) {
    const back = me === 'w' ? '1' : '8';
    if ((m.piece === 'n' || m.piece === 'b') && m.from[1] === back) out.push(M.develop);
    if (m.piece === 'p' && ['d4', 'e4', 'd5', 'e5', 'c4', 'c5'].includes(m.to)) out.push(M.centre);
    if (m.piece === 'q' && moveNo <= 6 && !m.captured && !after.inCheck()) out.push(M.earlyQueen);
  }
  if (m.piece === 'r' && m.from[0] !== m.to[0] && isOpenFile(after, m.to[0])) out.push(M.openFile);
  const endgame = isEndgame(after);
  if (m.piece === 'p' && !m.promotion && isPassed(after, m.to as Square, me)) {
    const rookBehind = endgame && rookBehindPawn(after, m.to as Square, me);
    out.push(rookBehind ? M.rookBehind : M.passed);
  }
  if (m.piece === 'k' && endgame && !m.captured) {
    const centreDist = (s: string) => Math.abs(s.charCodeAt(0) - 100.5) + Math.abs(Number(s[1]) - 4.5);
    if (centreDist(m.to) < centreDist(m.from)) out.push(M.activeKing);
  }
  const seen = new Set<string>();
  return out.filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, 3);
}

function rookBehindPawn(g: Chess, sq: Square, color: Color): boolean {
  const dir = color === 'w' ? -1 : 1;
  for (let r = Number(sq[1]) + dir; r >= 1 && r <= 8; r += dir) {
    const p = g.get(`${sq[0]}${r}` as Square);
    if (p) return p.type === 'r' && p.color === color;
  }
  return false;
}

/** Techniques used by one side across a line (SAN), e.g. the moves of a refutation. */
export function lineMotifs(fen: string, sans: string[], everyOther = true): Motif[] {
  const g = new Chess(fen);
  const out: Motif[] = [];
  sans.forEach((san, k) => {
    const before = g.fen();
    let m: Move;
    try {
      m = g.move(san);
    } catch {
      return;
    }
    if (!everyOther || k % 2 === 0) out.push(...motifsOf(before, m));
  });
  const seen = new Set<string>();
  return out.filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, 3);
}

/** Every square around the king is blocked by its own pieces. */
function isSmothered(g: Chess, k: Square): boolean {
  const color = g.get(k)!.color;
  const f0 = k.charCodeAt(0) - 97;
  const r0 = Number(k[1]) - 1;
  for (let df = -1; df <= 1; df++)
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const s = sqAt(f0 + df, r0 + dr);
      if (!s) continue;
      const p = g.get(s);
      if (!p || p.color !== color) return false;
    }
  return true;
}
