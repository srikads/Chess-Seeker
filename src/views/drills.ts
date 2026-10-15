// Drills: practise key endgames and finishing patterns against Stockfish (on-device) until the goal is reached.
import { Chess, type Color } from 'chess.js';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { BoardView, type UserMove } from '../ui/board';
import { Coach, type CoachAction } from '../ui/coach';
import { pageHeader } from '../ui/widgets';
import { playSound } from '../ui/sound';
import { engine } from '../engine/engine';
import { pvToSan, uciToMove } from '../chess/util';
import { DRILLS, drillOutcome, type Drill } from '../data/drills';
import { getDrill, saveDrill } from '../store/training';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';
import '../styles/puzzles.css';

const GROUP_ICON = { Checkmates: 'target', 'Pawn endgames': 'flag', 'Rook endgames': 'shield', Tactics: 'bolt' } as const;

export async function drillsView(): Promise<View> {
  const root = h('div.drills');
  let cleanup: (() => void) | null = null;

  async function list() {
    cleanup?.();
    cleanup = null;
    trackStudy(null);
    const recs = new Map(await Promise.all(DRILLS.map(async (d) => [d.id, await getDrill(d.id)] as const)));
    const groups = [...new Set(DRILLS.map((d) => d.group))];
    const done = DRILLS.filter((d) => recs.get(d.id)?.done).length;
    root.replaceChildren(
      pageHeader('Drills', { back: '/puzzles', icon: 'knight', sub: `${done} of ${DRILLS.length} completed · play them out against the engine` }),
      ...groups.flatMap((g) => [
        h('h3.dr-group', g),
        h(
          'div.tiles',
          DRILLS.filter((d) => d.group === g).map((d) => {
            const r = recs.get(d.id)!;
            return h(
              `button.tile.dr-item${r.done ? '.done' : ''}`,
              { type: 'button', onclick: () => open(d) },
              h('span.tile-icon', icon(r.done ? 'check' : GROUP_ICON[d.group])),
              h(
                'span.tile-text',
                h('strong', d.title, h('span.dr-level', { 'aria-label': `Level ${d.level}` }, [1, 2, 3].map((k) => icon('star', k <= d.level ? '' : 'off')))),
                h('small', d.goalText, r.done && r.bestMoves ? ` · best: ${r.bestMoves} move${r.bestMoves === 1 ? '' : 's'}` : r.attempts ? ` · ${r.attempts} tr${r.attempts === 1 ? 'y' : 'ies'}` : ''),
              ),
              h('span.tile-chev', icon('chevron')),
            );
          }),
        ),
      ]),
    );
  }

  function open(d: Drill) {
    cleanup?.();
    const s = drillSession(d, () => void list(), (next) => open(next));
    cleanup = s.destroy;
    root.replaceChildren(s.el);
    window.scrollTo(0, 0);
  }

  await list();
  return { el: root, title: 'Drills', destroy: () => cleanup?.() };
}

function drillSession(d: Drill, back: () => void, openDrill: (d: Drill) => void) {
  trackStudy(d.group === 'Tactics' ? 'tactics' : 'endgames');
  const learner: Color = d.fen.split(' ')[1] as Color;
  const side = learner === 'w' ? 'white' : 'black';
  let g = new Chess(d.fen);
  let moves = 0;
  let tip = 0;
  let over = false;
  let thinking = false;
  let alive = true;
  let anim: AbortController | null = null;

  const board = new BoardView({ onMove: (m) => void userMove(m) });
  const coach = new Coach(board);
  const counter = h('span.dr-count');
  const goal = h('div.dr-goal', icon('target'), h('span.grow', d.goalText), counter);
  const footer = h('div.pz-footer');

  const refreshCounter = () => {
    const left = d.maxMoves - moves;
    counter.textContent = d.goal === 'draw' ? `${moves}/${d.maxMoves}` : `${left} left`;
    counter.classList.toggle('low', d.goal !== 'draw' && left <= 2);
  };

  function setActions(extra: CoachAction[] = []) {
    coach.setActions([
      ...(over ? [] : [{ label: 'Tip', icon: 'hint' as const, onclick: showTip }]),
      { label: 'Restart', icon: 'replay', onclick: restart },
      ...extra,
    ]);
  }

  function showTip() {
    coach.say(d.tips[tip % d.tips.length], 'thinking', { fen: g.fen() });
    tip++;
  }

  function restart() {
    anim?.abort();
    engine.cancelAll();
    g = new Chess(d.fen);
    moves = 0;
    over = false;
    thinking = false;
    board.clearAnnotations();
    board.badge(null);
    board.set(d.fen, { orientation: side, movable: side });
    footer.replaceChildren();
    refreshCounter();
    coach.say(d.intro, 'neutral', { fen: d.fen });
    setActions();
  }

  async function userMove(m: UserMove) {
    if (over || thinking) return;
    let mv;
    try {
      mv = g.move(m);
    } catch {
      board.set(g.fen(), { orientation: side, movable: side });
      return;
    }
    moves++;
    refreshCounter();
    board.arrows([]);
    board.set(g.fen(), { lastMove: [mv.from, mv.to], movable: null });
    playSound(g.inCheck() ? 'check' : mv.captured ? 'capture' : 'move');
    if (check()) return;
    thinking = true;
    try {
      const r = await engine.analyse(g.fen(), { movetime: 350 });
      if (!alive || over) return;
      const reply = g.move(uciToMove(r.bestmove));
      board.playMove(g.fen(), reply.from, reply.to, !!reply.captured, side);
    } catch {
      coach.say('The engine could not start on this device, so drills are unavailable right now.', 'sad');
      return;
    } finally {
      thinking = false;
    }
    check();
  }

  /** Returns true when the drill ended. */
  function check(): boolean {
    const out = drillOutcome(d, g, learner, moves);
    if (!out.done) return false;
    over = true;
    counter.textContent = `${moves} move${moves === 1 ? '' : 's'}`;
    counter.classList.remove('low');
    board.set(g.fen(), { lastMove: lastMove(), movable: null });
    void saveDrill(d.id, out.success, moves);
    const last = g.history({ verbose: true }).at(-1);
    if (out.success) {
      playSound('good');
      if (last) board.badge(last.to, 'best');
      coach.say(out.reason + (d.goal !== 'draw' ? ` You needed ${moves} move${moves === 1 ? '' : 's'}.` : ''), 'excited', { title: 'Drill complete' });
      const idx = DRILLS.indexOf(d);
      const next = DRILLS[idx + 1];
      setActions();
      footer.replaceChildren(
        next
          ? h('button.btn.primary.big.pz-next', { type: 'button', onclick: () => openDrill(next) }, 'Next drill', icon('next'))
          : h('button.btn.primary.big.pz-next', { type: 'button', onclick: back }, 'All drills', icon('next')),
      );
    } else {
      playSound('bad');
      coach.say(`${out.reason} Want to see how it's done?`, 'worried', { title: 'Not this time' });
      setActions([{ label: 'Show me', icon: 'play_arrow', primary: true, onclick: () => void showMe() }]);
    }
    return true;
  }

  const lastMove = (): [string, string] | undefined => {
    const m = g.history({ verbose: true }).at(-1);
    return m ? [m.from, m.to] : undefined;
  };

  async function showMe() {
    anim?.abort();
    const ctrl = (anim = new AbortController());
    coach.say('Let me think…', 'thinking');
    coach.setActions([]);
    board.clearAnnotations();
    board.badge(null);
    try {
      const r = await engine.analyse(d.fen, { depth: 18 });
      if (ctrl.signal.aborted || !alive) return;
      const sans = pvToSan(d.fen, r.lines[0]?.pv ?? [], 16);
      coach.say(`Watch: ${d.tips[0]}`, 'neutral', { fen: d.fen });
      board.set(d.fen, { orientation: side, movable: null });
      await board.playLine(d.fen, sans, { delay: 850, signal: ctrl.signal, brush: 'green' });
      if (ctrl.signal.aborted || !alive) return;
      coach.say('Your turn. Try it again!', 'happy');
      setActions([{ label: 'Try again', icon: 'replay', primary: true, onclick: restart }]);
    } catch {
      coach.say('The engine is not available right now.', 'sad');
      setActions();
    }
  }

  const el = h(
    'div.drill',
    h('div.dr-head', h('button.icon-btn', { type: 'button', 'aria-label': 'All drills', onclick: back }, icon('back')), h('h1.grow', d.title)),
    h('div.play-layout', h('div.board-col', goal, board.el), h('div.side-col', coach.el, footer)),
  );
  restart();
  return {
    el,
    destroy: () => {
      alive = false;
      anim?.abort();
      engine.cancelAll();
      coach.stop();
      board.destroy();
    },
  };
}

