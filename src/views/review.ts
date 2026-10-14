// Game Review, chess.com style: a report card first (accuracy, game rating, phase grades, move counts,
// eval graph), then a move-by-move review where the coach says one short line per move, the class badge
// sits on the board, arrows draw in, and "Show …", "Best", "Retry" and "Explain step by step" animate
// the ideas on the board in sync with the words.
import { Chess } from 'chess.js';
import { h, toast } from '../ui/dom';
import { BoardView, arrow } from '../ui/board';
import { playSound } from '../ui/sound';
import { Coach, type CoachAction } from '../ui/coach';
import { classBadge, CLASS_STYLE, icon } from '../ui/icons';
import { PlayerCard, MoveList, EvalBar, materialFromFen } from '../ui/widgets';
import { userAvatar } from '../ui/avatars';
import { engine, scoreNum, winPct, fmtEval } from '../engine/engine';
import { BOTS } from '../engine/bots';
import { displayName } from '../chess/coach';
import { performance, ratingInName } from '../chess/performance';
import { classifyMove, isSacrifice, moveAccuracy } from '../chess/classify';
import { motifsOf, lineMotifs, type Motif } from '../chess/motifs';
import { describeMoment, narrateMoment, ideaOf, ERRORS, type Moment, type MomentInput } from '../chess/narrate';
import { CLASS_ORDER, classCounts, phaseGrades, phasesOf, summaryLine, type Side } from '../chess/reviewStats';
import { lessonById } from '../lessons';
import { pvToSan, formatLine, uciToSan } from '../chess/util';
import { getGame, saveGame, type GameRecord, type MoveAnalysis, type MoveClass } from '../store/db';
import { addMistakes, loadCards } from '../store/mistakes';
import { trackStudy } from '../store/tracker';
import { download, downloadIcon, toPgn } from './games';
import type { View } from '../router';
import '../styles/review.css';

/** Bump when classification changes so older reviews are recomputed. */
const ANALYSIS_VERSION = 4;

type WDL = [number, number, number];

/** Stockfish WDL (side-to-move POV) → White win / draw / Black win. Falls back to the win% model. */
function toWhiteWdl(w: WDL | undefined, sign: number, stmScore: number): WDL {
  if (!w) {
    const win = Math.round(winPct(stmScore) * 10);
    w = [win, 0, 1000 - win];
  }
  return sign > 0 ? [w[0], w[1], w[2]] : [w[2], w[1], w[0]];
}

/** Analyse all positions of a game; results are stored on the record. */
async function analyseGame(rec: GameRecord, onProgress: (done: number, total: number) => void): Promise<void> {
  const g = new Chess(rec.startFen);
  const fens = [g.fen()];
  for (const s of rec.sans) {
    g.move(s);
    fens.push(g.fen());
  }
  // Eval of every position: `cp` is White POV; `top`/`second` are side-to-move POV scores of the two best moves.
  type Ev = { cp: number; mate: number | null; best: string; pv: string[]; top: number; second: { uci: string; score: number } | null; wdl: WDL };
  const evals: Ev[] = [];
  for (let i = 0; i < fens.length; i++) {
    const pos = new Chess(fens[i]);
    const sign = pos.turn() === 'w' ? 1 : -1;
    if (pos.isCheckmate()) {
      evals.push({ cp: -sign * 10000, mate: 0, best: '', pv: [], top: -10000, second: null, wdl: sign > 0 ? [0, 0, 1000] : [1000, 0, 0] });
    } else if (pos.isGameOver()) {
      evals.push({ cp: 0, mate: null, best: '', pv: [], top: 0, second: null, wdl: [0, 1000, 0] });
    } else {
      const r = await engine.analyse(fens[i], { depth: 13, multipv: 2 });
      if (r.bestmove === '(cancelled)') throw new Error('cancelled');
      const l = r.lines[0] ?? { cp: 0, mate: null, pv: [] };
      const l2 = r.lines[1];
      evals.push({
        cp: sign * scoreNum(l),
        mate: l.mate === null ? null : sign * l.mate,
        best: r.bestmove,
        pv: l.pv,
        top: scoreNum(l),
        second: l2 ? { uci: l2.pv[0], score: scoreNum(l2) } : null,
        wdl: toWhiteWdl(l.wdl, sign, scoreNum(l)),
      });
    }
    onProgress(i + 1, fens.length);
  }
  const analysis: MoveAnalysis[] = [];
  const acc = { white: [] as number[], black: [] as number[] };
  for (let i = 0; i < rec.sans.length; i++) {
    const white = new Chess(fens[i]).turn() === 'w';
    const pov = white ? 1 : -1;
    const wb = winPct(evals[i].top);
    const wa = winPct(pov * evals[i + 1].cp);
    const loss = Math.max(0, wb - wa);
    const played = new Chess(fens[i]).move(rec.sans[i]);
    const bestSan = evals[i].best ? uciToSan(fens[i], evals[i].best) : '';
    const sec = evals[i].second;
    const winSecond = sec ? winPct(sec.score) : null;
    const prev = i > 0 ? new Chess(fens[i - 1]).move(rec.sans[i - 1]) : null;
    const cls = classifyMove({
      ply: i,
      winBefore: wb,
      winAfter: wa,
      winSecond,
      isBest: bestSan === rec.sans[i],
      isSacrifice: isSacrifice(fens[i], played),
      prevCls: analysis[i - 1]?.cls,
      // mate scores are White POV: negative = Black is mating
      allowsMate: evals[i + 1].mate !== null && evals[i + 1].mate! * pov < 0 && !(evals[i].mate !== null && evals[i].mate! * pov < 0),
      missedMate: evals[i].mate !== null && evals[i].mate! * pov > 0 && !(evals[i + 1].mate !== null && evals[i + 1].mate! * pov >= 0),
      isRecapture: !!played.captured && !!prev?.captured && prev.to === played.to,
    });
    analysis.push({
      cp: evals[i + 1].cp,
      mate: evals[i + 1].mate,
      best: bestSan,
      bestPv: pvToSan(fens[i], evals[i].pv, 8),
      cls,
      winLoss: Math.round(loss * 10) / 10,
      second: sec ? uciToSan(fens[i], sec.uci) : undefined,
      secondLoss: winSecond !== null ? Math.round(wb - winSecond) : undefined,
      wdl: evals[i + 1].wdl,
    });
    acc[white ? 'white' : 'black'].push(moveAccuracy(loss));
  }
  const avg = (a: number[]) => (a.length ? Math.round((10 * a.reduce((x, y) => x + y, 0)) / a.length) / 10 : 0);
  rec.analysis = analysis;
  rec.analysisVersion = ANALYSIS_VERSION;
  rec.startWdl = evals[0].wdl;
  rec.accuracy = { white: avg(acc.white), black: avg(acc.black) };
  await saveGame(rec);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mq = (q: string) => (typeof matchMedia === 'function' ? matchMedia(q) : null);

function badgeTitle(cls: MoveClass | null, text: string): HTMLElement {
  return h('span.rv-title', cls ? classBadge(cls) : null, h('span', text));
}

/** chess.com-style eval graph: White's share from the bottom, dots for key moves, a cursor for the current move. */
class EvalGraph {
  readonly el: HTMLElement;
  private cursor: HTMLElement;
  constructor(analysis: MoveAnalysis[], startCp: number, onPick: (ply: number) => void, dots: (i: number) => boolean) {
    const W = Math.max(1, analysis.length);
    const ys = [startCp, ...analysis.map((m) => (m.mate !== null ? (m.cp > 0 || (m.mate === 0 && m.cp > 0) ? 10000 : -10000) : m.cp))].map((cp) => 100 - winPct(Math.max(-1500, Math.min(1500, cp))));
    const pts = ys.map((y, i) => `${i},${y.toFixed(2)}`).join(' ');
    this.cursor = h('div.eg-cursor');
    this.el = h('div.eg', { role: 'img', 'aria-label': 'Evaluation graph' });
    this.el.innerHTML = `<svg viewBox="0 0 ${W} 100" preserveAspectRatio="none"><polygon points="0,100 ${pts} ${W},100" class="eg-white"/><line x1="0" x2="${W}" y1="50" y2="50" class="eg-mid"/></svg>`;
    this.el.append(this.cursor);
    analysis.forEach((m, i) => {
      if (!dots(i)) return;
      this.el.append(h('span.eg-dot', { style: `left:${((i + 1) / W) * 100}%;top:${ys[i + 1]}%;background:${CLASS_STYLE[m.cls].color}`, title: CLASS_STYLE[m.cls].label }));
    });
    this.el.addEventListener('click', (e) => {
      const r = this.el.getBoundingClientRect();
      onPick(Math.max(0, Math.min(W, Math.round(((e.clientX - r.left) / r.width) * W))));
    });
    this.set(-1, W);
  }
  set(ply: number, total: number) {
    this.cursor.hidden = ply < 0;
    this.cursor.style.left = `${(Math.max(0, ply) / Math.max(1, total)) * 100}%`;
  }
}

export async function reviewView([idStr]: string[]): Promise<View> {
  trackStudy('play');
  const rec = await getGame(Number(idStr));
  if (!rec) return { el: h('div.page', h('p', 'Game not found.'), h('a.btn', { href: '#/games' }, 'All games')) };
  const R = rec;
  const board = new BoardView({ orientation: R.userColor === 'black' ? 'black' : 'white', onMove: (m) => void onRetryMove(m) });
  const fens: string[] = [R.startFen];
  const lastMoves: ([string, string] | undefined)[] = [undefined];
  {
    const g = new Chess(R.startFen);
    for (const s of R.sans) {
      const m = g.move(s);
      fens.push(g.fen());
      lastMoves.push([m.from, m.to]);
    }
  }
  const whiteFirst = new Chess(R.startFen).turn() === 'w';
  const userSide = (i: number): Side => ((i % 2 === 0) === whiteFirst ? 'white' : 'black');
  /** Was move i played by the user? */
  const isMine = (i: number) => R.userColor === userSide(i) || R.userColor === 'both';
  const you: Side = R.userColor === 'black' ? 'black' : 'white';

  let ply = 0;
  let mode: 'summary' | 'review' = 'summary';
  /** A "Retry" challenge: find a good move in position `ply`. */
  let retry: { ply: number; mode: 'better' | 'find' | 'punish'; hints: number } | null = null;
  let auto = false;
  let autoTimer = 0;
  let alsoTheirs = false;
  let anim: AbortController | null = null;
  /** the guided play just paused here: offer Continue instead of Next */
  let fromPause = false;
  const moments = new Map<number, Moment>();
  const AUTO_MS = 1100;

  // ---------------------------------------------------------------- pieces of the screen
  const evalBar = new EvalBar();
  const nameOf = (side: Side) => displayName(side === 'white' ? R.white : R.black);
  const avatarOf = (side: Side): string | Node | undefined => {
    const n = side === 'white' ? R.white : R.black;
    if (R.userColor === side || n === 'You') return userAvatar();
    return BOTS.find((b) => n.startsWith(b.name))?.avatar;
  };
  const cards: Record<Side, PlayerCard> = {
    white: new PlayerCard({ name: nameOf('white'), rating: ratingInName(R.white) ?? undefined, avatar: avatarOf('white'), color: 'white' }),
    black: new PlayerCard({ name: nameOf('black'), rating: ratingInName(R.black) ?? undefined, avatar: avatarOf('black'), color: 'black' }),
  };
  const topSlot = h('div.rv-card-slot');
  const bottomSlot = h('div.rv-card-slot');
  const boardArea = h('div.board-area', evalBar.el, board.el);
  const boardCol = h('div.rv-board', topSlot, boardArea, bottomSlot);

  const coach = new Coach(board, { compact: true });
  const explainBtn = h('button.btn.ghost.rv-explain', { type: 'button', onclick: () => explainStepByStep() }, icon('learn'), 'Explain step by step');
  const coachBox = h('div.rv-coach', coach.el, explainBtn);
  const moveList = new MoveList((i) => show(i + 1), { strip: true });
  const playBtn = h('button.rv-ctl.play', { type: 'button', 'aria-label': 'Play through the game', onclick: () => (auto ? stopAuto() : startAuto()) }, icon('play_arrow'));
  const ctrl = h(
    'div.rv-ctrl',
    h('button.rv-ctl', { type: 'button', 'aria-label': 'First move', onclick: () => show(0) }, icon('first')),
    h('button.rv-ctl', { type: 'button', 'aria-label': 'Previous move', onclick: () => show(ply - 1) }, icon('prev')),
    playBtn,
    h('button.rv-ctl', { type: 'button', 'aria-label': 'Next move', onclick: () => show(ply + 1) }, icon('next')),
    h('button.rv-ctl', { type: 'button', 'aria-label': 'Last move', onclick: () => show(fens.length - 1) }, icon('last')),
    h('button.rv-ctl', { type: 'button', 'aria-label': 'Flip board', onclick: () => (board.flip(), placeCards(), renderBar()) }, icon('flip')),
  );
  const wdlBar = h('div.wdlbar', { 'aria-label': 'Winning chances' }, h('div.wdl-w', h('span')), h('div.wdl-d', h('span')), h('div.wdl-b', h('span')));
  const moreBody = h('div.rv-more-body');
  const more = h('details.rv-more', { open: !!mq('(min-width: 900px)')?.matches }, h('summary', icon('analysis'), 'Engine & plan'), moreBody);
  const reviewPanel = h('div.rv-review', coachBox, moveList.el, ctrl, more);
  const summaryPanel = h('div.rv-summary');
  const page = h(
    'div.page.review.rv',
    h(
      'header.rv-head',
      h('a.icon-btn', { href: '#/games', 'aria-label': 'Back to games' }, icon('back')),
      h('div.grow', h('h1', 'Game Review'), h('div.rv-sub', `${nameOf('white')} vs ${nameOf('black')} · ${R.result} · ${new Date(R.date).toLocaleDateString()}`)),
      h('button.icon-btn.rv-summary-btn', { type: 'button', 'aria-label': 'Report card', onclick: () => setMode('summary') }, icon('chart')),
      h('button.icon-btn', { type: 'button', 'aria-label': 'Download PGN', onclick: () => download(`chess-seeker-${R.id}.pgn`, toPgn(R)) }, downloadIcon()),
    ),
    h('div.rv-layout', boardCol, summaryPanel, reviewPanel),
  );

  // desktop gets the two-column move table, phones the strip
  const wide = mq('(min-width: 900px)');
  const applyWide = () => moveList.el.classList.toggle('strip', !wide?.matches);
  applyWide();
  wide?.addEventListener('change', applyWide);

  function setMode(m: 'summary' | 'review') {
    mode = m;
    page.classList.toggle('mode-summary', m === 'summary');
    page.classList.toggle('mode-review', m === 'review');
    if (m === 'summary') {
      stopAuto();
      abortAnim();
      renderSummary();
    }
  }

  function placeCards() {
    const flipped = board.orientation === 'black';
    topSlot.replaceChildren(cards[flipped ? 'white' : 'black'].el);
    bottomSlot.replaceChildren(cards[flipped ? 'black' : 'white'].el);
  }

  function renderMaterial(fen: string) {
    const m = materialFromFen(fen);
    cards.white.setCaptured(m.whiteTook, 'black', m.lead);
    cards.black.setCaptured(m.blackTook, 'white', -m.lead);
    const turn = new Chess(fen).turn();
    cards.white.setTurn(turn === 'w');
    cards.black.setTurn(turn === 'b');
  }

  function renderBar() {
    const a = R.analysis;
    const cp = ply === 0 ? 20 : a?.[ply - 1]?.cp ?? 0;
    const mate = ply === 0 ? null : a?.[ply - 1]?.mate ?? null;
    evalBar.set(a ? cp : 0, a ? mate : null, board.orientation === 'black');
    renderWdl();
  }

  const wdlAt = (p: number): WDL | undefined => (p === 0 ? R.startWdl : R.analysis?.[p - 1]?.wdl);

  /** Broadcast-style White / Draw / Black bar. */
  function renderWdl() {
    const w = wdlAt(ply);
    wdlBar.hidden = !w;
    if (!w) return;
    const pct = w.map((x) => Math.round(x / 10));
    const labels = ['White', 'Draw', 'Black'];
    [...wdlBar.children].forEach((seg, k) => {
      (seg as HTMLElement).style.flexBasis = `${w[k] / 10}%`;
      seg.firstElementChild!.textContent = pct[k] >= 14 ? `${labels[k]} ${pct[k]}%` : pct[k] >= 7 ? `${pct[k]}%` : '';
    });
  }

  /** How the coach refers to the other side when talking about move i. */
  function oppName(i: number): string {
    const mover = userSide(i);
    if (R.userColor === 'both') return nameOf(mover === 'white' ? 'black' : 'white');
    return nameOf(R.userColor === 'white' ? 'black' : 'white');
  }

  function momentInput(i: number): MomentInput {
    const a = R.analysis![i];
    const next = R.analysis![i + 1];
    const pov = userSide(i) === 'white' ? 1 : -1;
    return {
      fen: fens[i],
      san: R.sans[i],
      cls: a.cls,
      mine: isMine(i),
      opp: oppName(i),
      best: a.best || undefined,
      bestPv: a.bestPv,
      replyPv: next?.bestPv ?? [],
      matedIn: a.mate !== null && a.mate * pov < 0 ? Math.abs(a.mate) : null,
      prevSan: R.sans[i - 1],
      prevLastMove: lastMoves[i],
    };
  }

  function momentAt(i: number): Moment {
    let m = moments.get(i);
    if (!m) moments.set(i, (m = describeMoment(momentInput(i))));
    return m;
  }

  // ---------------------------------------------------------------- key moments (where guided play pauses)
  const PAUSE_CLASSES = new Set<MoveClass>(['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder']);

  /** Your errors and great moves, big swings in your moves, and the opponent's mistakes (your chances). */
  function isHighlight(i: number): boolean {
    const m = R.analysis?.[i];
    if (!m) return false;
    if (!isMine(i)) {
      if (m.cls === 'mistake' || m.cls === 'blunder') return true;
      return alsoTheirs && (m.cls === 'brilliant' || m.cls === 'great' || m.cls === 'miss');
    }
    if (PAUSE_CLASSES.has(m.cls)) return true;
    const before = wdlAt(i);
    if (before && m.wdl) {
      const k = userSide(i) === 'white' ? 0 : 2;
      const chance = (w: WDL) => (w[k] + w[1] / 2) / 10;
      return Math.abs(chance(m.wdl) - chance(before)) >= 15;
    }
    return false;
  }

  const nextKey = (from: number) => {
    for (let i = from; i < R.sans.length; i++) if (isHighlight(i)) return i + 1;
    return -1;
  };

  // ---------------------------------------------------------------- showing a move
  function abortAnim() {
    anim?.abort();
    anim = null;
    coach.stop();
  }

  function show(p: number, fromAuto = false) {
    if (mode !== 'review') setMode('review');
    if (!fromAuto) stopAuto();
    abortAnim();
    retry = null;
    ply = Math.max(0, Math.min(p, fens.length - 1));
    board.set(fens[ply], { lastMove: lastMoves[ply] });
    board.highlight({});
    board.arrows([]);
    board.badge(null);
    renderMaterial(fens[ply]);
    renderBar();
    moveList.select(ply - 1);
    graphs.forEach((g) => g.set(ply, R.sans.length));
    explainBtn.hidden = true;
    if (!R.analysis) {
      coach.say(ply === 0 ? 'Starting position.' : `Move ${R.sans[ply - 1]}.`, 'thinking');
      coach.setActions([]);
      return;
    }
    renderMoment();
    renderMore();
  }

  function renderMoment() {
    if (ply === 0) {
      coach.say(`Let's go through the game. Tap **Next** to jump to the key moments, or play it through.`, 'happy');
      coach.setActions([
        { label: 'Play', icon: 'play_arrow', onclick: () => startAuto() },
        { label: 'Next', icon: 'next', primary: true, onclick: () => goNextKey() },
      ]);
      return;
    }
    const i = ply - 1;
    const a = R.analysis![i];
    const mo = momentAt(i);
    const to = lastMoves[ply]![1];
    board.badge(to, a.cls);
    if (mo.arrows.length) board.arrows(mo.arrows);
    if (mo.flash.length) board.flash(mo.flash, isMine(i) ? 'red' : 'yellow', 1600);
    coach.say(mo.line, mo.mood, { title: badgeTitle(a.cls, mo.title), fen: fens[ply] });
    coach.setActions(auto ? [] : momentActions(i, mo));
    explainBtn.hidden = !(ERRORS.has(a.cls) || a.cls === 'miss' || a.cls === 'brilliant' || a.cls === 'great' || isHighlight(i));
    if (ply === fens.length - 1 && !auto) endOfGame(false);
  }

  function momentActions(i: number, mo: Moment): CoachAction[] {
    const acts: CoachAction[] = [];
    if (mo.best) acts.push({ label: 'Best', icon: 'check', onclick: () => void showBest(i) });
    if (mo.show) acts.push({ label: mo.show.label, icon: 'eye', onclick: () => void showLine(i, mo) });
    if (mo.retry) acts.push({ label: 'Retry', icon: 'replay', onclick: () => startRetry(mo.retry === 'punish' && !isMine(i) ? i + 1 : i, mo.retry!) });
    const nk = nextKey(i + 1);
    if (fromPause) acts.push({ label: 'Continue', icon: 'play_arrow', primary: true, onclick: () => startAuto() });
    else if (nk > 0) acts.push({ label: 'Next', icon: 'next', primary: true, onclick: () => goNextKey() });
    else if (ply < fens.length - 1) acts.push({ label: 'Next', icon: 'next', primary: true, onclick: () => show(ply + 1) });
    return acts;
  }

  function goNextKey() {
    fromPause = false;
    const nk = nextKey(ply);
    show(nk > 0 ? nk : fens.length - 1);
  }

  function backToMove(i: number): CoachAction {
    return { label: 'Back', icon: 'undo', onclick: () => show(i + 1) };
  }

  /** "Best": animate the engine's move from the position before, and say why. */
  async function showBest(i: number) {
    stopAuto();
    abortAnim();
    const mo = momentAt(i);
    if (!mo.best) return;
    const ctrlr = (anim = new AbortController());
    board.badge(null);
    board.arrows([]);
    board.set(fens[i], { lastMove: lastMoves[i] });
    coach.say(mo.best.text, 'happy', { title: badgeTitle('best', `${mo.best.san} is best`), fen: fens[i] });
    coach.setActions([backToMove(i), nextAction()]);
    await sleep(300);
    if (ctrlr.signal.aborted) return;
    const ok = await board.playLine(fens[i], [mo.best.san], { signal: ctrlr.signal, brush: 'green' });
    if (!ok) return;
    const m = new Chess(fens[i]).move(mo.best.san);
    board.arrows([arrow(m.from + m.to, 'green')]);
    board.badge(m.to, 'best');
  }

  function nextAction(): CoachAction {
    const nk = nextKey(ply);
    return { label: 'Next', icon: 'next', primary: true, onclick: () => (nk > 0 ? goNextKey() : show(ply + 1)) };
  }

  /** "Show …": animate the follow-up (punishment, missed win, idea), narrating as it plays. */
  async function showLine(i: number, mo: Moment) {
    if (!mo.show) return;
    stopAuto();
    abortAnim();
    const ctrlr = (anim = new AbortController());
    const s = mo.show;
    const start = s.from === 'before' ? fens[i] : fens[i + 1];
    board.badge(null);
    board.arrows([]);
    board.set(start, { lastMove: s.from === 'before' ? lastMoves[i] : lastMoves[i + 1] });
    coach.say(s.intro, mo.mood, { title: badgeTitle(null, s.label.replace(/^Show /, '')), fen: start });
    coach.setActions([backToMove(i), nextAction()]);
    await sleep(450);
    if (ctrlr.signal.aborted) return;
    const ok = await board.playLine(start, s.sans, { signal: ctrlr.signal, onStep: (_k, _m, fen) => renderMaterial(fen) });
    if (!ok) return;
    if (s.outro) coach.say(`${s.intro} ${s.outro}`, mo.mood, { title: badgeTitle(null, s.label.replace(/^Show /, '')), fen: start });
    coach.setActions([{ label: 'Replay', icon: 'replay', onclick: () => void showLine(i, mo) }, backToMove(i), nextAction()]);
  }

  /** "Explain step by step": the walkthrough drives the board; Done returns to the move. */
  function explainStepByStep() {
    if (ply === 0 || !R.analysis) return;
    stopAuto();
    abortAnim();
    const i = ply - 1;
    const steps = narrateMoment(momentInput(i), momentAt(i));
    if (!steps.length) return;
    explainBtn.hidden = true;
    coach.setActions([]);
    coach.narrate(steps, { startFen: fens[i], onExit: () => show(i + 1) });
  }

  // ---------------------------------------------------------------- Retry ("play it yourself")
  function startRetry(i: number, m: 'better' | 'find' | 'punish' = 'better') {
    stopAuto();
    abortAnim();
    retry = { ply: i, mode: m, hints: 0 };
    const side = new Chess(fens[i]).turn() === 'w' ? 'white' : 'black';
    board.badge(null);
    board.arrows([]);
    board.set(fens[i], { movable: side, lastMove: lastMoves[i] });
    explainBtn.hidden = true;
    const prompt =
      m === 'better'
        ? `Your turn. Find a better move than ${R.sans[i]}.`
        : m === 'find'
          ? `Can you find the ${R.analysis![i].cls} move here?`
          : `There's a way to punish the last move. Find it!`;
    coach.say(prompt, 'thinking', { title: badgeTitle(null, `${side === 'white' ? 'White' : 'Black'} to move`), fen: fens[i] });
    coach.setActions(retryActions(i));
  }

  function retryActions(i: number): CoachAction[] {
    return [
      { label: 'Hint', icon: 'hint', onclick: () => hint(i) },
      { label: 'Show me', icon: 'eye', onclick: () => void solveRetry(i) },
      { label: 'Skip', icon: 'next', onclick: () => resumeAfter(i) },
    ];
  }

  function retryAnswer(i: number): string | null {
    const a = R.analysis![i];
    if (retry?.mode === 'find') return R.sans[i];
    return a.best || null;
  }

  /** First hint: circle the piece to move. Second: the full arrow. */
  function hint(i: number) {
    const san = retryAnswer(i);
    if (!san || !retry) return;
    const m = new Chess(fens[i]).move(san);
    retry.hints++;
    if (retry.hints === 1) {
      board.arrows([arrow(m.from + m.from, 'yellow')]);
      board.flash([m.from], 'yellow', 1400);
      coach.say(`Try a move with this ${pieceWord(m.piece)}.`, 'thinking', { fen: fens[i] });
    } else {
      board.arrows([arrow(m.from + m.to, 'yellow')]);
      coach.say(`Move it here. ${ideaHint(i, san)}`, 'thinking', { fen: fens[i] });
    }
    coach.setActions(retryActions(i));
  }

  const pieceWord = (p: string) => ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' })[p] ?? 'piece';
  const ideaHint = (i: number, san: string) => {
    const idea = ideaOf(fens[i], san, new Chess(fens[i]).turn());
    return idea ? `It ${idea}.` : '';
  };

  async function solveRetry(i: number) {
    const san = retryAnswer(i);
    if (!san) return resumeAfter(i);
    retry = null;
    abortAnim();
    const ctrlr = (anim = new AbortController());
    board.set(fens[i], { lastMove: lastMoves[i] });
    const line = retryAnswerLine(i, san);
    coach.say(`The move is ${san}. ${ideaHint(i, san)}`, 'happy', { title: badgeTitle('best', 'Solution'), fen: fens[i] });
    coach.setActions([{ label: 'Continue', icon: 'play_arrow', primary: true, onclick: () => resumeAfter(i) }]);
    await sleep(300);
    if (ctrlr.signal.aborted) return;
    await board.playLine(fens[i], line, { signal: ctrlr.signal });
  }

  function retryAnswerLine(i: number, san: string): string[] {
    const a = R.analysis![i];
    if (a.bestPv[0] === san) return a.bestPv.slice(0, 3);
    return [san];
  }

  /** Continue the review after a challenge on position `i`. */
  function resumeAfter(i: number) {
    retry = null;
    show(Math.min(i + 1, fens.length - 1));
  }

  async function onRetryMove(mv: { from: string; to: string; promotion?: string }) {
    if (!retry) return;
    const { ply: i, mode: m } = retry;
    const g = new Chess(fens[i]);
    let played;
    try {
      played = g.move(mv);
    } catch {
      return startRetry(i, m);
    }
    board.set(g.fen(), { lastMove: [played.from, played.to] });
    coach.say('Checking…', 'thinking');
    coach.setActions([]);
    const r = await engine.analyse(g.fen(), { depth: 13 });
    if (retry?.ply !== i || retry.mode !== m) return; // the user stepped elsewhere meanwhile
    const pov = g.turn() === 'w' ? -1 : 1; // mover's POV
    const after = r.lines[0] ? -scoreNum(r.lines[0]) : 0;
    const bestWhite = i === 0 ? 20 : R.analysis![i - 1]?.cp ?? 0;
    const lossNow = winPct(pov * bestWhite) - winPct(after);
    const same = played.san === R.sans[i];
    const ok = g.isCheckmate() || (m === 'better' ? lossNow <= Math.max(4, R.analysis![i].winLoss / 3) && !same : lossNow <= 3 || (m === 'find' && same));
    if (ok) {
      playSound('good');
      board.badge(played.to, 'best');
      const idea = ideaOf(fens[i], played.san, played.color);
      coach.say(`${played.san}${idea ? ` ${idea}` : ''}. Well done!`, 'excited', { title: badgeTitle('best', 'Correct!'), fen: fens[i] });
      coach.setActions([{ label: 'Continue', icon: 'play_arrow', primary: true, onclick: () => resumeAfter(i) }]);
    } else {
      playSound('bad');
      board.badge(played.to, lossNow > 20 ? 'blunder' : 'mistake');
      coach.say(m === 'better' && same ? `That's the move from the game. Look for something better.` : `${played.san} isn't it. Try again?`, 'thinking', { fen: fens[i] });
      coach.setActions([{ label: 'Try again', icon: 'replay', primary: true, onclick: () => startRetry(i, m) }, ...retryActions(i).slice(0, 2)]);
    }
  }

  // ---------------------------------------------------------------- guided play
  function stopAuto() {
    auto = false;
    clearTimeout(autoTimer);
    playBtn.replaceChildren(icon('play_arrow'));
    playBtn.classList.remove('on');
  }

  function startAuto() {
    if (!R.analysis) return;
    if (mode !== 'review') setMode('review');
    if (ply >= fens.length - 1) show(0);
    abortAnim();
    fromPause = false;
    auto = true;
    playBtn.replaceChildren(icon('pause'));
    playBtn.classList.add('on');
    autoTimer = window.setTimeout(autoStep, 500);
  }

  function autoStep() {
    if (!auto) return;
    if (ply >= fens.length - 1) {
      stopAuto();
      endOfGame(true);
      return;
    }
    show(ply + 1, true);
    const san = R.sans[ply - 1];
    playSound(san.includes('#') || san.includes('+') ? 'check' : san.includes('x') ? 'capture' : 'move');
    if (isHighlight(ply - 1)) {
      stopAuto();
      fromPause = true;
      coach.setActions(momentActions(ply - 1, momentAt(ply - 1)));
      fromPause = false;
    } else autoTimer = window.setTimeout(autoStep, AUTO_MS);
  }

  async function endOfGame(said: boolean) {
    const cards = (await loadCards()).filter((c) => c.gameId === R.id);
    const extra: CoachAction[] = [{ label: 'Report card', icon: 'chart', onclick: () => setMode('summary') }];
    if (cards.length) extra.unshift({ label: 'Learn from mistakes', icon: 'target', primary: true, onclick: () => (location.hash = '/mistakes') });
    if (said || ply === fens.length - 1) {
      if (said)
        coach.say(
          cards.length ? `That's the whole game! I saved ${cards.length} of your mistakes as puzzles, so you can practise them.` : `That's the whole game! Nice work going through it.`,
          'happy',
          { title: badgeTitle(null, 'Review complete') },
        );
      const base = said ? [] : momentActions(ply - 1, momentAt(ply - 1)).filter((a) => a.label !== 'Next');
      coach.setActions([...base, ...extra]);
    }
  }

  // ---------------------------------------------------------------- "Engine & plan" section
  function techniqueChips(title: string, motifs: Motif[]) {
    const real = motifs.filter((m) => lessonById(m.lesson));
    if (!real.length) return null;
    return h('div.technique', h('span.small.muted', title), ...real.map((m) => h('a.chip.tech', { href: `#/lesson/${m.lesson}` }, icon('learn'), m.label)));
  }

  function renderMore() {
    const parts: (Node | null)[] = [wdlBar];
    const a = R.analysis;
    if (!a || ply === 0) {
      moreBody.replaceChildren(...(parts.filter(Boolean) as Node[]), alsoToggle());
      return;
    }
    const i = ply - 1;
    const m = a[i];
    const next = a[i + 1];
    const side = userSide(i);
    const mine = isMine(i);
    const played = new Chess(fens[i]).move(R.sans[i]);
    const wBefore = wdlAt(i);
    if (wBefore && m.wdl) {
      const forSide = R.userColor === 'both' ? side : R.userColor;
      const chance = (w: WDL) => Math.round((forSide === 'white' ? w[0] + w[1] / 2 : w[2] + w[1] / 2) / 10);
      const [b, a2] = [chance(wBefore), chance(m.wdl)];
      const d = a2 - b;
      const whose = R.userColor === 'both' ? `${forSide === 'white' ? 'White' : 'Black'}'s` : 'Your';
      parts.push(h(`p.swing${d > 2 ? '.up' : d < -2 ? '.down' : ''}`, `${whose} chances: ${b}% → ${a2}% `, h('strong', d > 0 ? `+${d}` : d < 0 ? `${d}` : '±0')));
    }
    const isError = ERRORS.has(m.cls) || m.cls === 'miss';
    if (!isError) parts.push(techniqueChips(mine ? 'Technique used:' : `Technique ${oppName(i)} used:`, motifsOf(fens[i], played)));
    else if (m.cls === 'miss') {
      const bm = m.best ? safeMove(fens[i], m.best) : null;
      if (bm) parts.push(techniqueChips(mine ? 'The winning move uses:' : 'The move they missed uses:', motifsOf(fens[i], bm)));
    } else {
      if (next) parts.push(techniqueChips(mine ? `${oppName(i)} can punish with:` : 'You can punish with:', lineMotifs(fens[ply], next.bestPv.slice(0, 5))));
      const bm = mine && m.best ? safeMove(fens[i], m.best) : null;
      if (bm) parts.push(techniqueChips('The better move uses:', motifsOf(fens[i], bm)));
    }
    const gameOver = new Chess(fens[ply]).isGameOver();
    if (next && next.bestPv.length && !gameOver) {
      const line = next.bestPv;
      const toMove = R.userColor === 'both' ? `${side === 'white' ? 'Black' : 'White'} is` : isMine(i + 1) ? 'You are' : `${oppName(i + 1)} is`;
      const idea = ideaOf(fens[ply], line[0], you === 'white' ? 'w' : 'b');
      parts.push(
        h(
          'div.plan-box',
          h('div.rv-more-t', icon('target'), 'How to continue'),
          coachTextLite(`${toMove} to move. Best is ${line[0]}${idea ? `, which ${idea}` : ''}.`),
          h('button.btn.sm', { type: 'button', onclick: () => void playPlan(ply, line.slice(0, 6)) }, icon('play_arrow'), 'Play the plan'),
        ),
      );
    }
    if (m.best && m.bestPv.length) parts.push(h('p.small.rv-line', `Engine line: ${formatLine(fens[i], m.bestPv.slice(0, 8))}`));
    parts.push(h('p.small.muted', `Evaluation after ${R.sans[i]}: ${fmtEval(m.cp, m.mate)}`));
    parts.push(alsoToggle());
    moreBody.replaceChildren(...(parts.filter(Boolean) as Node[]));
  }

  const coachTextLite = (t: string) => h('p.rv-plan-text', t);

  function alsoToggle() {
    return h(
      'label.toggle.small-toggle',
      h('input', { type: 'checkbox', checked: alsoTheirs, onchange: (e: Event) => (alsoTheirs = (e.target as HTMLInputElement).checked) }),
      h('span', h('strong', 'Also stop at the opponent’s strong moves'), h('small', 'Play stops at your mistakes, your best moves and your chances.')),
    );
  }

  /** "Play the plan": animate the engine line from position `from`. */
  async function playPlan(from: number, sans: string[]) {
    stopAuto();
    abortAnim();
    const ctrlr = (anim = new AbortController());
    board.badge(null);
    board.arrows([]);
    board.set(fens[from], { lastMove: lastMoves[from] });
    coach.say(`Here's how the game could go on.`, 'thinking', { fen: fens[from] });
    coach.setActions([{ label: 'Back', icon: 'undo', onclick: () => show(from) }]);
    await sleep(300);
    if (ctrlr.signal.aborted) return;
    await board.playLine(fens[from], sans, { signal: ctrlr.signal, onStep: (_k, _m, fen) => renderMaterial(fen) });
  }

  // ---------------------------------------------------------------- summary (report card)
  const graphs: EvalGraph[] = [];

  function renderSummary() {
    board.set(fens[fens.length - 1], { lastMove: lastMoves[fens.length - 1] });
    board.badge(null);
    board.arrows([]);
    ply = fens.length - 1;
    renderMaterial(fens[ply]);
    renderBar();
    const a = R.analysis;
    if (!a) return;
    const sumCoach = new Coach(board);
    const acc = R.accuracy ?? { white: 0, black: 0 };
    const meSide: Side | 'both' = R.userColor;
    const counts = { white: classCounts(a, 'white', whiteFirst), black: classCounts(a, 'black', whiteFirst) };
    const myAcc = meSide === 'both' ? (acc.white + acc.black) / 2 : acc[meSide];
    const myCounts = meSide === 'both' ? sumCounts(counts.white, counts.black) : counts[meSide];
    sumCoach.say(summaryLine({ result: R.result, you: meSide, accuracy: myAcc, counts: myCounts }), myAcc >= 80 ? 'excited' : myAcc >= 60 ? 'happy' : 'thinking');

    const graph = new EvalGraph(a, 20, (p) => show(p), (i) => isHighlight(i) || a[i].cls === 'brilliant' || a[i].cls === 'great');
    graphs.length = 0;
    graphs.push(graph);
    const phases = phasesOf(fens, a.length);
    const grades = { white: phaseGrades(a, phases, 'white', whiteFirst), black: phaseGrades(a, phases, 'black', whiteFirst) };
    const perf = (side: Side) => performance(a, side, whiteFirst).rating;

    const player = (side: Side) => {
      const rated = ratingInName(side === 'white' ? R.white : R.black);
      const est = perf(side);
      const diff = est !== null && rated !== null ? est - rated : null;
      return h(
        `div.rv-player.${side}`,
        h('div.rv-pname', nameOf(side)),
        h(`div.rv-acc.${side}`, `${(acc[side] ?? 0).toFixed(1)}`),
        h('div.rv-rating', est !== null ? [h('span.muted', 'Game rating '), h('strong', `~${est}`)] : h('span.muted', 'Too short to rate')),
        diff !== null && Math.abs(diff) >= 50 ? h(`div.rv-diff.${diff > 0 ? 'up' : 'down'}`, `${diff > 0 ? '+' : ''}${diff} vs rating ${rated}`) : null,
      );
    };
    const row = (c: MoveClass) =>
      h(
        `div.rv-crow${counts.white[c] + counts.black[c] === 0 ? '.zero' : ''}`,
        h('span.rv-n', { style: `color:${CLASS_STYLE[c].color}` }, String(counts.white[c])),
        h('span.rv-clabel', classBadge(c), CLASS_STYLE[c].label),
        h('span.rv-n', { style: `color:${CLASS_STYLE[c].color}` }, String(counts.black[c])),
      );
    const phaseCell = (g: (typeof grades)['white'][number]) =>
      g.cls ? h('span.rv-phase-cell', { title: `${g.accuracy}% accuracy` }, classBadge(g.cls), h('small', `${g.accuracy}%`)) : h('span.rv-phase-cell.muted', '–');
    const phaseRow = (k: number, label: string) => h('div.rv-crow.phase', phaseCell(grades.white[k]), h('span.rv-clabel', label), phaseCell(grades.black[k]));

    const myErrs = a.filter((m, i) => isMine(i) && (m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss')).length;
    summaryPanel.replaceChildren(
      sumCoach.el,
      h('div.rv-card', graph.el),
      h('div.rv-card.rv-players', h('div.rv-col-h', h('span'), h('span.muted', 'Accuracy'), h('span')), h('div.rv-pl-row', player('white'), player('black'))),
      h('div.rv-card', ...CLASS_ORDER.map(row)),
      h('div.rv-card', h('div.rv-card-t', 'Phases'), phaseRow(0, 'Opening'), phaseRow(1, 'Middlegame'), phaseRow(2, 'Endgame')),
      h('p.rv-note', 'Game rating is a rough estimate from accuracy in this one game (book moves skipped). It is not an official rating.'),
      h('div.rv-start', h('button.btn.primary.big', { type: 'button', onclick: () => startReview() }, 'Start Review'),
        myErrs ? h('a.btn.rv-learn', { href: '#/mistakes' }, icon('target'), 'Learn from mistakes') : null),
    );
  }

  function sumCounts(x: Record<MoveClass, number>, y: Record<MoveClass, number>) {
    return Object.fromEntries(CLASS_ORDER.map((c) => [c, x[c] + y[c]])) as Record<MoveClass, number>;
  }

  function startReview() {
    setMode('review');
    show(0);
    startAuto();
  }

  // ---------------------------------------------------------------- analysis
  async function saveMistakes() {
    const a = R.analysis;
    if (!a || R.id === undefined) return;
    const found = a.flatMap((m, i) => {
      if (!isMine(i) || !(m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss') || !m.best) return [];
      const answers = [m.best];
      if (m.second && m.secondLoss !== undefined && m.secondLoss <= 4) answers.push(m.second);
      return [
        {
          id: `${R.id}:${i}`,
          gameId: R.id!,
          ply: i,
          fen: fens[i],
          played: R.sans[i],
          cls: m.cls,
          answers,
          line: m.bestPv.slice(0, 6),
          lastMove: lastMoves[i],
          label: `vs ${oppName(i)} · move ${Math.floor(i / 2) + 1}`,
        },
      ];
    });
    if (found.length) await addMistakes(found);
  }

  async function runAnalysis() {
    const bar = h('span', { style: 'width:0%' });
    const label = h('span.small', '');
    const anCoach = new Coach(board);
    anCoach.say(`Give me a moment. I'm checking every move of this game.`, 'thinking');
    summaryPanel.replaceChildren(anCoach.el, h('div.rv-progress', h('div.bar', bar), label));
    try {
      await analyseGame(R, (d, t) => {
        bar.style.width = `${(100 * d) / t}%`;
        label.textContent = `Analysing on this device… ${d}/${t}`;
      });
      moments.clear();
      renderMoves();
      await saveMistakes();
      renderSummary();
      toast('Review ready', 'good');
    } catch {
      /* cancelled by navigation */
    }
  }

  function renderMoves() {
    moveList.render(R.sans.map((san, i) => ({ san, cls: R.analysis?.[i]?.cls })), ply - 1);
  }

  const keyHandler = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest?.('input,textarea')) return;
    if (e.key === 'ArrowLeft') show(ply - 1);
    if (e.key === 'ArrowRight') show(ply + 1);
    if (e.key === ' ') (e.preventDefault(), auto ? stopAuto() : startAuto());
  };
  addEventListener('keydown', keyHandler);

  placeCards();
  renderMoves();
  setMode('summary');
  const fresh = !R.analysis || (R.analysisVersion ?? 1) < ANALYSIS_VERSION;
  if (fresh) void runAnalysis();
  else void saveMistakes();
  return {
    el: page,
    title: 'Game Review',
    destroy: () => {
      removeEventListener('keydown', keyHandler);
      wide?.removeEventListener('change', applyWide);
      stopAuto();
      abortAnim();
      engine.cancelAll();
      board.destroy();
    },
  };
}

function safeMove(fen: string, san: string) {
  try {
    return new Chess(fen).move(san);
  } catch {
    return null;
  }
}
