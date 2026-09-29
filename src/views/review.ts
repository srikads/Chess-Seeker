import { Chess } from 'chess.js';
import { h, rich, toast } from '../ui/dom';
import { BoardView, arrow } from '../ui/board';
import { playSound } from '../ui/sound';
import { engine, scoreNum, winPct, fmtEval } from '../engine/engine';
import { explainBest, explainMistake } from '../chess/explain';
import { pvToSan, formatLine, uciToSan } from '../chess/util';
import { getGame, saveGame, type GameRecord, type MoveAnalysis, type MoveClass } from '../store/db';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';

const CLS_LABEL: Record<MoveClass, string> = {
  best: '★ Best',
  excellent: '👍 Excellent',
  good: '✓ Good',
  book: '📖 Book',
  inaccuracy: '?! Inaccuracy',
  mistake: '? Mistake',
  blunder: '?? Blunder',
};

function classify(loss: number, isBest: boolean): MoveClass {
  if (isBest || loss <= 1) return 'best';
  if (loss < 3) return 'excellent';
  if (loss < 7) return 'good';
  if (loss < 12) return 'inaccuracy';
  if (loss < 22) return 'mistake';
  return 'blunder';
}

/** Lichess-style accuracy from win% loss. */
const moveAccuracy = (loss: number) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));

/** Analyse all positions of a game; results are stored on the record. */
async function analyseGame(rec: GameRecord, onProgress: (done: number, total: number) => void): Promise<void> {
  const g = new Chess(rec.startFen);
  const fens = [g.fen()];
  for (const s of rec.sans) {
    g.move(s);
    fens.push(g.fen());
  }
  // eval of every position, white POV
  const evals: { cp: number; mate: number | null; best: string; pv: string[] }[] = [];
  for (let i = 0; i < fens.length; i++) {
    const pos = new Chess(fens[i]);
    if (pos.isCheckmate()) {
      evals.push({ cp: pos.turn() === 'w' ? -10000 : 10000, mate: 0, best: '', pv: [] });
    } else if (pos.isGameOver()) {
      evals.push({ cp: 0, mate: null, best: '', pv: [] });
    } else {
      const r = await engine.analyse(fens[i], { depth: 13 });
      if (r.bestmove === '(cancelled)') throw new Error('cancelled');
      const l = r.lines[0] ?? { cp: 0, mate: null, pv: [] };
      const sign = pos.turn() === 'w' ? 1 : -1;
      evals.push({ cp: sign * scoreNum(l), mate: l.mate === null ? null : sign * l.mate, best: r.bestmove, pv: l.pv });
    }
    onProgress(i + 1, fens.length);
  }
  const analysis: MoveAnalysis[] = [];
  const acc = { white: [] as number[], black: [] as number[] };
  for (let i = 0; i < rec.sans.length; i++) {
    const white = new Chess(fens[i]).turn() === 'w';
    const pov = white ? 1 : -1;
    const wb = winPct(pov * evals[i].cp);
    const wa = winPct(pov * evals[i + 1].cp);
    const loss = Math.max(0, wb - wa);
    const bestSan = evals[i].best ? uciToSan(fens[i], evals[i].best) : '';
    const cls = i < 6 && loss < 4 ? 'book' : classify(loss, bestSan === rec.sans[i]);
    analysis.push({ cp: evals[i + 1].cp, mate: evals[i + 1].mate, best: bestSan, bestPv: pvToSan(fens[i], evals[i].pv, 8), cls, winLoss: Math.round(loss * 10) / 10 });
    acc[white ? 'white' : 'black'].push(moveAccuracy(loss));
  }
  const avg = (a: number[]) => (a.length ? Math.round((10 * a.reduce((x, y) => x + y, 0)) / a.length) / 10 : 0);
  rec.analysis = analysis;
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
  const graph = h('div.graph');
  const detail = h('div.review-detail');
  const moveList = h('div.movelist.review');
  const summary = h('div.review-summary');
  const moments = h('div.moments');
  const progress = h('div.progress-line');

  const userSide = (i: number) => (i % 2 === 0) === (new Chess(rec.startFen).turn() === 'w') ? 'white' : 'black';

  function show(p: number) {
    retry = null;
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
    const parts: (HTMLElement | null)[] = [h('div.row', h(`span.cls.${m.cls}`, CLS_LABEL[m.cls]), h('strong', `${moveNo} ${san}`), h('span.muted.small', `by ${who}`))];
    if (m.cls === 'inaccuracy' || m.cls === 'mistake' || m.cls === 'blunder') {
      const played = new Chess(fens[i]).move(san);
      // The opponent's best reply is the engine's best line from the next position.
      const replyPv = sanLineToUci(fens[ply], a[i + 1]?.bestPv ?? []);
      const pov = side === 'white' ? 1 : -1;
      const oppMate = m.mate !== null && m.mate * pov < 0 ? Math.abs(m.mate) : null;
      parts.push(rich(`**Why it's a ${m.cls}:** ${explainMistake(fens[i], played, replyPv, oppMate)}`));
      if (m.best) {
        const bestUci = sanLineToUci(fens[i], [m.best])[0];
        parts.push(rich(`**Better was ${m.best}.** ${explainBest(fens[i], bestUci, sanLineToUci(fens[i], m.bestPv)).replace(/^\*\*.+?\*\* /, '')}`));
        parts.push(
          h(
            'div.row.wrap',
            h('button.btn', { onclick: () => showBest(i) }, 'Show best move'),
            h('button.btn.primary', { onclick: () => startRetry(i) }, '↻ Retry this moment'),
          ),
        );
      }
      board.arrows([arrow(sanLineToUci(fens[i], [san])[0], 'red'), ...(m.best ? [arrow(sanLineToUci(fens[i], [m.best])[0], 'green')] : [])]);
    } else if (m.best && m.best !== san && m.cls !== 'book') {
      parts.push(h('p.small.muted', `Engine's top choice was ${m.best}.`));
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
      h('table.cls-table', h('tr', h('th', ''), h('th', '⚪'), h('th', '⚫')), ...(['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'] as MoveClass[]).map(row)),
    );
    // key moments: user's mistakes & blunders
    const key = a.map((m, i) => ({ m, i })).filter(({ m, i }) => (m.cls === 'mistake' || m.cls === 'blunder') && (rec!.userColor === userSide(i) || rec!.userColor === 'both'));
    moments.replaceChildren(
      h('h3', 'Key moments to learn from'),
      key.length
        ? h('div.chips', key.map(({ m, i }) => h(`button.chip.c-${m.cls}`, { onclick: () => show(i + 1) }, `${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'} ${rec!.sans[i]}`)))
        : h('p.small.muted', 'No mistakes or blunders by you — excellent game!'),
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
      h('div.board-col', h('div.board-with-bar', evalBar, board.el), graph, h('div.demo-ctrl', h('button.btn', { onclick: () => show(0) }, '⏮'), h('button.btn', { onclick: () => show(ply - 1) }, '◀'), h('button.btn', { onclick: () => show(ply + 1) }, '▶'), h('button.btn', { onclick: () => show(fens.length - 1) }, '⏭'), h('button.btn.ghost', { onclick: () => (board.flip(), renderEvalBar()) }, '⇅'))),
      h('div.side-col', progress, detail, moments, summary, moveList),
    ),
  );
  renderAll();
  show(ply);
  if (!rec.analysis) void runAnalysis();
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
