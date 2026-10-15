// Board Vision: short games that train seeing the board — coordinates, knight jumps,
// "is it defended?" and "spot the hanging piece".
import { Chess, type Square } from 'chess.js';
import type { Key } from '@lichess-org/chessground/types';
import { h } from '../ui/dom';
import { icon, type IconName } from '../ui/icons';
import { BoardView } from '../ui/board';
import { mascot } from '../ui/coach';
import { pageHeader, segmented, tile } from '../ui/widgets';
import { playSound } from '../ui/sound';
import { NAME } from '../chess/util';
import { loadPuzzles, puzzleStart } from '../data/puzzles';
import { defendedQuestion, hangingQuestion, knightTargets, randomSquare, squareAt, type Rnd } from '../data/vision';
import { getVisionBest, saveVisionBest } from '../store/training';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';
import '../styles/puzzles.css';

type Game = 'coords' | 'knight' | 'defended' | 'hanging';

const GAMES: Record<Game, { title: string; sub: string; icon: IconName; color: string; timed?: number; rounds?: number }> = {
  coords: { title: 'Coordinates', sub: 'A square name appears — tap it. 30 seconds.', icon: 'grid', color: '#26c2a3', timed: 30_000 },
  knight: { title: 'Knight moves', sub: 'Tap every square the knight can jump to. 45 seconds.', icon: 'knight', color: '#a57fe0', timed: 45_000 },
  defended: { title: 'Is it defended?', sub: 'Does another piece protect the highlighted one? 10 questions.', icon: 'shield', color: '#5aa6e6', rounds: 10 },
  hanging: { title: 'Spot the hanging piece', sub: 'Tap the piece that can be taken for free. 10 positions.', icon: 'target', color: '#ee6b55', rounds: 10 },
};

const EMPTY = '8/8/8/8/8/8/8/8';
const rnd: Rnd = Math.random;

export async function visionView(): Promise<View> {
  const root = h('div.vision');
  let cleanup: (() => void) | null = null;
  // real positions from puzzles and lessons make the "defended" and "hanging" games feel like chess
  const pool = (await loadPuzzles()).map((p) => puzzleStart(p).fen);

  async function hub() {
    cleanup?.();
    cleanup = null;
    trackStudy(null);
    const bests = await Promise.all((Object.keys(GAMES) as Game[]).map((g) => getVisionBest(g === 'coords' ? 'coords:white' : g)));
    root.replaceChildren(
      pageHeader('Board Vision', { back: '/puzzles', icon: 'eye', sub: 'Quick games that make you see the board faster' }),
      h(
        'div.tiles',
        (Object.keys(GAMES) as Game[]).map((g, i) =>
          tile({ onclick: () => start(g), icon: GAMES[g].icon, title: GAMES[g].title, sub: GAMES[g].sub, color: GAMES[g].color, badge: bests[i] ? `Best ${bests[i]}` : undefined }),
        ),
      ),
    );
  }

  function start(game: Game) {
    cleanup?.();
    const s = session(game, pool, () => void hub());
    cleanup = s.destroy;
    root.replaceChildren(s.el);
  }

  await hub();
  return { el: root, title: 'Board Vision', destroy: () => cleanup?.() };
}

function session(game: Game, pool: string[], back: () => void) {
  trackStudy('tactics');
  const cfg = GAMES[game];
  const board = new BoardView();
  const box = h('div.vi-board.pz-board', board.el);
  const target = h('div.vi-target');
  box.append(target);
  const clock = h('div.rush-clock', icon(cfg.timed ? 'clock' : 'check'), h('span'));
  const scoreEl = h('div.rush-score', '0');
  const streakEl = h('div.pz-streak', { style: 'justify-self:end' }, icon('fire'), h('strong', '0'));
  const prompt = h('div.vi-prompt');
  const answers = h('div.vi-answers');
  const side = h('div.vi-side');
  let orientation: 'white' | 'black' = 'white';
  let score = 0;
  let streak = 0;
  let round = 0;
  let running = false;
  let started = 0;
  let tick = 0;
  let timers: number[] = [];
  let onTap: ((sq: Square) => void) | null = null;
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

  const setStreak = (v: number) => {
    streak = v;
    streakEl.querySelector('strong')!.textContent = String(v);
    streakEl.classList.toggle('hot', v >= 3);
  };
  const addScore = () => {
    score++;
    scoreEl.textContent = String(score);
    scoreEl.classList.remove('bump');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('bump');
    setStreak(streak + 1);
  };
  const miss = () => {
    setStreak(0);
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    playSound('bad');
  };

  // taps → squares (works on an empty board, where chessground has nothing to select)
  board.el.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (!running || !onTap) return;
      const r = board.el.getBoundingClientRect();
      const sq = squareAt(e.clientX - r.left, e.clientY - r.top, r.width, orientation);
      if (sq) onTap(sq);
    },
    { capture: true },
  );

  function showFen(fen: string) {
    // positions may be king-less (one knight) — give them straight to chessground
    board.cg.set({ fen, lastMove: undefined, movable: { color: undefined, dests: new Map() }, orientation, check: undefined, selected: undefined });
    board.arrows([]);
    board.highlight({});
  }

  function updateClock() {
    if (cfg.timed) {
      const left = Math.max(0, cfg.timed - (Date.now() - started));
      clock.querySelector('span')!.textContent = `${Math.ceil(left / 1000)}s`;
      clock.classList.toggle('low', left < 8000);
      if (left === 0) finish();
    } else clock.querySelector('span')!.textContent = `${Math.min(round + 1, cfg.rounds!)}/${cfg.rounds}`;
  }

  // ---------------------------------------------------------------- games
  function nextCoord(prev?: string) {
    const sq = randomSquare(rnd, prev);
    target.replaceChildren(h('span', sq));
    onTap = (t) => {
      if (t === sq) {
        board.flash([t], 'green', 500);
        playSound('move');
        addScore();
      } else {
        board.flash([t], 'red', 600);
        board.flash([sq], 'green', 900);
        miss();
      }
      nextCoord(sq);
    };
  }

  function nextKnight(prev?: string) {
    const sq = randomSquare(rnd, prev);
    const targets = new Set(knightTargets(sq));
    const found = new Set<string>();
    const g = new Chess();
    g.clear();
    g.put({ type: 'n', color: orientation === 'white' ? 'w' : 'b' }, sq);
    showFen(g.fen().split(' ')[0]);
    board.highlight({ [sq]: 'yellow' });
    prompt.replaceChildren(`Knight on ${sq}: tap all ${targets.size} squares it can reach`);
    onTap = (t) => {
      if (found.has(t)) return;
      if (targets.has(t)) {
        found.add(t);
        playSound('move');
        board.arrows([...found].map((f) => ({ orig: f as Key, brush: 'green' })));
        if (found.size === targets.size) {
          addScore();
          board.arrows([...found].map((f) => ({ orig: sq as Key, dest: f as Key, brush: 'paleGreen' })));
          onTap = null;
          later(() => nextKnight(sq), 450);
        }
      } else {
        board.flash([t], 'red', 600);
        miss();
      }
    };
  }

  function nextDefended() {
    if (round >= cfg.rounds!) return finish();
    updateClock();
    const q = defendedQuestion(rnd, pool);
    const g = new Chess(q.fen);
    const p = g.get(q.sq)!;
    showFen(q.fen);
    board.highlight({ [q.sq]: 'yellow' });
    prompt.replaceChildren(`Is the ${p.color === 'w' ? 'white' : 'black'} ${NAME[p.type]} on ${q.sq} defended?`);
    const answer = (yes: boolean) => {
      if (!running) return;
      const ok = yes === q.defended;
      [...answers.children].forEach((b, i) => {
        (b as HTMLButtonElement).disabled = true;
        if ((i === 0) === q.defended) b.classList.add('good');
        else if (!ok) b.classList.add('bad');
      });
      if (ok) {
        addScore();
        playSound('good');
      } else miss();
      if (q.defended) board.arrows(q.defenders.map((d) => ({ orig: d as Key, dest: q.sq as Key, brush: 'green' })));
      else board.flash([q.sq], 'red', 1200);
      round++;
      later(nextDefended, ok ? 1100 : 1900);
    };
    answers.replaceChildren(
      h('button.btn', { type: 'button', onclick: () => answer(true) }, icon('shield'), 'Defended'),
      h('button.btn', { type: 'button', onclick: () => answer(false) }, icon('close'), 'Not defended'),
    );
  }

  function nextHanging() {
    if (round >= cfg.rounds!) return finish();
    updateClock();
    const q = hangingQuestion(rnd, pool);
    showFen(q.fen);
    prompt.replaceChildren('Tap the piece that is attacked and not defended');
    onTap = (t) => {
      onTap = null;
      const ok = t === q.sq;
      if (ok) {
        addScore();
        playSound('good');
        board.flash([t], 'green', 900);
      } else {
        board.flash([t], 'red', 700);
        board.flash([q.sq], 'green', 1500);
        miss();
      }
      board.arrows(q.attackers.map((a) => ({ orig: a as Key, dest: q.sq as Key, brush: 'red' })));
      round++;
      later(nextHanging, ok ? 1100 : 1900);
    };
  }

  // ---------------------------------------------------------------- flow
  function begin() {
    timers.forEach(clearTimeout);
    timers = [];
    score = 0;
    round = 0;
    scoreEl.textContent = '0';
    setStreak(0);
    running = true;
    started = Date.now();
    board.setOrientation(orientation);
    board.badge(null);
    target.replaceChildren();
    answers.replaceChildren();
    prompt.replaceChildren(game === 'coords' ? 'Tap the square' : '');
    box.classList.toggle('show-coords', game !== 'coords');
    layout();
    clearInterval(tick);
    tick = window.setInterval(updateClock, 200);
    updateClock();
    if (game === 'coords') {
      showFen(EMPTY);
      nextCoord();
    } else if (game === 'knight') nextKnight();
    else if (game === 'defended') nextDefended();
    else nextHanging();
  }

  async function finish() {
    if (!running) return;
    running = false;
    onTap = null;
    clearInterval(tick);
    timers.forEach(clearTimeout);
    timers = [];
    target.replaceChildren();
    playSound('end');
    const key = game === 'coords' ? `coords:${orientation}` : game;
    const prev = await saveVisionBest(key, score);
    const record = score > prev && score > 0;
    side.replaceChildren(
      h(
        'div.card.rush-result',
        mascot(record ? 'excited' : score ? 'happy' : 'neutral'),
        h('div.eyebrow', cfg.title),
        h('div.rush-final', String(score)),
        cfg.rounds ? h('div.muted', `out of ${cfg.rounds}`) : null,
        record ? h('div.rush-newbest', icon('trophy'), 'New personal best!') : h('div.muted', `Best: ${Math.max(prev, score)}`),
      ),
      h('button.btn.primary.big', { type: 'button', onclick: begin }, icon('replay'), 'Play again'),
      h('button.btn.ghost', { type: 'button', onclick: back }, 'Other games'),
    );
  }

  function layout() {
    side.replaceChildren(prompt, answers, h('button.btn.ghost', { type: 'button', onclick: () => void finish() }, 'Stop'));
  }

  function intro() {
    running = false;
    showFen(game === 'coords' ? EMPTY : '8/8/8/8/8/8/8/8');
    box.classList.toggle('show-coords', game !== 'coords');
    const sideSel =
      game === 'coords' || game === 'knight'
        ? h('div', h('div.eyebrow', 'Play from'), segmented([{ value: 'white', label: 'White side' }, { value: 'black', label: 'Black side' }], orientation, (v) => ((orientation = v), board.setOrientation(v))))
        : null;
    side.replaceChildren(
      h('div.card.rush-intro', mascot('happy'), h('p', cfg.sub)),
      sideSel ?? '',
      h('button.btn.primary.big', { type: 'button', onclick: begin }, icon('play_arrow'), 'Start'),
    );
  }

  const el = h(
    'div.vision-game',
    h('div.dr-head', h('button.icon-btn', { type: 'button', 'aria-label': 'Board Vision games', onclick: back }, icon('back')), h('h1.grow', cfg.title)),
    h('div.play-layout', h('div.board-col', h('div.vi-bar', clock, scoreEl, streakEl), box), h('div.side-col', side)),
  );
  board.cg.set({ viewOnly: false, draggable: { enabled: false }, selectable: { enabled: false } });
  intro();
  updateClock();
  return {
    el,
    destroy: () => {
      running = false;
      clearInterval(tick);
      timers.forEach(clearTimeout);
      board.destroy();
    },
  };
}
