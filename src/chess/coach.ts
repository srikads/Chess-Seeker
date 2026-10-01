// Review coaching text that always speaks to the user ("you"), whoever made the move.
// review.ts supplies the engine facts; this module turns them into short, plain-English cards.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { describeMove, currentThreats, hangingPieces } from './explain';
import { motifsOf, lineMotifs, type Motif } from './motifs';
import { NAME, formatLine } from './util';
import type { MoveClass } from './classify';

export interface CoachInput {
  /** position before the move */
  fen: string;
  san: string;
  cls: MoveClass;
  /** the move was made by the user (always true when the user played both sides) */
  mine: boolean;
  /** how to call the other side in prose, e.g. "Knightly Ned" or "White" */
  opp: string;
  /** engine best move and line (SAN) from `fen` */
  best?: string;
  bestPv: string[];
  /** engine best line (SAN) from the position after the move — the reply to it */
  replyPv: string[];
  /** the side that just moved can now be mated in this many moves */
  matedIn?: number | null;
  /** the move before this one (needed for "miss") */
  prevSan?: string;
}

export interface CoachSection {
  icon: string;
  title: string;
  text: string;
}

export interface CoachCard {
  /** one or two sentences, always shown */
  headline: string;
  /** short labelled sections: what was missed, the better move, a rule of thumb */
  sections: CoachSection[];
  /** a line to animate on the board: from the position after the move ('reply') or before it ('best') */
  replay?: { from: 'reply' | 'best'; label: string; sans: string[] };
  /** second, optional replay */
  replay2?: { from: 'reply' | 'best'; label: string; sans: string[] };
}

const ERRORS = new Set<MoveClass>(['inaccuracy', 'mistake', 'blunder']);
const TRIVIAL = 'improves the position';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const article = (cls: MoveClass) => (cls === 'inaccuracy' ? 'an inaccuracy' : `a ${cls}`);

/** Strip a trailing rating: "Knightly Ned (600)" → "Knightly Ned". */
export function displayName(name: string): string {
  return name.replace(/\s*\(\d+\)\s*$/, '').trim() || name;
}

function safeMove(fen: string, san: string): Move | null {
  try {
    return new Chess(fen).move(san);
  } catch {
    return null;
  }
}

function afterFen(fen: string, san: string): string {
  const g = new Chess(fen);
  g.move(san);
  return g.fen();
}

/** "the knight on h4" → "your knight on h4" when that piece belongs to `you` in position `fen`. */
function personalise(text: string, fen: string, you: Color): string {
  const g = new Chess(fen);
  return text.replace(/\bthe (pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/g, (all, name: string, sq: Square) =>
    g.get(sq)?.color === you ? `your ${name} on ${sq}` : all,
  );
}

/** The main idea of a move in a few words, or ''. Pieces owned by `you` are called "your …". */
function ideaOf(fen: string, san: string | undefined, you: Color): string {
  if (!san) return '';
  const m = safeMove(fen, san);
  if (!m) return '';
  const r = describeMove(fen, m).filter((x) => x !== TRIVIAL);
  return r[0] ? personalise(r[0], fen, you) : '';
}

/** "**O-O** — it castles…" style clause, or just the move. */
const withIdea = (san: string, idea: string) => (idea ? `**${san}** — it ${idea}` : `**${san}**`);

// ---------------------------------------------------------------- rules of thumb

/** Advice when a technique was used AGAINST the user. */
const DEFEND: Record<string, string> = {
  'free-piece': 'Blunder check before every move: after it, can any of your pieces be taken for free?',
  fork: 'Look for squares where one enemy piece could hit two of yours at once — knight jumps and queen moves especially.',
  pin: 'Don’t line up your king or queen behind another piece on a file, rank or diagonal the opponent can use.',
  skewer: 'Keep your valuable pieces off the same line — a skewer hits the front piece and wins the one behind it.',
  discovered:
    'Watch the lines: when an enemy queen, rook or bishop points at one of your pieces with only a piece or pawn in between, moving that piece or pawn can unleash an attack.',
  'double-check': 'A double check can only be met by moving the king — be careful when two enemy pieces aim at your king.',
  'back-rank': 'Give your king some air (a pawn move like h3) so a rook or queen can’t mate it on the back rank.',
  mate: 'Check every check your opponent could give after your move — one of them may be mate.',
  smothered: 'A king boxed in by its own pieces is vulnerable to knight checks — keep an escape square.',
  'remove-defender': 'Count attackers and defenders: if a defender can be captured or chased away, what it guards may fall.',
  sacrifice: 'When your opponent offers material, ask why before you take it — look at what happens after the capture.',
  passed: 'Stop passed pawns early — put a piece directly in front of them.',
  'rook-behind': 'Stop passed pawns early — put a piece directly in front of them.',
  promotion: 'Stop passed pawns early — put a piece directly in front of them.',
};

/** Advice when the technique was (or could have been) used BY the user. */
const ATTACK: Record<string, string> = {
  'free-piece': 'After every opponent move, ask: did it leave anything undefended? Free material is the easiest win.',
  fork: 'Look for squares where one of your pieces attacks two targets at once.',
  pin: 'A pinned piece can’t safely move — attack it again with more pieces.',
  skewer: 'Line up on two valuable pieces: attack the front one and win the one behind.',
  discovered: 'Look for your queen, rook or bishop hiding behind one of your own pieces — moving it can unleash a double threat.',
  'double-check': 'Double check forces the king to move — it’s often the strongest check on the board.',
  'back-rank': 'Is the enemy king stuck on the back rank with no escape square? Look for a rook or queen check there.',
  mate: 'Checks first: always look at every check you can give — one of them may be mate.',
  smothered: 'A king boxed in by its own pieces can be mated by a knight check.',
  'remove-defender': 'Capture or chase away the defender, then take what it was guarding.',
  sacrifice: 'Material is only one factor — giving something up can pay off if it wins more or mates.',
  castle: 'Castle early: it tucks your king away and connects your rooks.',
  develop: 'In the opening, bring out your knights and bishops before moving the same piece twice.',
  centre: 'Pawns in the centre (e4/d4 or e5/d5) give your pieces room and control key squares.',
  'open-file': 'Rooks belong on open files, where no pawns block them.',
  passed: 'Passed pawns must be pushed — each step makes them more dangerous.',
  'rook-behind': 'Rooks belong behind passed pawns — yours or your opponent’s.',
  'active-king': 'In the endgame the king is a fighting piece — bring it towards the centre.',
  promotion: 'Passed pawns must be pushed — each step makes them more dangerous.',
};

const GENERIC_DEFEND = 'Before every move, ask: what are my opponent’s checks, captures and threats after it?';
const GENERIC_ATTACK = 'After every opponent move, ask: what did it change — what is now undefended or attacked?';

/** Opening/positional ideas — good for praising a move, too vague to explain a tactical swing. */
const POSITIONAL = new Set(['castle', 'develop', 'centre', 'open-file', 'active-king', 'early-queen']);

function ruleFrom(motifs: Motif[], table: Record<string, string>, tacticsOnly = true): string | null {
  for (const m of motifs) if (table[m.id] && !(tacticsOnly && POSITIONAL.has(m.id))) return table[m.id];
  return null;
}

/** Habits visible in the played move itself (e.g. knight to the rim, early queen). */
function habitRule(fen: string, m: Move): string | null {
  if (m.piece === 'n' && 'ah'.includes(m.to[0]) && !m.captured) return 'Knights on the rim are dim: a knight on the edge controls few squares and is easy to attack.';
  if (motifsOf(fen, m).some((x) => x.id === 'early-queen')) return 'Don’t bring the queen out too early — it becomes a target and you lose time chasing it back.';
  return null;
}

// ---------------------------------------------------------------- the card

/** Explain the opponent's best reply to a move, as seen by the player who has to face it. */
function threatText(fenAfter: string, replyPv: string[], matedIn: number | null | undefined, whoReplies: string, victimIsYou: boolean, you: Color): string | null {
  if (matedIn && matedIn > 0) {
    return `${cap(whoReplies)} ${whoReplies === 'you' ? 'have' : 'has'} a forced checkmate in ${matedIn}: ${formatLine(fenAfter, replyPv.slice(0, matedIn * 2 - 1))}.`;
  }
  const reply = replyPv[0] ? safeMove(fenAfter, replyPv[0]) : null;
  if (!reply) return null;
  const your = victimIsYou ? 'your' : 'their';
  if (reply.captured) {
    const g = new Chess(fenAfter);
    g.move(reply);
    const recapture = g.attackers(reply.to, reply.color === 'w' ? 'b' : 'w').length > 0;
    return `${cap(whoReplies)} can play **${reply.san}** and take ${your} ${NAME[reply.captured]} on ${reply.to}${recapture ? '' : ' for free'}.`;
  }
  const idea = ideaOf(fenAfter, reply.san, you);
  return `${cap(whoReplies)} can play **${reply.san}**${idea ? ` — it ${idea}` : ''}.`;
}

export function coachCard(x: CoachInput): CoachCard {
  const played = new Chess(x.fen).move(x.san);
  const fenAfter = afterFen(x.fen, x.san);
  // "you" = the user; when the user played both sides, the side that just moved
  const you: Color = x.mine ? played.color : played.color === 'w' ? 'b' : 'w';
  const playedIdea = ideaOf(x.fen, x.san, you);
  const bestIdea = x.best && x.best !== x.san ? ideaOf(x.fen, x.best, you) : '';
  const opp = x.opp;
  const sections: CoachSection[] = [];
  const card: CoachCard = { headline: '', sections };
  const replyLine = x.replyPv.slice(0, 6);
  const bestLine = x.bestPv.slice(0, 6);

  if (x.mine && ERRORS.has(x.cls)) {
    // ---- your error
    const threat = threatText(fenAfter, x.replyPv, x.matedIn, opp, true, you);
    card.headline = `**${x.san}** is ${article(x.cls)}${x.cls === 'inaccuracy' ? ' — a small slip' : ''}.${threat ? ` ${threat}` : ''}`;
    const replyTo = x.replyPv[0] ? safeMove(fenAfter, x.replyPv[0])?.to : undefined;
    const hanging = hangingPieces(new Chess(fenAfter), played.color).filter((s) => s !== replyTo);
    if (hanging.length && !x.matedIn) {
      const p = new Chess(fenAfter).get(hanging[0]);
      if (p) sections.push({ icon: '🔍', title: 'What you missed', text: `After ${x.san}, your ${NAME[p.type]} on ${hanging[0]} is left unprotected.` });
    }
    if (x.best && x.best !== x.san) sections.push({ icon: '✅', title: 'Better', text: `${withIdea(x.best, bestIdea)}.` });
    const rule = ruleFrom(lineMotifs(fenAfter, x.replyPv.slice(0, 5)), DEFEND) ?? habitRule(x.fen, played) ?? (x.best ? ruleFrom(lineMotifs(x.fen, [x.best]), ATTACK) : null) ?? GENERIC_DEFEND;
    sections.push({ icon: '💡', title: 'Rule of thumb', text: rule });
    if (replyLine.length) card.replay = { from: 'reply', label: '▶ Show the punishment', sans: replyLine };
    if (bestLine.length && x.best !== x.san) card.replay2 = { from: 'best', label: '▶ Show the better line', sans: bestLine };
    return card;
  }

  if (x.mine && x.cls === 'miss') {
    // ---- you missed a chance the opponent gave you
    card.headline = x.prevSan
      ? `${opp}’s **${x.prevSan}** was a mistake, but **${x.san}** let the chance slip.`
      : `**${x.san}** lets a big chance slip.`;
    if (x.best) sections.push({ icon: '🎯', title: 'What you missed', text: `${withIdea(x.best, bestIdea)}.` });
    sections.push({ icon: '💡', title: 'Rule of thumb', text: (x.best ? ruleFrom(lineMotifs(x.fen, x.bestPv.slice(0, 5)), ATTACK) : null) ?? GENERIC_ATTACK });
    if (bestLine.length) card.replay = { from: 'best', label: '▶ Show what you missed', sans: bestLine };
    return card;
  }

  if (x.mine) {
    // ---- your good move
    const lead: Partial<Record<MoveClass, string>> = {
      brilliant: `**Brilliant!** ${x.san} gives up the ${NAME[played.piece]} on ${played.to} — and it works.`,
      great: `**Great move — the only good one here.**`,
      best: `**Best move.**`,
      excellent: `**Excellent.**`,
      good: `**Good move.**`,
      book: `**Book move** — standard opening play.`,
    };
    card.headline = `${lead[x.cls] ?? ''} ${playedIdea ? `${x.san} ${playedIdea}.` : ''}`.trim();
    if (x.best && x.best !== x.san && (x.cls === 'excellent' || x.cls === 'good')) sections.push({ icon: '⭐', title: 'Slightly stronger', text: `${withIdea(x.best, bestIdea)}.` });
    const rule = ruleFrom(motifsOf(x.fen, played), ATTACK, false);
    if (rule && x.cls !== 'book') sections.push({ icon: '💡', title: 'Why this works', text: rule });
    if (bestLine.length > 1 && x.cls === 'brilliant') card.replay = { from: 'best', label: '▶ Show the idea', sans: bestLine };
    return card;
  }

  if (ERRORS.has(x.cls)) {
    // ---- opponent's error = your chance
    card.headline = `${opp}’s **${x.san}** is ${article(x.cls)} — ${x.cls === 'inaccuracy' ? 'a small chance for you.' : 'a chance for you!'}`;
    const chance = threatText(fenAfter, x.replyPv, x.matedIn, 'you', false, you);
    if (chance) sections.push({ icon: '🎁', title: 'Your chance', text: chance });
    sections.push({ icon: '💡', title: 'Rule of thumb', text: ruleFrom(lineMotifs(fenAfter, x.replyPv.slice(0, 5)), ATTACK) ?? GENERIC_ATTACK });
    if (replyLine.length) card.replay = { from: 'reply', label: '▶ Show how to punish it', sans: replyLine };
    return card;
  }

  if (x.cls === 'miss') {
    // ---- opponent failed to punish YOUR previous mistake
    card.headline = x.prevSan
      ? `😅 You got away with one. Your **${x.prevSan}** could have been punished, but ${opp} played **${x.san}** instead.`
      : `${opp} missed a chance with **${x.san}**.`;
    if (x.best) sections.push({ icon: '🔍', title: 'What you risked', text: `${opp} could have played ${withIdea(x.best, bestIdea)}.` });
    sections.push({ icon: '💡', title: 'Rule of thumb', text: (x.best ? ruleFrom(lineMotifs(x.fen, x.bestPv.slice(0, 5)), DEFEND) : null) ?? GENERIC_DEFEND });
    if (bestLine.length) card.replay = { from: 'best', label: '▶ Show what they missed', sans: bestLine };
    return card;
  }

  // ---- opponent's good move: what it does, and what you should watch now
  const strong = x.cls === 'brilliant' || x.cls === 'great';
  card.headline = `${strong ? `Strong move by ${opp}. ` : ''}${opp} played **${x.san}**${playedIdea ? ` — it ${playedIdea}` : ''}.`;
  const threats = currentThreats(fenAfter);
  if (threats.length) sections.push({ icon: '👀', title: 'Watch out', text: `${cap(threats[0])}.` });
  if (strong) {
    const rule = ruleFrom(motifsOf(x.fen, played), DEFEND);
    if (rule) sections.push({ icon: '💡', title: 'Rule of thumb', text: rule });
  }
  return card;
}
