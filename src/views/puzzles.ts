// Puzzles: hub (rating, streak, modes), rated solving, daily puzzle and custom puzzles.
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { mascot } from '../ui/coach';
import { BoardView } from '../ui/board';
import { pageHeader, tile } from '../ui/widgets';
import {
  addDays,
  customPool,
  dailyPuzzle,
  dailyStreak,
  dayKey,
  loadPuzzles,
  pickNear,
  puzzlePackSize,
  puzzleStart,
  ratingDelta,
  solverColor,
  themeCounts,
  type Puzzle,
} from '../data/puzzles';
import { PUZZLE_THEMES } from '../data/themes';
import { getPuzzleAttempts, savePuzzleAttempt, kvGet, kvSet, type PuzzleAttempt, type StudyBucket } from '../store/db';
import { bumpPuzzleStreak, getDailyLog, getDrill, getPuzzleStreak, getRushBest, markDaily } from '../store/training';
import { trackStudy } from '../store/tracker';
import { DRILLS } from '../data/drills';
import { PuzzleSolver } from './puzzle-solver';
import type { View } from '../router';
import '../styles/puzzles.css';

const bucketOf = (p: Puzzle): StudyBucket => (p.themes.some((t) => /endgame/i.test(t)) ? 'endgames' : p.themes.includes('opening') ? 'openings' : 'tactics');

export async function puzzlesView([param]: string[] = []): Promise<View> {
  if (!param) return hubView();
  if (param === 'daily') return dailyView();
  if (param === 'custom') return customView();
  return ratedView(param === 'solve' ? 'mixed' : param);
}

// ------------------------------------------------------------------ rating widget

/** Rating pill with a counting animation and a floating +N / −N. */
function ratingPill(initial: number) {
  const num = h('strong.pz-rnum', String(Math.round(initial)));
  const delta = h('span.pz-delta');
  const el = h('div.pz-rating', { title: 'Puzzle rating' }, icon('puzzle'), num, delta);
  let shown = Math.round(initial);
  let raf = 0;
  return {
    el,
    set(to: number, d: number) {
      cancelAnimationFrame(raf);
      delta.textContent = `${d > 0 ? '+' : '−'}${Math.abs(d)}`;
      delta.className = `pz-delta ${d > 0 ? 'up' : 'down'}`;
      void delta.offsetWidth;
      delta.classList.add('go');
      el.classList.toggle('up', d > 0);
      el.classList.toggle('down', d < 0);
      const from = shown;
      const target = Math.round(to);
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 700);
        shown = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
        num.textContent = String(shown);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
  };
}

function streakPill(n: number) {
  const el = h('div.pz-streak', { title: 'Solved in a row' }, icon('fire'), h('strong', String(n)));
  return {
    el,
    set(v: number) {
      el.querySelector('strong')!.textContent = String(v);
      el.classList.toggle('hot', v >= 3);
      if (v > 0) {
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      }
    },
  };
}

// ------------------------------------------------------------------ hub

async function hubView(): Promise<View> {
  const [all, rating, streak, attempts, rush3, dailyLog] = await Promise.all([
    loadPuzzles(),
    kvGet('puzzleRating', 800),
    getPuzzleStreak(),
    getPuzzleAttempts(),
    getRushBest('3min'),
    getDailyLog(),
  ]);
  const drills = await Promise.all(DRILLS.map((d) => getDrill(d.id)));
  const today = dayKey(new Date());
  const daily = dailyPuzzle(all, today);
  const dStreak = dailyStreak(dailyLog, today);
  const solved = attempts.filter((a) => a.solved).length;
  const doneToday = !!dailyLog[today];

  // daily puzzle card with a small board preview
  let mini: BoardView | null = null;
  let dailyCard: HTMLElement | null = null;
  if (daily) {
    mini = new BoardView();
    const { fen } = puzzleStart(daily);
    mini.set(fen, { orientation: solverColor(daily), movable: null });
    mini.cg.set({ viewOnly: true, coordinates: false });
    dailyCard = h(
      'a.pz-daily',
      { href: '#/puzzles/daily' },
      h('div.pz-daily-board', mini.el),
      h(
        'div.pz-daily-text',
        h('div.eyebrow', 'Daily Puzzle'),
        h('strong', new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })),
        h('div.row.small', icon('fire', dStreak ? 'hot' : ''), `${dStreak} day streak`),
        h(`span.pz-daily-cta${doneToday ? '.done' : ''}`, doneToday ? [icon('check'), 'Solved today'] : ['Solve now', icon('chevron')]),
      ),
    );
  }

  const el = h(
    'div.pz-hub',
    pageHeader('Puzzles', { icon: 'puzzle' }),
    h(
      'div.pz-hero',
      h(
        'div.pz-hero-top',
        h('div.pz-hero-face', mascot('happy')),
        h('div.grow', h('div.eyebrow', 'Puzzle rating'), h('div.pz-hero-rating', String(Math.round(rating)))),
        h('div.pz-hero-stats', h('div', icon('fire'), h('strong', String(streak.cur)), h('small', 'streak')), h('div', icon('trophy'), h('strong', String(streak.best)), h('small', 'best')), h('div', icon('check'), h('strong', String(solved)), h('small', 'solved'))),
      ),
      h('a.btn.primary.big.pz-solve', { href: '#/puzzles/solve' }, icon('puzzle'), 'Solve Puzzles'),
    ),
    dailyCard,
    h(
      'div.tiles.pz-tiles',
      tile({ href: '/rush', icon: 'bolt', title: 'Puzzle Rush', sub: 'Solve fast — 3 misses and you are out', color: '#e8964a', badge: rush3 ? `Best ${rush3}` : undefined }),
      tile({ href: '/puzzles/custom', icon: 'sliders', title: 'Custom Puzzles', sub: 'Pick themes and difficulty', color: '#5aa6e6' }),
      tile({ href: '/mistakes', icon: 'target', title: 'Learn from mistakes', sub: 'Puzzles from your own games', color: '#ee6b55' }),
      tile({ href: '/drills', icon: 'knight', title: 'Drills', sub: 'Practise endgames and finishes vs the engine', color: '#a57fe0', badge: `${drills.filter((d) => d.done).length}/${DRILLS.length}` }),
      tile({ href: '/vision', icon: 'eye', title: 'Board Vision', sub: 'Coordinates, knight jumps, hanging pieces', color: '#26c2a3' }),
    ),
    puzzlePackSize() === 0 ? h('p.small.muted.pz-note', 'Using the practice set from your lessons. The full puzzle pack is added when the app is built for release.') : null,
  );
  return { el, title: 'Puzzles', destroy: () => mini?.destroy() };
}

// ------------------------------------------------------------------ rated

async function ratedView(themeParam: string): Promise<View> {
  const all = await loadPuzzles();
  const attempts = new Map((await getPuzzleAttempts()).map((a) => [a.id, a]));
  let rating = await kvGet('puzzleRating', 800);
  const streak0 = await getPuzzleStreak();
  let theme = themeParam;

  const rPill = ratingPill(rating);
  const sPill = streakPill(streak0.cur);

  const solver = new PuzzleSolver({
    mode: 'rated',
    onNext: () => next(),
    onFirst: (p, success) => void record(p, success),
  });

  async function record(p: Puzzle, success: boolean) {
    if (attempts.has(p.id)) return;
    const d = ratingDelta(rating, p.rating, success, attempts.size);
    rating = Math.max(100, rating + d);
    const a: PuzzleAttempt = { id: p.id, solved: success, date: Date.now(), rating: p.rating };
    attempts.set(p.id, a);
    rPill.set(rating, d);
    const s = await bumpPuzzleStreak(success);
    sPill.set(s.cur);
    await savePuzzleAttempt(a);
    await kvSet('puzzleRating', rating);
  }

  const counts = themeCounts(all);
  const themeSel = h('select.select.pz-theme', {
    'aria-label': 'Puzzle theme',
    onchange: (e: Event) => {
      theme = (e.target as HTMLSelectElement).value;
      next();
    },
  }) as HTMLSelectElement;
  themeSel.append(h('option', { value: 'mixed' }, `All themes (${all.length})`));
  if (counts.get('lesson')) themeSel.append(h('option', { value: 'lesson' }, `From my lessons (${counts.get('lesson')})`));
  for (const [k, label] of Object.entries(PUZZLE_THEMES)) if (counts.get(k)) themeSel.append(h('option', { value: k }, `${label} (${counts.get(k)})`));
  themeSel.value = [...themeSel.options].some((o) => o.value === theme) ? theme : 'mixed';
  theme = themeSel.value;

  const meta = h('div.pz-meta');

  function next() {
    const pool = all.filter((p) => theme === 'mixed' || p.themes.includes(theme));
    const p = pickNear(pool, rating, attempts);
    if (!p) {
      solver.coach.say('No puzzles for this theme yet.', 'sad');
      return;
    }
    trackStudy(bucketOf(p));
    meta.replaceChildren(
      h('span.pill', `Puzzle ${p.rating}`),
      ...p.themes.filter((t) => PUZZLE_THEMES[t] && attempts.has(p.id)).map((t) => h('span.pill', PUZZLE_THEMES[t])),
    );
    solver.load(p);
  }

  solver.side.prepend(h('div.pz-side-head', themeSel, meta));
  const el = h('div.pz-page', pageHeader('Solve Puzzles', { back: '/puzzles', right: h('div.row', sPill.el, rPill.el) }), solver.el);
  next();
  return { el, title: 'Puzzles', destroy: () => solver.destroy() };
}

// ------------------------------------------------------------------ daily

async function dailyView(): Promise<View> {
  const all = await loadPuzzles();
  const now = new Date();
  const today = dayKey(now);
  let log = await getDailyLog();
  const p = dailyPuzzle(all, today);
  const strip = h('div.pz-week');
  const streakEl = h('div.pz-streak');

  const renderStrip = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    strip.replaceChildren(
      ...days.map((d) => {
        const [y, m, dd] = d.split('-').map(Number);
        const date = new Date(y, m - 1, dd);
        const st = log[d];
        return h(
          `div.pz-day${st ? `.${st}` : ''}${d === today ? '.today' : ''}`,
          h('small', date.toLocaleDateString(undefined, { weekday: 'narrow' })),
          h('span.pz-day-dot', st ? icon(st === 'solved' ? 'check' : 'close') : String(dd)),
        );
      }),
    );
    const n = dailyStreak(log, today);
    streakEl.replaceChildren(icon('fire'), h('strong', String(n)), h('span', n === 1 ? ' day' : ' days'));
    streakEl.classList.toggle('hot', n >= 3);
  };
  renderStrip();

  const solver = new PuzzleSolver({
    mode: 'daily',
    onComplete: async (_p, solved) => {
      log = await markDaily(today, solved ? 'solved' : 'failed');
      renderStrip();
    },
    onNext: () => (location.hash = '#/puzzles'),
    nextLabel: 'Back to puzzles',
  });
  solver.side.prepend(h('div.pz-daily-head', h('div.row.between', h('strong', 'Your streak'), streakEl), strip));
  const el = h('div.pz-page', pageHeader('Daily Puzzle', { back: '/puzzles', sub: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }), solver.el);
  if (p) {
    trackStudy(bucketOf(p));
    solver.load(p);
    if (log[today] === 'solved') solver.coach.say('You already solved today\'s puzzle. Play it again, or come back tomorrow for a new one!', 'happy');
  } else solver.coach.say('No puzzle available today.', 'sad');
  return { el, title: 'Daily Puzzle', destroy: () => solver.destroy() };
}

// ------------------------------------------------------------------ custom

const LEVELS = [
  { id: 'all', label: 'Any', hint: 'all ratings', min: 0, max: 4000 },
  { id: 'easy', label: 'Easy', hint: 'under 900', min: 0, max: 899 },
  { id: 'medium', label: 'Medium', hint: '900–1400', min: 900, max: 1399 },
  { id: 'hard', label: 'Hard', hint: '1400+', min: 1400, max: 4000 },
] as const;

async function customView(): Promise<View> {
  const all = await loadPuzzles();
  const saved = await kvGet<{ themes: string[]; level: string }>('puzzles:custom', { themes: [], level: 'all' });
  const counts = themeCounts(all);
  const themes = new Set(saved.themes.filter((t) => counts.get(t)));
  let level = LEVELS.find((l) => l.id === saved.level) ?? LEVELS[0];
  let solver: PuzzleSolver | null = null;
  let queue: Puzzle[] = [];
  let solvedCount = 0;
  let total = 0;

  const root = h('div.pz-page');
  const pool = () => customPool(all, [...themes], level.min, level.max);

  function setup() {
    solver?.destroy();
    solver = null;
    const startBtn = h('button.btn.primary.big', { type: 'button', onclick: () => start() });
    const chips = h('div.chips.pz-chips');
    const levelRow = h('div.segmented.pz-levels');
    const refresh = () => {
      const n = pool().length;
      startBtn.replaceChildren(icon('play_arrow'), n ? `Start · ${n} puzzle${n === 1 ? '' : 's'}` : 'No puzzles match');
      (startBtn as HTMLButtonElement).disabled = !n;
      chips.replaceChildren(
        h(`button.chip${themes.size === 0 ? '.on' : ''}`, { type: 'button', onclick: () => (themes.clear(), refresh()) }, 'All themes'),
        ...[...Object.entries(PUZZLE_THEMES), ...(counts.get('lesson') ? [['lesson', 'From my lessons'] as [string, string]] : [])]
          .filter(([k]) => counts.get(k))
          .map(([k, label]) =>
            h(`button.chip${themes.has(k) ? '.on' : ''}`, { type: 'button', 'aria-pressed': String(themes.has(k)), onclick: () => (themes.has(k) ? themes.delete(k) : themes.add(k), refresh()) }, label, h('small', ` ${counts.get(k)}`)),
          ),
      );
      levelRow.replaceChildren(
        ...LEVELS.map((l) => h(`button${l.id === level.id ? '.on' : ''}`, { type: 'button', onclick: () => ((level = l), refresh()) }, l.label, h('small', l.hint))),
      );
    };
    refresh();
    root.replaceChildren(
      pageHeader('Custom Puzzles', { back: '/puzzles', sub: 'Unrated practice — no clock, no pressure' }),
      h('div.card', h('h3', 'Difficulty'), levelRow, h('h3', 'Themes'), chips),
      startBtn,
    );
  }

  function start() {
    void kvSet('puzzles:custom', { themes: [...themes], level: level.id });
    queue = pool().sort(() => Math.random() - 0.5);
    total = queue.length;
    solvedCount = 0;
    const progress = h('span.pill');
    solver = new PuzzleSolver({
      mode: 'practice',
      onNext: () => nextOne(),
      onComplete: (_p, solved) => {
        if (solved) solvedCount++;
        progress.textContent = `${solvedCount} solved`;
      },
    });
    progress.textContent = '0 solved';
    root.replaceChildren(
      pageHeader('Custom Puzzles', { back: '/puzzles', sub: `${themes.size ? [...themes].map((t) => PUZZLE_THEMES[t] ?? 'Lessons').join(', ') : 'All themes'} · ${level.label}`, right: h('div.row', progress, h('button.btn.sm', { type: 'button', onclick: () => setup() }, icon('sliders'), 'Change')) }),
      solver.el,
    );
    nextOne();
  }

  function nextOne() {
    const p = queue.shift();
    if (!p || !solver) {
      solver?.coach.say(`That's all ${total} puzzles in this set. Nice work!`, 'excited');
      solver?.coach.setActions([{ label: 'Pick another set', primary: true, onclick: () => setup() }]);
      return;
    }
    trackStudy(bucketOf(p));
    solver.load(p);
  }

  setup();
  return { el: root, title: 'Custom Puzzles', destroy: () => solver?.destroy() };
}
