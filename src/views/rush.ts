// Puzzle Rush: 3 min, 5 min or Survival; 3 misses end the run; puzzles get harder as you go.
import { h, fmtClock } from '../ui/dom';
import { icon } from '../ui/icons';
import { mascot } from '../ui/coach';
import { pageHeader } from '../ui/widgets';
import { playSound } from '../ui/sound';
import { loadPuzzles, type Puzzle } from '../data/puzzles';
import { PUZZLE_THEMES } from '../data/themes';
import { MAX_STRIKES, RUSH_MODES, answer, isOver, newRun, pickRush, rushPool, score, strikes, timeLeft, type RushMode, type RushRun } from '../data/rush';
import { getRushBest, saveRush } from '../store/training';
import { kvGet, kvSet } from '../store/db';
import { trackStudy } from '../store/tracker';
import { PuzzleSolver } from './puzzle-solver';
import type { View } from '../router';
import '../styles/puzzles.css';

export async function rushView(): Promise<View> {
  const all = rushPool(await loadPuzzles());
  const root = h('div.rush');
  let mode = await kvGet<RushMode>('rush:mode', '3min');
  let solver: PuzzleSolver | null = null;
  let tick = 0;
  let pending = 0;

  const stop = () => {
    clearInterval(tick);
    clearTimeout(pending);
    solver?.destroy();
    solver = null;
  };

  // ---------------------------------------------------------------- start screen
  async function startScreen() {
    stop();
    trackStudy(null);
    const bests = Object.fromEntries(await Promise.all((Object.keys(RUSH_MODES) as RushMode[]).map(async (m) => [m, await getRushBest(m)] as const)));
    const list = h('div.rush-modes');
    const render = () =>
      list.replaceChildren(
        ...(Object.keys(RUSH_MODES) as RushMode[]).map((m) =>
          h(
            `button.rush-mode${m === mode ? '.on' : ''}`,
            { type: 'button', 'aria-pressed': String(m === mode), onclick: () => ((mode = m), render()) },
            h('span.tile-icon', icon(m === 'survival' ? 'heart' : 'clock')),
            h('span.grow', h('strong', RUSH_MODES[m].label), h('small', RUSH_MODES[m].sub)),
            h('span.rush-best', h('small', 'Best'), h('strong', String(bests[m] ?? 0))),
          ),
        ),
      );
    render();
    root.replaceChildren(
      pageHeader('Puzzle Rush', { back: '/puzzles', icon: 'bolt' }),
      h('div.card.rush-intro', mascot('excited'), h('p', 'Solve as many puzzles as you can. They start easy and get harder. ', h('strong', 'Three misses'), ' and the run is over.')),
      list,
      h('button.btn.primary.big', { type: 'button', onclick: () => void kvSet('rush:mode', mode).then(run) }, icon('play_arrow'), 'Start'),
    );
  }

  // ---------------------------------------------------------------- run
  function run() {
    stop();
    let r: RushRun = newRun(mode, Date.now());
    const used = new Set<string>();
    const missed: Puzzle[] = [];
    let n = 0;
    let finished = false;

    const clock = h('div.rush-clock', icon(RUSH_MODES[mode].ms ? 'clock' : 'heart'), h('span'));
    const scoreEl = h('div.rush-score', '0');
    const xs = Array.from({ length: MAX_STRIKES }, () => h('span.rush-x', icon('close')));
    const trail = h('div.rush-trail');

    solver = new PuzzleSolver({
      mode: 'rush',
      coach: false,
      onComplete: (p, solved) => {
        if (finished) return;
        r = answer(r, p, solved);
        trail.append(h(`span.${solved ? 'ok' : 'no'}`, icon(solved ? 'check' : 'close')));
        if (solved) {
          scoreEl.textContent = String(score(r));
          scoreEl.classList.remove('bump');
          void scoreEl.offsetWidth;
          scoreEl.classList.add('bump');
          const plus = h('div.rush-plus', '+1');
          solver!.boardBox.append(plus);
          setTimeout(() => plus.remove(), 900);
        } else {
          missed.push(p);
          xs.slice(0, strikes(r)).forEach((x) => x.classList.add('on'));
        }
        if (isOver(r, Date.now())) return void finish();
        pending = window.setTimeout(next, solved ? 450 : 50);
      },
    });

    const updateClock = () => {
      const t = timeLeft(r, Date.now());
      clock.querySelector('span')!.textContent = t === null ? 'Survival' : fmtClock(t);
      clock.classList.toggle('low', t !== null && t < 15_000);
      if (t === 0) finish();
    };

    function next() {
      if (finished || !solver) return;
      const p = pickRush(all, n++, used);
      if (!p) return void finish();
      used.add(p.id);
      solver.load(p);
    }

    async function finish() {
      if (finished) return;
      finished = true;
      clearInterval(tick);
      playSound('end');
      const { prevBest, best } = await saveRush(r);
      results(r, missed, prevBest, best);
    }

    root.replaceChildren(
      h('div.dr-head', h('button.icon-btn', { type: 'button', 'aria-label': 'Quit run', onclick: () => void finish() }, icon('close')), h('h1.grow', `Puzzle Rush · ${RUSH_MODES[mode].label}`)),
      h('div.rush-bar', clock, scoreEl, h('div.rush-strikes', xs)),
      solver.el,
    );
    // the result trail sits under the board on phones and in the side column on desktop
    solver.side.append(trail);
    trackStudy('tactics');
    updateClock();
    tick = window.setInterval(updateClock, 200);
    next();
  }

  // ---------------------------------------------------------------- results
  function results(r: RushRun, missed: Puzzle[], prevBest: number, best: number) {
    stop();
    const s = score(r);
    const record = s > prevBest && s > 0;
    root.replaceChildren(
      pageHeader('Puzzle Rush', { back: '/puzzles', icon: 'bolt' }),
      h(
        'div.card.rush-result',
        mascot(record ? 'excited' : s >= 5 ? 'happy' : 'neutral'),
        h('div.eyebrow', `${RUSH_MODES[r.mode].label} · score`),
        h('div.rush-final', String(s)),
        record ? h('div.rush-newbest', icon('trophy'), 'New personal best!') : h('div.muted', `Best: ${best}`),
        h('div.rush-trail', { style: 'justify-content:center' }, r.results.map((x) => h(`span.${x.ok ? 'ok' : 'no'}`, icon(x.ok ? 'check' : 'close')))),
      ),
      h('div.row', h('button.btn.primary.big', { type: 'button', onclick: run }, icon('replay'), 'Play again')),
      h('button.btn.ghost', { type: 'button', style: 'width:100%;margin-top:8px', onclick: () => void startScreen() }, 'Change mode'),
      missed.length ? h('h3', 'Review your misses') : '',
      h(
        'div.rush-missed',
        missed.map((p) =>
          h(
            'button.tile',
            { type: 'button', onclick: () => review(p, () => results(r, missed, prevBest, best)) },
            h('span.tile-icon', icon('puzzle')),
            h('span.tile-text', h('strong', `Puzzle ${p.rating}`), h('small', p.themes.map((t) => PUZZLE_THEMES[t]).filter(Boolean).join(' · ') || 'Tactics')),
            h('span.tile-chev', icon('chevron')),
          ),
        ),
      ),
    );
  }

  function review(p: Puzzle, back: () => void) {
    stop();
    solver = new PuzzleSolver({ mode: 'practice', onNext: back, nextLabel: 'Back to results' });
    root.replaceChildren(h('div.dr-head', h('button.icon-btn', { type: 'button', 'aria-label': 'Back to results', onclick: back }, icon('back')), h('h1.grow', 'Review')), solver.el);
    solver.load(p);
  }

  await startScreen();
  return { el: root, title: 'Puzzle Rush', destroy: stop };
}
