import { Chess } from 'chess.js';
import { h, rich, setChildren } from '../ui/dom';
import { BoardView, arrow, type UserMove } from '../ui/board';
import { playSound } from '../ui/sound';
import { loadPuzzles, type Puzzle } from '../data/puzzles';
import { PUZZLE_THEMES } from '../data/themes';
import { getPuzzleAttempts, savePuzzleAttempt, kvGet, kvSet, type StudyBucket } from '../store/db';
import { trackStudy } from '../store/tracker';
import { engine } from '../engine/engine';
import { explainBest } from '../chess/explain';
import { moveToUci, turnColor } from '../chess/util';
import type { View } from '../router';

const eloExpected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

export async function puzzlesView([themeParam]: string[] = []): Promise<View> {
  const all = await loadPuzzles();
  const attempts = new Map((await getPuzzleAttempts()).map((a) => [a.id, a]));
  let rating = await kvGet('puzzleRating', 800);
  let streak = 0;
  let theme = themeParam ?? 'mixed';
  let current: Puzzle | null = null;
  let timers: number[] = [];

  const board = new BoardView({ onMove: (m) => onMove(m) });
  const info = h('div.puzzle-info');
  const status = h('div.try-status');
  const explainBox = h('div.hints');
  const actions = h('div.row.wrap');
  const ratingEl = h('span.pill.big');
  const streakEl = h('span.pill');
  const themeSel = h('select.select', { 'aria-label': 'Puzzle theme', onchange: (e: Event) => ((theme = (e.target as HTMLSelectElement).value), next()) });

  const counts = new Map<string, number>();
  for (const p of all) for (const t of p.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
  themeSel.append(h('option', { value: 'mixed' }, `Mixed (${all.length})`));
  if (counts.get('lesson')) themeSel.append(h('option', { value: 'lesson' }, `From my lessons (${counts.get('lesson')})`));
  for (const [k, label] of Object.entries(PUZZLE_THEMES)) if (counts.get(k)) themeSel.append(h('option', { value: k }, `${label} (${counts.get(k)})`));
  (themeSel as HTMLSelectElement).value = [...themeSel.querySelectorAll('option')].some((o) => (o as HTMLOptionElement).value === theme) ? theme : 'mixed';
  theme = (themeSel as HTMLSelectElement).value;

  let g = new Chess();
  let ply = 0;
  let failed = false;
  let solved = false;
  let solver: 'white' | 'black' = 'white';

  const bucketOf = (p: Puzzle): StudyBucket => (p.themes.some((t) => /endgame/i.test(t)) ? 'endgames' : p.themes.includes('opening') ? 'openings' : 'tactics');
  const refreshHead = () => {
    ratingEl.textContent = `Puzzle rating ${Math.round(rating)}`;
    streakEl.textContent = `🔥 ${streak}`;
  };

  function pick(): Puzzle | null {
    const pool = all.filter((p) => theme === 'mixed' || p.themes.includes(theme));
    if (!pool.length) return null;
    const fresh = pool.filter((p) => !attempts.has(p.id));
    const src = fresh.length ? fresh : pool;
    for (const width of [150, 300, 600, 5000]) {
      const near = src.filter((p) => Math.abs(p.rating - rating) <= width);
      if (near.length) return near[Math.floor(Math.random() * near.length)];
    }
    return src[Math.floor(Math.random() * src.length)];
  }

  function next() {
    clearTimers();
    engine.cancelAll();
    current = pick();
    explainBox.replaceChildren();
    if (!current) {
      info.replaceChildren(h('p', 'No puzzles for this theme.'));
      return;
    }
    trackStudy(bucketOf(current));
    g = new Chess(current.fen);
    ply = 0;
    failed = false;
    solved = false;
    solver = current.setup ? (turnColor(current.fen) === 'white' ? 'black' : 'white') : turnColor(current.fen);
    board.clearAnnotations();
    board.set(current.fen, { orientation: solver, movable: null });
    const tags = current.themes.filter((t) => PUZZLE_THEMES[t]).map((t) => h('span.chip.static', PUZZLE_THEMES[t]));
    info.replaceChildren(
      h('div.to-move', `${solver === 'white' ? '⚪ White' : '⚫ Black'} to move — find the best move`),
      h('div.row.wrap.small', h('span.muted', `Rating ${current.rating}`), ...tags),
    );
    status.replaceChildren();
    renderActions();
    if (current.setup) {
      timers.push(window.setTimeout(() => autoPlay(), 700));
    } else {
      board.set(g.fen(), { orientation: solver, movable: solver });
    }
  }

  function autoPlay() {
    if (!current || ply >= current.moves.length) return;
    const u = current.moves[ply];
    const mv = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    ply++;
    board.playMove(g.fen(), mv.from, mv.to, !!mv.captured, solver);
    board.arrows([]); // hints/explanations were for the previous position
  }

  function renderActions() {
    setChildren(
      actions,
      solved || failed ? h('button.btn.primary', { onclick: next }, 'Next puzzle ›') : h('button.btn', { onclick: hint }, 'Hint'),
      !solved ? h('button.btn.ghost', { onclick: showSolution }, 'Show solution') : null,
      h('button.btn.ghost', { onclick: explain }, 'Explain move'),
      failed && !solved ? h('button.btn.ghost', { onclick: retry }, 'Retry') : null,
    );
  }

  async function record(success: boolean) {
    if (!current || attempts.has(current.id)) return;
    const exp = eloExpected(rating, current.rating);
    const k = attempts.size < 20 ? 40 : 20;
    rating = Math.max(100, rating + k * ((success ? 1 : 0) - exp));
    const a = { id: current.id, solved: success, date: Date.now(), rating: current.rating };
    attempts.set(current.id, a);
    await savePuzzleAttempt(a);
    await kvSet('puzzleRating', rating);
    streak = success ? streak + 1 : 0;
    refreshHead();
  }

  function onMove(m: UserMove) {
    if (!current || solved) return;
    const expected = current.moves[ply];
    let mv;
    try {
      mv = g.move(m);
    } catch {
      board.set(g.fen(), { orientation: solver, movable: solver });
      return;
    }
    const uci = moveToUci(mv);
    if (uci === expected || g.isCheckmate()) {
      ply++;
      board.arrows([]);
      playSound(mv.captured ? 'capture' : 'move');
      board.set(g.fen(), { lastMove: [mv.from, mv.to], orientation: solver, movable: null });
      if (ply >= current.moves.length || g.isCheckmate()) {
        solved = true;
        playSound('good');
        status.replaceChildren(h('div.banner.good', failed ? '✓ Solved (after a miss)' : '✓ Solved!'));
        void record(!failed);
        renderActions();
        return;
      }
      status.replaceChildren(h('div.banner.good', `✓ ${mv.san} — keep going!`));
      timers.push(window.setTimeout(() => autoPlay(), 450));
    } else {
      g.undo();
      playSound('bad');
      if (!failed) void record(false);
      failed = true;
      status.replaceChildren(h('div.banner.bad', `✗ ${mv.san} is not the best move. Try again, or tap Explain.`));
      renderActions();
      timers.push(window.setTimeout(() => board.set(g.fen(), { orientation: solver, movable: solver, lastMove: undefined }), 450));
    }
  }

  function hint() {
    if (!current || solved) return;
    const u = current.moves[ply];
    board.arrows([{ orig: u.slice(0, 2) as never, brush: 'yellow' }]);
    status.replaceChildren(h('div.banner.info', 'Hint: the highlighted piece is the one to move.'));
    if (!failed) void record(false);
    failed = true;
    renderActions();
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function retry() {
    if (!current) return;
    clearTimers();
    board.arrows([]);
    const p = current;
    g = new Chess(p.fen);
    ply = 0;
    board.set(p.fen, { orientation: solver });
    if (p.setup) autoPlay();
    else board.set(g.fen(), { orientation: solver, movable: solver });
    status.replaceChildren();
  }

  function showSolution() {
    if (!current) return;
    clearTimers();
    if (!failed) void record(false);
    failed = true;
    const sans: string[] = [];
    while (ply < current.moves.length) {
      const u = current.moves[ply];
      const mv = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      sans.push(mv.san);
      ply++;
    }
    solved = true;
    const last = g.history({ verbose: true }).pop();
    board.set(g.fen(), { orientation: solver, lastMove: last ? [last.from, last.to] : undefined });
    board.arrows([]);
    status.replaceChildren(h('div.banner.info', `Solution: ${sans.join(' ')}`));
    renderActions();
  }

  async function explain() {
    if (!current) return;
    // explain the solver's next (or last) solution move
    const i = Math.min(ply, current.moves.length - 1);
    const g2 = new Chess(current.fen);
    for (let k = 0; k < i; k++) {
      const u = current.moves[k];
      g2.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    }
    const fen = g2.fen();
    const u = current.moves[i];
    explainBox.replaceChildren(h('div.hint', 'Analysing…'));
    const p = current;
    const r = await engine.analyse(fen, { depth: 14 });
    if (current !== p) return; // moved on to another puzzle meanwhile
    const pv = r.lines[0]?.pv[0] === u ? r.lines[0].pv : [u, ...current.moves.slice(i + 1)];
    board.arrows([arrow(u)]);
    explainBox.replaceChildren(h('div.hint', rich(`💡 ${explainBest(fen, u, pv)}`)));
    if (!solved && !failed) {
      void record(false);
      failed = true;
      renderActions();
    }
  }

  refreshHead();
  const el = h(
    'div.page.puzzles',
    h('div.row.between', h('h1', 'Puzzles'), h('div.row', ratingEl, streakEl)),
    h('div.play-layout', h('div.board-col', board.el), h('div.side-col', h('label.small.muted', 'Theme'), themeSel, info, status, explainBox, actions)),
  );
  next();
  return {
    el,
    destroy: () => {
      timers.forEach(clearTimeout);
      engine.cancelAll();
      board.destroy();
    },
  };
}
