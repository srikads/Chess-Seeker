import { Chess } from 'chess.js';
import { h, rich, toast, setChildren } from '../ui/dom';
import { BoardView, arrow } from '../ui/board';
import { playSound } from '../ui/sound';
import { engine, scoreNum, winPct, fmtEval } from '../engine/engine';
import { explainBest, describeMove } from '../chess/explain';
import { coachCard, displayName } from '../chess/coach';
import { performance, ratingInName } from '../chess/performance';
import { classifyMove, isSacrifice, moveAccuracy } from '../chess/classify';
import { motifsOf, lineMotifs, type Motif } from '../chess/motifs';
import { lessonById } from '../lessons';
import { pvToSan, formatLine, uciToSan } from '../chess/util';
import { getGame, saveGame, type GameRecord, type MoveAnalysis, type MoveClass } from '../store/db';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';

const CLS_LABEL: Record<MoveClass, string> = {
  brilliant: '!! Brilliant',
  great: '! Great',
  best: '★ Best',
  excellent: '👍 Excellent',
  good: '✓ Good',
  book: '📖 Book',
  inaccuracy: '?! Inaccuracy',
  mistake: '? Mistake',
  miss: '✗ Miss',
  blunder: '?? Blunder',
};

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
      isRecapture: !!played.captured && i > 0 && !!new Chess(fens[i - 1]).move(rec.sans[i - 1]).captured && new Chess(fens[i - 1]).move(rec.sans[i - 1]).to === played.to,
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

export async function reviewView([idStr]: string[]): Promise<View> {
  trackStudy('play');
  const rec = await getGame(Number(idStr));
  if (!rec) return { el: h('div.page', h('p', 'Game not found.'), h('a.btn', { href: '#/games' }, 'All games')) };
  const board = new BoardView({ orientation: rec.userColor === 'black' ? 'black' : 'white', onMove: (m) => void onRetryMove(m) });
  const fens: string[] = [rec.startFen];
  const lastMoves: ([string, string] | undefined)[] = [undefined];
  {
    const g = new Chess(rec.startFen);
    for (const s of rec.sans) {
      const m = g.move(s);
      fens.push(g.fen());
      lastMoves.push([m.from, m.to]);
    }
  }
  let ply = fens.length - 1;
  /** A "play it yourself" challenge: find a good move in position `ply`. */
  let retry: { ply: number; mode: 'better' | 'find' | 'punish' } | null = null;
  // Guided (auto-play) review state
  let auto = false;
  let autoTimer = 0;
  let alsoTheirs = false;
  /** keep the 'More' section open while stepping through moves once the user opened it */
  let moreOpen = false;
  const AUTO_MS = 1200;
  const coachSlot = h('div.coach-slot');
  const autoBtn = h('button.btn.primary.auto-btn', { onclick: () => (auto ? stopAuto() : startAuto()) }, '▶ Play');
  const evalBar = h('div.evalbar', h('div.evalfill'), h('span.evaltext'));
  const wdlBar = h('div.wdlbar', { 'aria-label': 'Winning chances' }, h('div.wdl-w', h('span')), h('div.wdl-d', h('span')), h('div.wdl-b', h('span')));
  let planToken = 0;
  const graph = h('div.graph');
  const detail = h('div.review-detail');
  const moveList = h('div.movelist.review');
  const summary = h('div.review-summary');
  const moments = h('div.moments');
  const progress = h('div.progress-line');

  const userSide = (i: number) => (i % 2 === 0) === (new Chess(rec.startFen).turn() === 'w') ? 'white' : 'black';
  /** Was move i played by the user? */
  const isMine = (i: number) => rec.userColor === userSide(i) || rec.userColor === 'both';

  function show(p: number, fromAuto = false) {
    if (!fromAuto) stopAuto();
    coachSlot.replaceChildren();
    retry = null;
    planToken++;
    ply = Math.max(0, Math.min(p, fens.length - 1));
    board.set(fens[ply], { lastMove: lastMoves[ply] });
    board.clearAnnotations();
    renderDetail();
    renderEvalBar();
    moveList.querySelectorAll('.mv').forEach((e) => e.classList.toggle('on', Number((e as HTMLElement).dataset.ply) === ply));
    graph.querySelector('.cursor')?.setAttribute('x1', String(ply));
    graph.querySelector('.cursor')?.setAttribute('x2', String(ply));
  }

  function renderEvalBar() {
    const a = rec!.analysis;
    const cp = ply === 0 ? 20 : a?.[ply - 1]?.cp ?? 0;
    const mate = ply === 0 ? null : a?.[ply - 1]?.mate ?? null;
    const w = a ? winPct(cp) : 50;
    (evalBar.firstChild as HTMLElement).style.height = `${w}%`;
    (evalBar.lastChild as HTMLElement).textContent = a ? fmtEval(cp, mate) : '';
    evalBar.classList.toggle('flipped', board.cg.state.orientation === 'black');
    renderWdl();
  }

  const wdlAt = (p: number): WDL | undefined => (p === 0 ? rec!.startWdl : rec!.analysis?.[p - 1]?.wdl);

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

  function techniqueChips(title: string, motifs: Motif[]) {
    const real = motifs.filter((m) => lessonById(m.lesson));
    if (!real.length) return null;
    return h('div.technique', h('span.small.muted', title), ...real.map((m) => h('a.chip.tech', { href: `#/lesson/${m.lesson}` }, `🎓 ${m.label}`)));
  }

  /** Animate a SAN line on the board from position `from`, then offer to go back. */
  async function playPlan(from: number, sans: string[]) {
    const token = ++planToken;
    const g = new Chess(fens[from]);
    board.set(g.fen(), { lastMove: lastMoves[from] });
    board.clearAnnotations();
    for (const san of sans) {
      await new Promise((r) => setTimeout(r, 850));
      if (token !== planToken) return;
      let m;
      try {
        m = g.move(san);
      } catch {
        break;
      }
      board.playMove(g.fen(), m.from, m.to, !!m.captured);
      board.arrows([arrow(m.from + m.to, 'blue')]);
    }
    if (token === planToken && !detail.querySelector('.plan-back')) detail.append(h('button.btn.ghost.plan-back', { onclick: () => show(ply) }, '↺ Back to the game position'));
  }

  /** How the coach refers to the other side when talking about move i. */
  function oppName(i: number): string {
    const mover = userSide(i);
    if (rec!.userColor === 'both') return mover === 'white' ? 'Black' : 'White';
    const oppSide = isMine(i) ? (mover === 'white' ? 'black' : 'white') : mover;
    return displayName(oppSide === 'white' ? rec!.white : rec!.black);
  }

  function renderDetail() {
    const a = rec!.analysis;
    if (ply === 0) {
      detail.replaceChildren(h('p.muted', 'Starting position. Step through the moves with ◀ ▶ or tap a move.'));
      return;
    }
    const i = ply - 1;
    const san = rec!.sans[i];
    const side = userSide(i);
    const mine = isMine(i);
    const who = mine ? 'You' : side === 'white' ? rec!.white : rec!.black;
    const moveNo = `${Math.floor(i / 2) + 1}${side === 'white' ? '.' : '…'}`;
    if (!a) {
      detail.replaceChildren(h('p', `${moveNo} ${san}`));
      return;
    }
    const m = a[i];
    const next = a[i + 1];
    const played = new Chess(fens[i]).move(san);
    const playedUci = played.from + played.to + (played.promotion ?? '');
    const bestUci = m.best ? sanLineToUci(fens[i], [m.best])[0] ?? '' : '';
    const replyUci = next?.best ? sanLineToUci(fens[ply], [next.best])[0] ?? '' : '';
    const pov = side === 'white' ? 1 : -1;
    const card = coachCard({
      fen: fens[i],
      san,
      cls: m.cls,
      mine,
      opp: oppName(i),
      best: m.best || undefined,
      bestPv: m.bestPv,
      replyPv: next?.bestPv ?? [],
      matedIn: m.mate !== null && m.mate * pov < 0 ? Math.abs(m.mate) : null,
      prevSan: rec!.sans[i - 1],
    });
    const isError = m.cls === 'inaccuracy' || m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss';
    const gameOver = new Chess(fens[ply]).isGameOver();

    // Arrows: red = the problem, green = what to play instead / how to punish.
    if (isError && mine) board.arrows([arrow(playedUci, 'red'), ...(bestUci && bestUci !== playedUci ? [arrow(bestUci, 'green')] : [])]);
    else if (isError && m.cls === 'miss') board.arrows([arrow(playedUci, 'blue'), ...(bestUci ? [arrow(bestUci, 'red')] : [])]);
    else if (isError) board.arrows([arrow(playedUci, 'red'), ...(replyUci && !gameOver ? [arrow(replyUci, 'green')] : [])]);
    else board.arrows([arrow(playedUci, mine ? 'green' : 'blue')]);

    // Action buttons: replay lines on the board, or try it yourself.
    const replayBtn = (r: NonNullable<typeof card.replay>) =>
      h('button.btn', { onclick: () => void playPlan(r.from === 'reply' ? ply : i, r.sans) }, r.label);
    let tryBtn: HTMLElement | null = null;
    if (mine && m.cls === 'miss') tryBtn = h('button.btn.primary', { onclick: () => startRetry(i, 'punish') }, '🎯 Find the punishing move');
    else if (mine && isError && m.best && m.best !== san) tryBtn = h('button.btn.primary', { onclick: () => startRetry(i, 'better') }, '🎯 Try a better move');
    else if (!mine && isError && m.cls !== 'miss' && next && !gameOver) tryBtn = h('button.btn.primary', { onclick: () => startRetry(ply, 'punish') }, '🎯 Punish it yourself');

    const parts: (HTMLElement | null)[] = [
      h('div.row', h(`span.cls.${m.cls}`, CLS_LABEL[m.cls]), h('strong', `${moveNo} ${san}`), h('span.muted.small', `by ${who}`)),
      rich(card.headline),
      ...card.sections.map((s) => h('div.coach-sec', h('div.coach-sec-t', `${s.icon} ${s.title}`), rich(s.text))),
    ];
    const buttons = [card.replay ? replayBtn(card.replay) : null, card.replay2 ? replayBtn(card.replay2) : null, tryBtn].filter(Boolean) as HTMLElement[];
    if (buttons.length) parts.push(h('div.row.wrap.coach-actions', ...buttons));

    // ---- "More": chances swing, techniques, how to continue, engine numbers
    const more: (HTMLElement | null)[] = [];
    const wBefore = wdlAt(i);
    const wAfter = m.wdl;
    if (wBefore && wAfter) {
      // overall chances = win + half of the draws, for the user (or the mover when the user played both sides)
      const forSide = rec!.userColor === 'both' ? side : rec!.userColor;
      const chance = (w: WDL) => Math.round((forSide === 'white' ? w[0] + w[1] / 2 : w[2] + w[1] / 2) / 10);
      const [b, a2] = [chance(wBefore), chance(wAfter)];
      const d = a2 - b;
      const whose = rec!.userColor === 'both' ? `${forSide === 'white' ? 'White' : 'Black'}'s` : 'Your';
      more.push(h(`p.swing${d > 2 ? '.up' : d < -2 ? '.down' : ''}`, `📈 ${whose} chances: ${b}% → ${a2}% `, h('strong', d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '±0')));
    }
    if (!isError) more.push(techniqueChips(mine ? 'Technique used:' : `Technique ${oppName(i)} used:`, motifsOf(fens[i], played)));
    else if (m.cls === 'miss') {
      const bestMove = m.best ? safeMove(fens[i], m.best) : null;
      if (bestMove) more.push(techniqueChips(mine ? 'The punishing move uses:' : 'The move they missed uses:', motifsOf(fens[i], bestMove)));
    } else {
      if (next) more.push(techniqueChips(mine ? `${oppName(i)} can punish with:` : 'You can punish with:', lineMotifs(fens[ply], next.bestPv.slice(0, 5))));
      const betterMove = mine && m.best ? safeMove(fens[i], m.best) : null;
      if (betterMove) more.push(techniqueChips('The better move uses:', motifsOf(fens[i], betterMove)));
    }
    const nextBestMove = next?.best ? safeMove(fens[ply], next.best) : null;
    if (next && nextBestMove && !gameOver) {
      const line = next.bestPv;
      const nextMine = isMine(i + 1);
      const toMove = nextMine ? 'You are' : `${oppName(i + 1)} is`;
      const follow = line[1] ? safeMove(playedFen(fens[ply], [line[0]]), line[1]) : null;
      const replyIdeas = describeMove(fens[ply], nextBestMove).filter((r) => r !== 'improves the position');
      const text =
        `**🧭 How to continue:** ${rec!.userColor === 'both' ? `${side === 'white' ? 'Black' : 'White'} is` : toMove} to move. The best move is **${line[0]}**${replyIdeas.length ? ` — it ${replyIdeas[0]}` : ''}.` +
        (follow ? ` Then **${follow.san}**.` : '') +
        (line.length > 2 ? ` Main line: ${formatLine(fens[ply], line.slice(0, 6))}.` : '');
      more.push(h('div.plan-box', rich(text), h('div.row.wrap', h('button.btn', { onclick: () => void playPlan(ply, line.slice(0, 6)) }, '▶ Play the line'))));
    }
    if (m.best && m.bestPv.length) more.push(rich(`Engine’s best line here: ${formatLine(fens[i], m.bestPv.slice(0, 8))}`));
    more.push(h('p.small.muted', `Evaluation after the move: ${fmtEval(m.cp, m.mate)}`));
    const moreBox = h('details.coach-more', { open: moreOpen, ontoggle: (e: Event) => (moreOpen = (e.target as HTMLDetailsElement).open) }, h('summary', 'More'), ...(more.filter(Boolean) as HTMLElement[]));
    parts.push(moreBox);
    detail.replaceChildren(...(parts.filter(Boolean) as HTMLElement[]));
  }

  function showBest(i: number) {
    const m = rec!.analysis![i];
    board.set(fens[i]);
    board.arrows([arrow(sanLineToUci(fens[i], [m.best])[0], 'green')]);
    detail.append(rich(`Best line: ${formatLine(fens[i], m.bestPv)}`));
  }

  function startRetry(i: number, mode: 'better' | 'find' | 'punish' = 'better') {
    stopAuto();
    coachSlot.replaceChildren();
    retry = { ply: i, mode };
    const side = new Chess(fens[i]).turn() === 'w' ? 'white' : 'black';
    board.set(fens[i], { movable: side, lastMove: lastMoves[i], orientation: board.cg.state.orientation });
    board.clearAnnotations();
    const prompt =
      mode === 'better'
        ? `🎯 Your turn: find a better move than ${rec!.sans[i]}.`
        : mode === 'find'
          ? `🎯 Can you find the ${rec!.analysis![i].cls} move ${side === 'white' ? 'White' : 'Black'} played here?`
          : `🎯 Your opponent just erred. Find the move that punishes it!`;
    detail.replaceChildren(h('div.banner.info', prompt), h('p.small.muted', `${side === 'white' ? 'White' : 'Black'} to move — drag a piece on the board.`), h('div.row', h('button.btn', { onclick: () => showBest(i) }, 'Show me'), h('button.btn.ghost', { onclick: () => resumeAfter(i) }, 'Skip ›')));
  }

  /** Continue the guided review after a challenge on position `i`. */
  function resumeAfter(i: number) {
    show(Math.min(i + 1, fens.length - 1));
    startAuto();
  }

  async function onRetryMove(mv: { from: string; to: string; promotion?: string }) {
    if (!retry) return;
    const { ply: i, mode } = retry;
    const g = new Chess(fens[i]);
    let m;
    try {
      m = g.move(mv);
    } catch {
      return startRetry(i, mode);
    }
    board.set(g.fen(), { lastMove: [m.from, m.to] });
    detail.replaceChildren(h('div.banner.subtle', 'Checking…'));
    const r = await engine.analyse(g.fen(), { depth: 13 });
    if (retry?.ply !== i || retry.mode !== mode) return; // the user stepped elsewhere meanwhile
    const pov = g.turn() === 'w' ? -1 : 1; // mover's POV
    const after = r.lines[0] ? -scoreNum(r.lines[0]) : 0;
    const bestWhite = i === 0 ? 20 : rec!.analysis![i - 1]?.cp ?? 0;
    const lossNow = winPct(pov * bestWhite) - winPct(after);
    const played = m.san === rec!.sans[i];
    const ok = g.isCheckmate() || (mode === 'better' ? lossNow <= Math.max(4, rec!.analysis![i].winLoss / 3) && !played : lossNow <= 3 || (mode === 'find' && played));
    const uci = m.from + m.to + (m.promotion ?? '');
    const cont = h('button.btn.primary', { onclick: () => resumeAfter(i) }, '▶ Continue review');
    if (ok) {
      playSound('good');
      const msg = mode === 'better' ? `✓ ${m.san} — much better!` : mode === 'find' ? `✓ ${m.san} — you found it!` : `✓ ${m.san} — punished!`;
      detail.replaceChildren(h('div.banner.good', msg), rich(explainBest(fens[i], uci, r.lines[0] ? [uci, ...r.lines[0].pv] : [])), h('div.row.wrap', cont));
    } else {
      playSound('bad');
      const msg = mode === 'better' && played ? `That's the move from the game — look for something better.` : `${m.san} isn't it.`;
      detail.replaceChildren(h('div.banner.bad', msg), h('div.row.wrap', h('button.btn.primary', { onclick: () => startRetry(i, mode) }, 'Try again'), h('button.btn', { onclick: () => showBest(i) }, 'Show me'), h('button.btn.ghost', { onclick: () => resumeAfter(i) }, 'Skip ›')));
    }
  }

  // ---------------------------------------------------------------- guided review
  const PAUSE_CLASSES = new Set<MoveClass>(['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder']);

  /**
   * Should the guided review stop after move i? By default: your errors and best moves, big swings
   * in your moves, and the opponent's mistakes (a chance for you). Optionally also the opponent's strong moves.
   */
  function isHighlight(i: number): boolean {
    const m = rec!.analysis?.[i];
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

  function stopAuto() {
    auto = false;
    clearTimeout(autoTimer);
    autoBtn.textContent = '▶ Play';
  }

  function startAuto() {
    if (!rec!.analysis) return;
    if (ply >= fens.length - 1) show(0);
    auto = true;
    coachSlot.replaceChildren();
    autoBtn.textContent = '⏸ Pause';
    autoTimer = window.setTimeout(autoStep, 700);
  }

  function autoStep() {
    if (!auto) return;
    if (ply >= fens.length - 1) {
      stopAuto();
      coachSlot.replaceChildren(h('div.coach-card.done', h('strong', '🏁 Review complete'), h('p.small', 'Check your key moments and accuracy below, or tap any move to revisit it.')));
      return;
    }
    show(ply + 1, true);
    const san = rec!.sans[ply - 1];
    playSound(san.includes('x') ? 'capture' : san.includes('+') ? 'check' : 'move');
    if (isHighlight(ply - 1)) {
      stopAuto();
      renderCoachCard(ply - 1);
    } else autoTimer = window.setTimeout(autoStep, AUTO_MS);
  }

  /** Duolingo-style pause card at a highlight moment. */
  function renderCoachCard(i: number) {
    const m = rec!.analysis![i];
    const mine = isMine(i);
    const titles: Partial<Record<MoveClass, string>> = {
      brilliant: '💎 Brilliant move!',
      great: '🔥 Great move!',
      inaccuracy: '🤔 Inaccuracy',
      mistake: '⚠️ Mistake',
      miss: '😬 Missed chance',
      blunder: '💥 Blunder!',
    };
    const theirTitles: Partial<Record<MoveClass, string>> = {
      brilliant: `💎 Strong move by ${oppName(i)}`,
      great: `🔥 Strong move by ${oppName(i)}`,
      inaccuracy: '🎁 A small chance for you',
      mistake: '🎁 A chance for you!',
      blunder: '🎁 Big chance for you!',
      miss: '😅 You got away with one',
    };
    const title = (mine ? titles[m.cls] : theirTitles[m.cls]) ?? '📈 Turning point';
    const who = mine ? 'You' : userSide(i) === 'white' ? rec!.white : rec!.black;
    const isError = ['inaccuracy', 'mistake', 'miss', 'blunder'].includes(m.cls);
    // an opponent's "miss" means they failed to punish YOU — there is nothing for you to punish
    const canPunish = isError && m.cls !== 'miss' && !mine && !new Chess(fens[i + 1]).isGameOver() && !!rec!.analysis![i + 1];
    let tryBtn: HTMLElement | null = null;
    if (mine && m.cls === 'miss') tryBtn = h('button.btn.primary', { onclick: () => startRetry(i, 'punish') }, '🎯 Find the punishing move');
    else if (isError && mine && m.best) tryBtn = h('button.btn.primary', { onclick: () => startRetry(i, 'better') }, '🎯 Play the better move');
    else if (canPunish) tryBtn = h('button.btn.primary', { onclick: () => startRetry(i + 1, 'punish') }, '🎯 Punish it yourself');
    else if (mine && (m.cls === 'brilliant' || m.cls === 'great' || !isError)) tryBtn = h('button.btn.primary', { onclick: () => startRetry(i, 'find') }, '🎯 Play this move yourself');
    const card = h(
      `div.coach-card.${m.cls}`,
      h('div.row.between', h('strong.coach-title', title), h('span.small.muted', `${who} · ${Math.floor(i / 2) + 1}${userSide(i) === 'black' ? '…' : '.'} ${rec!.sans[i]}`)),
      h('div.row.wrap', tryBtn, h('button.btn', { onclick: () => startAuto() }, '▶ Continue')),
    );
    coachSlot.replaceChildren(card);
  }

  const whiteFirst = new Chess(rec.startFen).turn() === 'w';

  /** Accuracy plus "played like ~N" for one side, compared with their rating when we know it. */
  function playerCard(side: 'white' | 'black') {
    const name = side === 'white' ? rec!.white : rec!.black;
    const perf = performance(rec!.analysis!, side, whiteFirst);
    const rated = ratingInName(name);
    const diff = perf.rating !== null && rated !== null ? perf.rating - rated : null;
    return h(
      'div',
      h('small', name),
      h('strong', `${rec!.accuracy?.[side] ?? '–'}%`),
      h('div.perf', perf.rating !== null ? ['Played like ', h('b', `≈${perf.rating}`)] : 'Too few moves to rate'),
      diff !== null ? h(`div.perf-diff${diff >= 50 ? '.up' : diff <= -50 ? '.down' : ''}`, `rated ${rated} · ${diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : '±0'}`) : null,
    );
  }

  /** One sentence about the user's own performance. */
  function performanceNote() {
    if (rec!.userColor === 'both') return null;
    const side = rec!.userColor;
    const you = performance(rec!.analysis!, side, whiteFirst).rating;
    const oppSide = side === 'white' ? 'black' : 'white';
    const oppName = side === 'white' ? rec!.black : rec!.white;
    const them = performance(rec!.analysis!, oppSide, whiteFirst).rating;
    if (you === null) return null;
    const yourRating = ratingInName(side === 'white' ? rec!.white : rec!.black);
    let text = `🎯 This game you played like a **~${you}** player`;
    if (yourRating !== null) text += you >= yourRating + 50 ? ` — ${you - yourRating} above your ${yourRating} rating. Nice!` : you <= yourRating - 50 ? ` — ${yourRating - you} below your ${yourRating} rating.` : ` — right around your ${yourRating} rating.`;
    else text += '.';
    if (them !== null) text += ` ${displayName(oppName)} played like a **~${them}**.`;
    return h('div.perf-note', rich(text + ' (A rough estimate from move accuracy — one game is a small sample.)'));
  }

  function renderAll() {
    const a = rec!.analysis;
    // move list
    const cells: HTMLElement[] = [];
    rec!.sans.forEach((s, i) => {
      if (i % 2 === 0) cells.push(h('span.mv-no', `${i / 2 + 1}.`));
      cells.push(h(`span.mv${a ? '.c-' + a[i].cls : ''}`, { 'data-ply': String(i + 1), onclick: () => show(i + 1) }, s));
    });
    moveList.replaceChildren(...cells);
    if (!a) return;
    // summary
    const count = (side: 'white' | 'black', c: MoveClass) => a.filter((m, i) => userSide(i) === side && m.cls === c).length;
    const row = (c: MoveClass) => h('tr', h('td', h(`span.cls.${c}`, CLS_LABEL[c])), h('td', String(count('white', c))), h('td', String(count('black', c))));
    setChildren(
      summary,
      h('div.acc', playerCard('white'), playerCard('black')),
      performanceNote(),
      h('table.cls-table', h('tr', h('th', ''), h('th', '⚪'), h('th', '⚫')), ...(['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'] as MoveClass[]).map(row)),
    );
    // key moments: the user's errors to learn from, and their best moments
    const mine = a.map((m, i) => ({ m, i })).filter(({ i }) => rec!.userColor === userSide(i) || rec!.userColor === 'both');
    const chip = ({ m, i }: { m: MoveAnalysis; i: number }) =>
      h(`button.chip.c-${m.cls}`, { onclick: () => show(i + 1) }, `${Math.floor(i / 2) + 1}${userSide(i) === 'black' ? '…' : '.'} ${rec!.sans[i]} ${CLS_LABEL[m.cls].split(' ')[0]}`);
    const errs = mine.filter(({ m }) => m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss');
    const highs = mine.filter(({ m }) => m.cls === 'brilliant' || m.cls === 'great');
    setChildren(
      moments,
      h('h3', 'Key moments to learn from'),
      errs.length ? h('div.chips', errs.map(chip)) : h('p.small.muted', 'No mistakes, misses or blunders by you — excellent game!'),
      highs.length ? h('h3', 'Your best moves') : null,
      highs.length ? h('div.chips', highs.map(chip)) : null,
    );
    // graph (SVG)
    const W = Math.max(1, a.length);
    const pts = [0, ...a.map((m) => Math.max(-1000, Math.min(1000, m.cp)))].map((cp, i) => `${i},${50 - (winPct(cp) - 50)}`);
    graph.innerHTML = `<svg viewBox="0 0 ${W} 100" preserveAspectRatio="none" class="evalgraph"><polygon points="0,100 ${pts.join(' ')} ${W},100" class="white-area"/><polyline points="${pts.join(' ')}" class="line"/><line x1="0" x2="${W}" y1="50" y2="50" class="mid"/><line class="cursor" x1="${ply}" x2="${ply}" y1="0" y2="100"/></svg>`;
    graph.onclick = (e) => {
      const r = graph.getBoundingClientRect();
      show(Math.round(((e.clientX - r.left) / r.width) * W));
    };
  }

  async function runAnalysis() {
    progress.replaceChildren(h('div.bar', h('span', { style: 'width:0%' })), h('span.small', 'Analysing with Stockfish…'));
    try {
      await analyseGame(rec!, (d, t) => {
        (progress.querySelector('.bar span') as HTMLElement).style.width = `${(100 * d) / t}%`;
        (progress.lastChild as HTMLElement).textContent = `Analysing with Stockfish… ${d}/${t}`;
      });
      progress.replaceChildren();
      renderAll();
      show(0);
      toast('Analysis complete — starting guided review', 'good');
      startAuto();
    } catch {
      /* cancelled by navigation */
    }
  }

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') show(ply - 1);
    if (e.key === 'ArrowRight') show(ply + 1);
    if (e.key === ' ') (e.preventDefault(), auto ? stopAuto() : startAuto());
  };
  addEventListener('keydown', keyHandler);

  const resultText = `${rec.result} · ${rec.termination} · ${new Date(rec.date).toLocaleDateString()}`;
  const el = h(
    'div.page.review',
    h('header.lesson-head', h('a.icon-btn', { href: '#/games', 'aria-label': 'Back' }, '‹'), h('div.grow', h('div.eyebrow', resultText), h('h2', `${rec.white} vs ${rec.black}`))),
    h(
      'div.play-layout',
      h('div.board-col', wdlBar, h('div.board-with-bar', evalBar, board.el), graph, h('div.demo-ctrl', h('button.btn', { 'aria-label': 'Start', onclick: () => show(0) }, '⏮'), h('button.btn', { 'aria-label': 'Previous move', onclick: () => show(ply - 1) }, '◀'), autoBtn, h('button.btn', { 'aria-label': 'Next move', onclick: () => show(ply + 1) }, '▶'), h('button.btn', { 'aria-label': 'End', onclick: () => show(fens.length - 1) }, '⏭'), h('button.btn.ghost', { 'aria-label': 'Flip board', onclick: () => (board.flip(), renderEvalBar()) }, '⇅')),
        coachSlot,
        h('label.toggle.small-toggle', h('input', { type: 'checkbox', onchange: (e: Event) => (alsoTheirs = (e.target as HTMLInputElement).checked) }), h('span', h('strong', 'Also stop at opponent’s strong moves'), h('small', 'By default it stops at your mistakes, your best moves and your chances.')))),
      h('div.side-col', progress, detail, moments, summary, moveList),
    ),
  );
  renderAll();
  const fresh = !rec.analysis || (rec.analysisVersion ?? 1) < ANALYSIS_VERSION;
  show(fresh ? ply : 0);
  if (fresh) void runAnalysis();
  else startAuto();
  return {
    el,
    destroy: () => {
      removeEventListener('keydown', keyHandler);
      stopAuto();
      engine.cancelAll();
      board.destroy();
    },
  };
}

function sanLineToUci(fen: string, sans: string[]): string[] {
  const g = new Chess(fen);
  const out: string[] = [];
  for (const s of sans) {
    try {
      const m = g.move(s);
      out.push(m.from + m.to + (m.promotion ?? ''));
    } catch {
      break;
    }
  }
  return out;
}

function safeMove(fen: string, san: string) {
  try {
    return new Chess(fen).move(san);
  } catch {
    return null;
  }
}

function playedFen(fen: string, sans: string[]): string {
  const g = new Chess(fen);
  for (const x of sans) g.move(x);
  return g.fen();
}
