import { Chess } from 'chess.js';
import { h, rich, toast, setChildren } from '../ui/dom';
import { BoardView, arrow } from '../ui/board';
import { playSound } from '../ui/sound';
import { engine, scoreNum, winPct, fmtEval } from '../engine/engine';
import { explainBest, explainMistake, describeMove } from '../chess/explain';
import { classifyMove, isSacrifice, moveAccuracy } from '../chess/classify';
import { motifsOf, lineMotifs, type Motif } from '../chess/motifs';
import { lessonById } from '../lessons';
import { pvToSan, formatLine, uciToSan, NAME } from '../chess/util';
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
const ANALYSIS_VERSION = 3;

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
  let retry: { ply: number } | null = null;
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

  function show(p: number) {
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
    if (token === planToken) detail.append(h('button.btn.ghost', { onclick: () => show(ply) }, '↺ Back to the game position'));
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
    const who = rec!.userColor === side || rec!.userColor === 'both' ? 'You' : side === 'white' ? rec!.white : rec!.black;
    const moveNo = `${Math.floor(i / 2) + 1}${side === 'white' ? '.' : '…'}`;
    if (!a) {
      detail.replaceChildren(h('p', `${moveNo} ${san}`));
      return;
    }
    const m = a[i];
    const played = new Chess(fens[i]).move(san);
    const playedUci = played.from + played.to + (played.promotion ?? '');
    const bestUci = m.best ? sanLineToUci(fens[i], [m.best])[0] : '';
    const reasons = describeMove(fens[i], played).filter((r) => r !== 'improves the position');
    const why = reasons.length ? reasons.join('; ') : 'keeps the position in good shape';
    const bestWhy = () => explainBest(fens[i], bestUci, sanLineToUci(fens[i], m.bestPv)).replace(/^\*\*.+?\*\* /, '');
    const retryRow = () =>
      h('div.row.wrap', h('button.btn', { onclick: () => showBest(i) }, 'Show best move'), h('button.btn.primary', { onclick: () => startRetry(i) }, '↻ Retry this moment'));
    const parts: (HTMLElement | null)[] = [h('div.row', h(`span.cls.${m.cls}`, CLS_LABEL[m.cls]), h('strong', `${moveNo} ${san}`), h('span.muted.small', `by ${who}`))];
    switch (m.cls) {
      case 'brilliant':
        parts.push(rich(`**Brilliant!** ${san} sacrifices the ${NAME[played.piece]} on ${played.to} — it can be taken, but Stockfish confirms the sacrifice works. The move ${why}.`));
        if (m.bestPv.length > 1) parts.push(rich(`The idea: ${formatLine(fens[i], m.bestPv.slice(0, 6))}.`));
        board.arrows([arrow(playedUci, 'blue')]);
        break;
      case 'great':
        parts.push(rich(`**Great move — the only good one here.** ${san} ${why}.${m.second ? ` The next-best option, ${m.second}, would have cost about ${m.secondLoss}% winning chances.` : ''}`));
        board.arrows([arrow(playedUci, 'blue')]);
        break;
      case 'best':
      case 'excellent':
      case 'good':
      case 'book':
        parts.push(rich(`**Why it works:** ${san} ${why}.`));
        if (m.cls !== 'best' && m.cls !== 'book' && m.best && m.best !== san) {
          parts.push(rich(`Stockfish slightly preferred **${m.best}** — it ${bestWhy()}`));
          board.arrows([arrow(playedUci, 'green'), arrow(bestUci, 'blue')]);
        } else board.arrows([arrow(playedUci, 'green')]);
        break;
      case 'miss': {
        const prevSan = rec!.sans[i - 1];
        parts.push(rich(`**Missed chance.** Your opponent's ${prevSan} was a mistake, but ${san} lets them off the hook.`));
        if (m.best) parts.push(rich(`**${m.best} would have punished it** — it ${bestWhy()}`), retryRow());
        board.arrows([arrow(playedUci, 'red'), ...(bestUci ? [arrow(bestUci, 'green')] : [])]);
        break;
      }
      default: {
        // inaccuracy / mistake / blunder — the opponent's best reply is the engine's line from the next position.
        const replyPv = sanLineToUci(fens[ply], a[i + 1]?.bestPv ?? []);
        const pov = side === 'white' ? 1 : -1;
        const oppMate = m.mate !== null && m.mate * pov < 0 ? Math.abs(m.mate) : null;
        parts.push(rich(`**Why it's ${m.cls === 'inaccuracy' ? 'an' : 'a'} ${m.cls}:** ${explainMistake(fens[i], played, replyPv, oppMate)}`));
        if (m.best) parts.push(rich(`**Better was ${m.best}** — it ${bestWhy()}`), retryRow());
        board.arrows([arrow(playedUci, 'red'), ...(bestUci ? [arrow(bestUci, 'green')] : [])]);
      }
    }
    // Winning-chances swing for the side that moved.
    const wBefore = wdlAt(i);
    const wAfter = m.wdl;
    if (wBefore && wAfter) {
      // overall chances = win + half of the draws
      const chance = (w: WDL) => Math.round((side === 'white' ? w[0] + w[1] / 2 : w[2] + w[1] / 2) / 10);
      const [b, a2] = [chance(wBefore), chance(wAfter)];
      const d = a2 - b;
      parts.push(
        h(`p.swing${d > 2 ? '.up' : d < -2 ? '.down' : ''}`, `📈 ${side === 'white' ? 'White' : 'Black'}'s chances: ${b}% → ${a2}% `, h('strong', d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '±0')),
      );
    }
    // Technique behind the move (or behind its refutation / the better move).
    const isError = m.cls === 'inaccuracy' || m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'miss';
    const next = a[i + 1];
    const nextBestMove = next?.best ? safeMove(fens[ply], next.best) : null;
    if (!isError) parts.push(techniqueChips('Technique used:', motifsOf(fens[i], played)));
    else {
      if (next && m.cls !== 'miss') parts.push(techniqueChips('Opponent can punish with:', lineMotifs(fens[ply], next.bestPv.slice(0, 5))));
      const betterMove = m.best ? safeMove(fens[i], m.best) : null;
      if (betterMove) parts.push(techniqueChips('The better move uses:', motifsOf(fens[i], betterMove)));
    }
    // How to continue from here.
    if (next && nextBestMove && !new Chess(fens[ply]).isGameOver()) {
      const toMove = side === 'white' ? 'Black' : 'White';
      const line = next.bestPv;
      const follow = line[1] ? safeMove(playedFen(fens[ply], [line[0]]), line[1]) : null;
      const replyIdeas = describeMove(fens[ply], nextBestMove).filter((r) => r !== 'improves the position');
      const followIdeas = follow ? describeMove(playedFen(fens[ply], [line[0]]), follow).filter((r) => r !== 'improves the position') : [];
      const text =
        `**🧭 How to continue:** ${toMove} to move. The best reply is **${line[0]}**${replyIdeas.length ? ` — it ${replyIdeas[0]}` : ''}.` +
        (follow ? ` Then ${side === 'white' ? 'White' : 'Black'} continues with **${follow.san}**${followIdeas.length ? `, which ${followIdeas[0]}` : ''}.` : '') +
        (line.length > 2 ? ` Main line: ${formatLine(fens[ply], line.slice(0, 6))}.` : '');
      parts.push(
        h('div.plan-box', rich(text), h('div.row.wrap', h('button.btn', { onclick: () => void playPlan(ply, line.slice(0, 6)) }, isError ? '▶ Show the punishment' : '▶ Play the plan'))),
      );
      if (!isError && follow) parts.push(techniqueChips('Next idea:', motifsOf(playedFen(fens[ply], [line[0]]), follow)));
    }
    parts.push(h('p.small.muted', `Evaluation after the move: ${fmtEval(m.cp, m.mate)}`));
    detail.replaceChildren(...parts.filter(Boolean) as HTMLElement[]);
  }

  function showBest(i: number) {
    const m = rec!.analysis![i];
    board.set(fens[i]);
    board.arrows([arrow(sanLineToUci(fens[i], [m.best])[0], 'green')]);
    detail.append(rich(`Best line: ${formatLine(fens[i], m.bestPv)}`));
  }

  function startRetry(i: number) {
    retry = { ply: i };
    const side = userSide(i);
    board.set(fens[i], { movable: side, lastMove: lastMoves[i] });
    board.clearAnnotations();
    detail.replaceChildren(h('div.banner.info', `Retry: find a better move than ${rec!.sans[i]}.`), h('button.btn.ghost', { onclick: () => show(i + 1) }, 'Cancel'));
  }

  async function onRetryMove(mv: { from: string; to: string; promotion?: string }) {
    if (!retry) return;
    const i = retry.ply;
    const g = new Chess(fens[i]);
    let m;
    try {
      m = g.move(mv);
    } catch {
      return startRetry(i);
    }
    board.set(g.fen(), { lastMove: [m.from, m.to] });
    detail.replaceChildren(h('div.banner.subtle', 'Checking…'));
    const r = await engine.analyse(g.fen(), { depth: 13 });
    const pov = g.turn() === 'w' ? -1 : 1; // mover's POV
    const after = r.lines[0] ? -scoreNum(r.lines[0]) : 0;
    const bestWhite = i === 0 ? 20 : rec!.analysis![i - 1]?.cp ?? 0;
    const lossNow = winPct(pov * bestWhite) - winPct(after);
    const playedLoss = rec!.analysis![i].winLoss;
    if (lossNow <= Math.max(4, playedLoss / 3)) {
      playSound('good');
      detail.replaceChildren(h('div.banner.good', `✓ ${m.san} — much better!`), rich(explainBest(fens[i], m.from + m.to + (m.promotion ?? ''), r.lines[0] ? [m.from + m.to, ...r.lines[0].pv] : [])), h('button.btn', { onclick: () => show(i + 1) }, 'Back to the game'));
    } else {
      playSound('bad');
      detail.replaceChildren(h('div.banner.bad', `${m.san} isn't an improvement.`), h('div.row', h('button.btn.primary', { onclick: () => startRetry(i) }, 'Try again'), h('button.btn', { onclick: () => showBest(i) }, 'Show best')));
    }
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
    summary.replaceChildren(
      h('div.acc', h('div', h('small', rec!.white), h('strong', `${rec!.accuracy?.white ?? '–'}%`)), h('div', h('small', rec!.black), h('strong', `${rec!.accuracy?.black ?? '–'}%`))),
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
      show(ply);
      toast('Analysis complete', 'good');
    } catch {
      /* cancelled by navigation */
    }
  }

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') show(ply - 1);
    if (e.key === 'ArrowRight') show(ply + 1);
  };
  addEventListener('keydown', keyHandler);

  const resultText = `${rec.result} · ${rec.termination} · ${new Date(rec.date).toLocaleDateString()}`;
  const el = h(
    'div.page.review',
    h('header.lesson-head', h('a.icon-btn', { href: '#/games', 'aria-label': 'Back' }, '‹'), h('div.grow', h('div.eyebrow', resultText), h('h2', `${rec.white} vs ${rec.black}`))),
    h(
      'div.play-layout',
      h('div.board-col', wdlBar, h('div.board-with-bar', evalBar, board.el), graph, h('div.demo-ctrl', h('button.btn', { onclick: () => show(0) }, '⏮'), h('button.btn', { onclick: () => show(ply - 1) }, '◀'), h('button.btn', { onclick: () => show(ply + 1) }, '▶'), h('button.btn', { onclick: () => show(fens.length - 1) }, '⏭'), h('button.btn.ghost', { onclick: () => (board.flip(), renderEvalBar()) }, '⇅'))),
      h('div.side-col', progress, detail, moments, summary, moveList),
    ),
  );
  renderAll();
  show(ply);
  if (!rec.analysis || (rec.analysisVersion ?? 1) < ANALYSIS_VERSION) void runAnalysis();
  return {
    el,
    destroy: () => {
      removeEventListener('keydown', keyHandler);
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
