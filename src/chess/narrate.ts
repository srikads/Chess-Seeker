// Game Review copy + step-by-step narration for one move, chess.com style:
// one short coach line per move, a contextual "Show …" line to animate, and an
// "Explain step by step" walkthrough whose steps drive the board (moves, arrows, flashes, badges).
// Pure: no DOM. The board/coach consume the returned data.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import type { Mood, NarrationStep } from '../ui/coach';
import type { MoveClass } from './classify';
import { describeMove, hangingPieces, threatsOf } from './explain';
import { motifsOf, lineMotifs } from './motifs';
import { ruleOfThumb } from './coach';
import { NAME, VALUE } from './util';

export interface MomentInput {
  /** position before the move */
  fen: string;
  san: string;
  cls: MoveClass;
  /** the user made this move (always true when the user played both sides) */
  mine: boolean;
  /** the other side as the coach names it ("Ned", or "Black" when the user played both sides) */
  opp: string;
  /** engine best move + line (SAN) from `fen` */
  best?: string;
  bestPv: string[];
  /** engine best line (SAN) from the position after the move */
  replyPv: string[];
  /** the side that just moved can now be mated in this many moves */
  matedIn?: number | null;
  /** previous move of the game (SAN) and its from/to squares */
  prevSan?: string;
  prevLastMove?: [string, string];
}

export interface ShowLine {
  /** "Show Fork", "Show Lost Piece", "Show Checkmate", "Show Idea"… */
  label: string;
  /** play from the position before the move or after it */
  from: 'before' | 'after';
  sans: string[];
  /** said when the line starts and when it has finished */
  intro: string;
  outro: string;
}

export interface Moment {
  /** "Nf3 is a blunder" */
  title: string;
  /** one short sentence (two at most) */
  line: string;
  mood: Mood;
  /** arrows on the position after the move */
  arrows: DrawShape[];
  /** squares to flash red after the move (the piece in trouble) */
  flash: string[];
  show: ShowLine | null;
  /** the engine's best move from the position before (for the "Best" button) */
  best: { san: string; text: string } | null;
  /** a "Retry" challenge fits this moment: find a better move / punish / replay the great move */
  retry: 'better' | 'punish' | 'find' | null;
  tip: string | null;
}

export const ERRORS = new Set<MoveClass>(['inaccuracy', 'mistake', 'blunder']);
const GOOD_MOOD: Partial<Record<MoveClass, Mood>> = { brilliant: 'excited', great: 'excited', best: 'happy', excellent: 'happy', good: 'happy', book: 'happy' };

const shape = (from: string, to: string, brush: string): DrawShape => ({ orig: from as Key, dest: to as Key, brush });

function safeMove(fen: string, san: string | undefined): Move | null {
  if (!san) return null;
  try {
    return new Chess(fen).move(san);
  } catch {
    return null;
  }
}

function fenAfter(fen: string, sans: string[]): string {
  const g = new Chess(fen);
  for (const s of sans) {
    try {
      g.move(s);
    } catch {
      break;
    }
  }
  return g.fen();
}

/** "a blunder", "an inaccuracy", "best"… as used in "Nf3 is …". */
export function classPhrase(cls: MoveClass): string {
  switch (cls) {
    case 'brilliant':
      return 'brilliant';
    case 'great':
      return 'a great move';
    case 'best':
      return 'best';
    case 'excellent':
      return 'excellent';
    case 'good':
      return 'good';
    case 'book':
      return 'a book move';
    case 'inaccuracy':
      return 'an inaccuracy';
    default:
      return `a ${cls}`;
  }
}

export interface LineOutcome {
  kind: 'mate' | 'fork' | 'pin' | 'skewer' | 'discovered' | 'material' | 'none';
  /** the trimmed line that shows it */
  sans: string[];
  /** first move of the line */
  first: Move | null;
  /** the move that mates */
  mateSan?: string;
  /** most valuable piece the victim ends up losing (net), and where it was taken */
  lost?: PieceSymbol;
  lostSq?: Square;
  /** net material change for the victim, in pawns (negative = lost) */
  net: number;
}

/**
 * What a line does to `victim`: checkmate, or the material they lose (net, after recaptures), plus the tactic
 * behind its first move. The line is cut where the result is clear (at mate, or once the captures settle).
 */
export function lineOutcome(fen: string, sans: string[], victim: Color, maxPlies = 6): LineOutcome {
  const g = new Chess(fen);
  const moves: Move[] = [];
  for (const s of sans.slice(0, Math.max(maxPlies, 9))) {
    try {
      moves.push(g.move(s));
    } catch {
      break;
    }
    if (g.isCheckmate()) {
      const out = moves.map((m) => m.san);
      return { kind: 'mate', sans: out, first: moves[0] ?? null, mateSan: out[out.length - 1], net: 0 };
    }
  }
  const cut = moves.slice(0, maxPlies);
  // net for the victim at every "settled" prefix (the next move is not a capture)
  let net = 0;
  let bestK = 0;
  let bestNet = 0;
  const lostBy: { piece: PieceSymbol; sq: Square }[] = [];
  cut.forEach((m, k) => {
    const v = m.captured ? VALUE[m.captured] : 0;
    const promo = m.promotion ? VALUE[m.promotion] - 1 : 0;
    if (m.color === victim) net += v + promo;
    else {
      net -= v + promo;
      if (m.captured) lostBy.push({ piece: m.captured, sq: m.to });
    }
    const next = cut[k + 1];
    if (!next || !next.captured) {
      if (net < bestNet) {
        bestNet = net;
        bestK = k + 1;
      }
    }
  });
  const first = cut[0] ?? null;
  const line = cut.slice(0, Math.max(bestK, Math.min(2, cut.length))).map((m) => m.san);
  if (!first) return { kind: 'none', sans: [], first: null, net: 0 };
  const lost = lostBy.filter((_, i) => i < bestK).sort((a, b) => VALUE[b.piece] - VALUE[a.piece])[0];
  const ids = motifsOf(fen, first).map((m) => m.id);
  const big = bestNet <= -2;
  const kind: LineOutcome['kind'] = !big
    ? 'none'
    : ids.includes('fork')
      ? 'fork'
      : ids.includes('pin')
        ? 'pin'
        : ids.includes('skewer')
          ? 'skewer'
          : ids.includes('discovered') || ids.includes('double-check')
            ? 'discovered'
            : 'material';
  return { kind, sans: line, first, lost: big ? lost?.piece : undefined, lostSq: big ? lost?.sq : undefined, net: bestNet };
}

/** "the knight on e5" → "your knight on e5" for pieces of `you`. */
function personalise(text: string, fen: string, you: Color, theirs = 'their'): string {
  const g = new Chess(fen);
  return text.replace(/\bthe (pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/g, (_all, name: string, sq: Square) =>
    g.get(sq)?.color === you ? `your ${name} on ${sq}` : `${theirs} ${name} on ${sq}`,
  );
}

/** The main idea of a move in a few words ("develops the knight"), or ''. */
export function ideaOf(fen: string, san: string | undefined, you: Color): string {
  const m = safeMove(fen, san);
  if (!m) return '';
  const r = describeMove(fen, m).filter((x) => x !== 'improves the position');
  return r[0] ? personalise(r[0], fen, you) : '';
}

const pieceName = (p: PieceSymbol | undefined) => (p ? NAME[p] : 'piece');

function bestInfo(x: MomentInput, you: Color, whose: 'you' | 'opp'): Moment['best'] {
  if (!x.best || x.best === x.san) return null;
  const idea = ideaOf(x.fen, x.best, you);
  const lead = whose === 'you' ? `Best was ${x.best}.` : `${x.opp}'s best was ${x.best}.`;
  return { san: x.best, text: idea ? `${lead} It ${idea}.` : `${lead} It keeps the position under control.` };
}

/** Label for the "Show …" button, from what the line does. */
function showLabel(o: LineOutcome, victimIsYou: boolean): string {
  switch (o.kind) {
    case 'mate':
      return 'Show Checkmate';
    case 'fork':
      return 'Show Fork';
    case 'pin':
      return 'Show Pin';
    case 'skewer':
      return 'Show Skewer';
    case 'material':
      return victimIsYou ? 'Show Lost Piece' : 'Show Free Piece';
    case 'discovered':
      return victimIsYou ? 'Show Threat' : 'Show Idea';
    default:
      return victimIsYou ? 'Show Threat' : 'Show Idea';
  }
}

/** Closing line after a punishing line has played, for the victim ("you" or the opponent). */
function outcomeText(o: LineOutcome, victimIsYou: boolean): string {
  if (o.kind === 'mate') return o.sans.length === 1 ? `That's checkmate${victimIsYou ? '.' : '!'}` : `${o.mateSan} is checkmate${victimIsYou ? '.' : '!'}`;
  const p = pieceName(o.lost);
  const tactic = o.kind === 'fork' ? 'A fork! ' : o.kind === 'pin' ? 'A pin! ' : o.kind === 'skewer' ? 'A skewer! ' : o.kind === 'discovered' ? 'A discovered attack! ' : '';
  if (o.kind !== 'none') return victimIsYou ? `${tactic}You lose your ${p}.` : `${tactic}You win their ${p}.`;
  return victimIsYou ? 'Your position gets much harder.' : 'Your position gets much better.';
}

/** "Show Follow-Up": the engine line after the move, explained by what its first move does. */
function followUp(after: string, replyPv: string[], intro: string, you: Color): ShowLine {
  const idea = ideaOf(after, replyPv[0], you);
  return { label: 'Show Follow-Up', from: 'after', sans: replyPv.slice(0, 4), intro, outro: idea ? `It ${idea}.` : '' };
}

/** The one-line coach text and buttons for a move. */
export function describeMoment(x: MomentInput): Moment {
  const played = safeMove(x.fen, x.san);
  if (!played) return { title: x.san, line: '', mood: 'neutral', arrows: [], flash: [], show: null, best: null, retry: null, tip: null };
  const after = fenAfter(x.fen, [x.san]);
  const mover = played.color;
  const you: Color = x.mine ? mover : mover === 'w' ? 'b' : 'w';
  const title = `${x.san} is ${classPhrase(x.cls)}`;
  const piece = NAME[played.piece];
  const bestMove = safeMove(x.fen, x.best);
  const m: Moment = { title, line: '', mood: 'neutral', arrows: [], flash: [], show: null, best: null, retry: null, tip: null };

  if (x.mine && ERRORS.has(x.cls)) {
    // ---- your error: what it allows
    const o = lineOutcome(after, x.replyPv, mover);
    const reply = o.first;
    m.mood = x.cls === 'blunder' ? 'sad' : x.cls === 'mistake' ? 'worried' : 'thinking';
    const hangingAfter = hangingPieces(new Chess(after), mover);
    if (o.kind === 'mate' || (x.matedIn && x.matedIn > 0)) {
      m.line = o.kind === 'mate' && o.sans.length === 1 ? `It allows ${o.mateSan}, checkmate.` : `It lets ${x.opp} force checkmate.`;
    } else if (o.kind === 'fork') m.line = `It allows a fork with ${reply!.san}.`;
    else if (o.kind === 'pin') m.line = `It allows a pin with ${reply!.san}.`;
    else if (o.kind === 'skewer') m.line = `It allows a skewer with ${reply!.san}.`;
    else if (o.kind === 'discovered') m.line = `It allows a discovered attack with ${reply!.san}.`;
    else if (o.kind === 'material') {
      if (o.lostSq === played.to) m.line = `It hangs your ${piece}. ${x.opp} can take it.`;
      else if (o.lostSq && hangingAfter.includes(o.lostSq)) m.line = `It leaves your ${pieceName(o.lost)} on ${o.lostSq} undefended.`;
      else m.line = `${x.opp} wins your ${pieceName(o.lost)} with ${reply!.san}.`;
    } else if (x.cls === 'inaccuracy' && x.best) m.line = `It's a small slip. ${x.best} was better.`;
    else if (reply) m.line = `It gives ${x.opp} a strong reply: ${reply.san}.`;
    else m.line = x.best ? `${x.best} was better.` : 'It makes your position worse.';
    if (reply) m.arrows.push(shape(reply.from, reply.to, 'red'));
    if (bestMove) m.arrows.push(shape(bestMove.from, bestMove.to, 'green'));
    if (o.lostSq) m.flash.push(o.lostSq);
    if (o.sans.length)
      m.show = { label: showLabel(o, true), from: 'after', sans: o.sans, intro: `Watch what ${x.opp} can do.`, outro: outcomeText(o, true) };
    m.best = bestInfo(x, you, 'you');
    m.retry = x.best && x.best !== x.san ? 'better' : null;
    m.tip = ruleOfThumb(lineMotifs(after, o.sans), false);
    return m;
  }

  if (x.mine && x.cls === 'miss') {
    // ---- you missed a chance
    const o = lineOutcome(x.fen, x.bestPv, mover === 'w' ? 'b' : 'w');
    m.mood = 'worried';
    if (o.kind === 'mate') m.line = o.sans.length === 1 ? `You had checkmate with ${o.mateSan}!` : `You missed a forced checkmate, starting with ${x.best}.`;
    else if (o.kind === 'fork') m.line = `You missed a fork with ${x.best}.`;
    else if (o.kind !== 'none') m.line = `You missed ${x.best}, which wins their ${pieceName(o.lost)}.`;
    else m.line = x.best ? `You missed ${x.best}, a much stronger move.` : 'You let a big chance slip.';
    if (bestMove) m.arrows.push(shape(bestMove.from, bestMove.to, 'green'));
    if (o.sans.length) m.show = { label: o.kind === 'none' ? 'Show Idea' : showLabel(o, false), from: 'before', sans: o.sans, intro: `Here's what you could have played.`, outro: outcomeText(o, false) };
    m.best = bestInfo(x, you, 'you');
    m.retry = x.best ? 'punish' : null;
    m.tip = ruleOfThumb(lineMotifs(x.fen, o.sans), true);
    return m;
  }

  if (x.mine) {
    // ---- your good move
    m.mood = GOOD_MOOD[x.cls] ?? 'happy';
    const idea = ideaOf(x.fen, x.san, you);
    const ideaS = idea ? `It ${idea}.` : '';
    if (x.cls === 'brilliant') m.line = `You give up your ${piece}, and it works!`;
    else if (x.cls === 'great') m.line = `The only good move here. ${ideaS}`.trim();
    else if (x.cls === 'book') m.line = `A well-known opening move. ${ideaS}`.trim();
    else m.line = ideaS || (x.cls === 'best' ? 'The strongest move here.' : 'A solid move.');
    if ((x.cls === 'excellent' || x.cls === 'good') && bestMove) m.arrows.push(shape(bestMove.from, bestMove.to, 'paleGreen'));
    if (x.cls === 'brilliant' || x.cls === 'great') {
      const sans = x.bestPv[0] === x.san && x.bestPv.length > 1 ? x.bestPv.slice(0, 5) : [x.san, ...x.replyPv.slice(0, 4)];
      m.show = { label: 'Show Idea', from: 'before', sans, intro: `Here's the idea.`, outro: 'That is why it works.' };
      m.retry = 'find';
      m.tip = ruleOfThumb(motifsOf(x.fen, played), true);
    } else if (x.replyPv.length > 1)
      m.show = followUp(after, x.replyPv, `${x.opp}'s best answer is ${x.replyPv[0]}.`, you);
    m.best = bestInfo(x, you, 'you');
    return m;
  }

  if (ERRORS.has(x.cls)) {
    // ---- opponent's error = your chance
    const o = lineOutcome(after, x.replyPv, mover);
    const reply = o.first;
    m.mood = x.cls === 'inaccuracy' ? 'thinking' : 'excited';
    if (o.kind === 'mate') m.line = o.sans.length === 1 ? `Now you have ${o.mateSan}, checkmate!` : `Now you can force checkmate, starting with ${reply!.san}!`;
    else if (o.kind === 'fork') m.line = `You can fork with ${reply!.san}.`;
    else if (o.kind !== 'none' && o.lostSq === played.to) m.line = `It hangs their ${piece}. Take it with ${reply!.san}!`;
    else if (o.kind !== 'none') m.line = `You can win their ${pieceName(o.lost)} with ${reply!.san}.`;
    else if (reply) m.line = `It gives you a chance: ${reply.san}.`;
    else m.line = 'It gives you a chance.';
    if (reply) m.arrows.push(shape(reply.from, reply.to, 'green'));
    if (o.lostSq) m.flash.push(o.lostSq);
    if (o.sans.length) m.show = { label: showLabel(o, false), from: 'after', sans: o.sans, intro: 'Watch how you can punish it.', outro: outcomeText(o, false) };
    m.best = bestInfo(x, you, 'opp');
    m.retry = reply ? 'punish' : null;
    m.tip = ruleOfThumb(lineMotifs(after, o.sans), true);
    return m;
  }

  if (x.cls === 'miss') {
    // ---- opponent failed to punish you
    const o = lineOutcome(x.fen, x.bestPv, you);
    m.mood = 'happy';
    if (o.kind === 'mate') m.line = `Lucky! ${x.opp} missed a checkmate with ${x.best}.`;
    else if (o.kind !== 'none') m.line = `Lucky! ${x.opp} missed ${x.best}, which wins your ${pieceName(o.lost)}.`;
    else m.line = x.best ? `Lucky! ${x.opp} missed ${x.best}.` : `Lucky! ${x.opp} let you off the hook.`;
    if (bestMove) m.arrows.push(shape(bestMove.from, bestMove.to, 'red'));
    if (o.sans.length) m.show = { label: 'Show Threat', from: 'before', sans: o.sans, intro: `This is what ${x.opp} could have done.`, outro: outcomeText(o, true) };
    m.best = bestInfo(x, you, 'opp');
    m.tip = ruleOfThumb(lineMotifs(x.fen, o.sans), false);
    return m;
  }

  // ---- opponent's good move: what it does, and what to watch now
  m.mood = x.cls === 'brilliant' || x.cls === 'great' ? 'thinking' : 'neutral';
  const idea = ideaOf(x.fen, x.san, you);
  const threat = threatsOf(after)[0];
  const watch = threat && !(threat.kind === 'capture' && idea.includes(threat.to))
    ? threat.kind === 'mate'
      ? `Watch out: ${x.opp} threatens ${threat.san}, checkmate.`
      : `Watch out: your ${NAME[threat.piece!]} on ${threat.to} is under attack.`
    : '';
  const lead = x.cls === 'brilliant' || x.cls === 'great' ? `A strong move by ${x.opp}.` : idea ? `It ${idea}.` : `${x.opp} plays a solid move.`;
  m.line = [lead, watch].filter(Boolean).join(' ');
  if (threat) {
    m.arrows.push(shape(threat.from, threat.to, 'red'));
    m.flash.push(threat.to);
  }
  if (x.replyPv.length) m.show = followUp(after, x.replyPv, `Your best answer is ${x.replyPv[0]}.`, you);
  m.best = bestInfo(x, you, 'opp');
  return m;
}

/** Build the "Explain step by step" walkthrough for a move. Each step: one or two short sentences, synced to the board. */
export function narrateMoment(x: MomentInput, mo: Moment = describeMoment(x)): NarrationStep[] {
  const played = safeMove(x.fen, x.san);
  if (!played) return [];
  const steps: NarrationStep[] = [];
  const mover = played.color;
  const you: Color = x.mine ? mover : mover === 'w' ? 'b' : 'w';
  const after = fenAfter(x.fen, [x.san]);
  const badge = { sq: played.to, cls: x.cls };
  const bestMove = safeMove(x.fen, x.best);
  const isErr = ERRORS.has(x.cls);

  // 1. the position before the move, and what was going on
  const threats = threatsOf(x.fen);
  const t = threats[0];
  let intro: string;
  let introArrows: DrawShape[] | undefined;
  let introFlash: NarrationStep['flash'];
  if (x.mine && x.cls === 'miss') {
    const o = lineOutcome(x.fen, x.bestPv, mover === 'w' ? 'b' : 'w');
    intro = x.prevSan ? `${x.opp} just played ${x.prevSan}. That gave you a chance!` : `There's a big chance for you here.`;
    if (o.lostSq) introFlash = { squares: [o.lostSq], color: 'yellow' };
  } else if (x.mine) {
    if (t?.kind === 'mate') {
      intro = `It's your move. Careful: ${x.opp} threatens ${t.san}, checkmate.`;
      introArrows = [shape(t.from, t.to, 'red')];
    } else if (t) {
      intro = `It's your move. Your ${NAME[t.piece!]} on ${t.to} is under attack.`;
      introArrows = [shape(t.from, t.to, 'red')];
      introFlash = { squares: [t.to], color: 'red' };
    } else intro = `It's your move. Let's look at what you played.`;
  } else if (x.cls === 'miss') {
    intro = x.prevSan ? `Your ${x.prevSan} left a chance for ${x.opp}.` : `${x.opp} has a big chance here.`;
    const o = lineOutcome(x.fen, x.bestPv, you);
    if (o.lostSq) introFlash = { squares: [o.lostSq], color: 'red' };
  } else intro = `It's ${x.opp}'s move.`;
  steps.push({ text: intro, fen: x.fen, lastMove: x.prevLastMove, arrows: introArrows, flash: introFlash, mood: 'neutral' });

  // 2. the move itself, with its badge
  const who = x.mine ? 'You played' : `${x.opp} played`;
  steps.push({
    text: `${who} ${x.san}. ${mo.line}`,
    fen: x.fen,
    moves: [x.san],
    badge,
    flash: mo.flash.length ? { squares: mo.flash, color: x.mine || x.cls === 'miss' ? 'red' : 'yellow' } : undefined,
    mood: mo.mood,
  });

  // 3. what happens next: the punishment, the missed win, or the idea
  if (mo.show && mo.show.sans.length) {
    const first = mo.show.sans[0];
    const lead =
      x.mine && isErr
        ? `${x.opp} answers ${first}.`
        : x.mine && x.cls === 'miss'
          ? `${x.best} was the move.`
          : !x.mine && isErr
            ? `You answer ${first}.`
            : !x.mine && x.cls === 'miss'
              ? `${x.opp} could have played ${first}.`
              : mo.show.intro;
    steps.push({
      text: `${lead} ${mo.show.outro}`,
      fen: mo.show.from === 'before' ? x.fen : after,
      lastMove: mo.show.from === 'after' ? [played.from, played.to] : x.prevLastMove,
      moves: mo.show.sans,
      mood: x.mine && isErr ? 'sad' : x.mine && x.cls === 'miss' ? 'thinking' : 'happy',
    });
  }

  // 4. the better move
  if (bestMove && x.best !== x.san && (isErr || x.cls === 'miss') && !(x.mine && x.cls === 'miss')) {
    const idea = ideaOf(x.fen, x.best, you);
    const whose = x.mine ? 'Better was' : `${x.opp} should have played`;
    steps.push({
      text: `${whose} ${x.best}.${idea ? ` It ${idea}.` : ''}`,
      fen: x.fen,
      lastMove: x.prevLastMove,
      moves: [x.best!],
      arrows: [shape(bestMove.from, bestMove.to, 'green')],
      badge: { sq: bestMove.to, cls: 'best' },
      mood: 'happy',
    });
  }

  // 5. a rule of thumb to take away
  if (mo.tip && (isErr || x.cls === 'miss' || x.cls === 'brilliant' || x.cls === 'great')) steps.push({ text: `Tip: ${mo.tip}`, mood: 'neutral' });
  return steps;
}
