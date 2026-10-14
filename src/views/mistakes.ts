// "Learn from my mistakes": replay your own mistakes, blunders and misses as puzzles,
// spaced out with Leitner boxes. Hint = the piece to move, then the arrow; "Show me" animates the answer.
import { Chess, type Move } from 'chess.js';
import { h } from '../ui/dom';
import { BoardView, arrow } from '../ui/board';
import { playSound } from '../ui/sound';
import { Coach } from '../ui/coach';
import { classBadge, icon } from '../ui/icons';
import { mascot } from '../ui/coach';
import { pageHeader } from '../ui/widgets';
import type { NarrationStep } from '../ui/coach';
import { engine, scoreNum, winPct } from '../engine/engine';
import { ideaOf } from '../chess/narrate';
import { answerCard, dueCards, loadCards, BOX_DAYS, MAX_BOX, type MistakeCard } from '../store/mistakes';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';
import '../styles/review.css';

const BOX_LABEL = ['', 'New', 'Learning', 'Getting it', 'Almost', 'Mastered'];

function waitText(box: number): string {
  const d = BOX_DAYS[box];
  return d === 0 ? 'again soon' : d === 1 ? 'again tomorrow' : `again in ${d} days`;
}

export async function mistakesView(): Promise<View> {
  trackStudy('tactics');
  let cards = await loadCards();
  const board = new BoardView({ onMove: (m) => void onMove(m) });
  const coach = new Coach(board);
  const body = h('div.mk-body');
  const el = h('div.page.mk', pageHeader('Learn from mistakes', { back: '/more', sub: 'Puzzles made from your own games' }), body);
  let queue: MistakeCard[] = [];
  let cur: MistakeCard | null = null;
  let tries = 0;
  let hints = 0;
  let shown = false;
  let busy = false;
  let session = { right: 0, total: 0 };
  let alive = true;

  // ---------------------------------------------------------------- overview
  function overview() {
    cur = null;
    const due = dueCards(cards);
    const counts = Array.from({ length: MAX_BOX + 1 }, (_, b) => cards.filter((c) => c.box === b).length);
    if (!cards.length) {
      body.replaceChildren(
        h(
          'div.gh-empty',
          mascot('thinking'),
          h('h2', 'No mistakes saved yet'),
          h('p.muted', 'Review one of your games. I will turn your mistakes, blunders and misses into puzzles here, so you can fix them for good.'),
          h('a.btn.primary', { href: '#/games' }, icon('games'), 'Go to my games'),
        ),
      );
      return;
    }
    const next = cards.reduce((m, c) => Math.min(m, c.due), Infinity);
    const sumCoach = new Coach(null);
    sumCoach.say(
      due.length
        ? `You have **${due.length}** puzzle${due.length === 1 ? '' : 's'} from your games to practise. Find the move you missed!`
        : `All caught up! Your next puzzle is due ${new Date(next).toLocaleDateString([], { weekday: 'long' })}.`,
      due.length ? 'happy' : 'excited',
    );
    body.replaceChildren(
      sumCoach.el,
      h('div.mk-stats', h('div.mk-big', h('strong', String(due.length)), h('span', 'due now')), h('div.mk-big', h('strong', String(cards.length)), h('span', 'saved')), h('div.mk-big', h('strong', String(counts[MAX_BOX])), h('span', 'mastered'))),
      h(
        'div.mk-boxes',
        { 'aria-label': 'Leitner boxes' },
        counts.slice(1).map((n, k) => h('div.mk-box', h('div.mk-box-bar', h('span', { style: `height:${cards.length ? Math.max(4, (100 * n) / cards.length) : 0}%` })), h('strong', String(n)), h('small', BOX_LABEL[k + 1]))),
      ),
      h('p.rv-note', 'Each right answer moves a puzzle to the next box, and it comes back later (1, 3, 7, then 16 days). A miss sends it back to the first box.'),
      due.length
        ? h('button.btn.primary.big', { type: 'button', onclick: () => start(due) }, `Start (${due.length})`)
        : h('button.btn.big', { type: 'button', onclick: () => start([...cards].sort((a, b) => a.box - b.box).slice(0, 10)) }, 'Practise anyway'),
    );
  }

  // ---------------------------------------------------------------- trainer
  function start(list: MistakeCard[]) {
    queue = [...list];
    session = { right: 0, total: 0 };
    nextCard();
  }

  const progress = h('div.mk-progress');
  const label = h('div.mk-label');
  const ctrl = h('div.rv-ctrl.mk-ctrl');

  function nextCard() {
    cur = queue.shift() ?? null;
    if (!cur) return finish();
    tries = 0;
    hints = 0;
    shown = false;
    busy = false;
    const side = new Chess(cur.fen).turn() === 'w' ? 'white' : 'black';
    board.set(cur.fen, { lastMove: cur.lastMove, movable: side, orientation: side });
    board.arrows([]);
    board.badge(null);
    progress.replaceChildren(...Array.from({ length: session.total + queue.length + 1 }, (_, k) => h(`span${k < session.total ? '.done' : k === session.total ? '.on' : ''}`)));
    label.replaceChildren(h('span', cur.label), h('span.mk-boxtag', BOX_LABEL[cur.box]));
    coach.say(`In this game you played **${cur.played}** here. Find a better move for ${side === 'white' ? 'White' : 'Black'}.`, 'thinking', {
      title: h('span.rv-title', classBadge(cur.cls), h('span', 'Find the better move')),
      fen: cur.fen,
    });
    setTrainerActions();
    body.replaceChildren(h('div.mk-trainer', h('div.mk-top', progress, label), coach.el, h('div.mk-board', board.el), ctrl));
  }

  function setTrainerActions() {
    coach.setActions([]);
    ctrl.replaceChildren(
      h('button.rv-ctl.wide', { type: 'button', onclick: hint }, icon('hint'), h('span', 'Hint')),
      h('button.rv-ctl.wide', { type: 'button', onclick: () => void showMe() }, icon('eye'), h('span', 'Show me')),
      h('button.rv-ctl.wide', { type: 'button', onclick: () => void grade(false, true) }, icon('next'), h('span', 'Skip')),
    );
  }

  function answerMove(): Move | null {
    if (!cur) return null;
    try {
      return new Chess(cur.fen).move(cur.answers[0]);
    } catch {
      return null;
    }
  }

  function hint() {
    const m = answerMove();
    if (!m || !cur || busy) return;
    hints++;
    if (hints === 1) {
      board.arrows([arrow(m.from + m.from, 'yellow')]);
      board.flash([m.from], 'yellow', 1400);
      coach.say(`Look at your ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' })[m.piece]} on ${m.from}.`, 'thinking', { fen: cur.fen });
    } else {
      board.arrows([arrow(m.from + m.to, 'yellow')]);
      const idea = ideaOf(cur.fen, m.san, m.color);
      coach.say(`Move it here.${idea ? ` It ${idea}.` : ''}`, 'thinking', { fen: cur.fen });
    }
  }

  async function onMove(mv: { from: string; to: string; promotion?: string }) {
    if (!cur || busy || shown) return;
    const c = cur;
    const g = new Chess(c.fen);
    let m: Move;
    try {
      m = g.move(mv);
    } catch {
      board.set(c.fen, { lastMove: c.lastMove, movable: board.orientation });
      return;
    }
    busy = true;
    board.set(g.fen(), { lastMove: [m.from, m.to] });
    let ok = c.answers.includes(m.san) || g.isCheckmate();
    if (!ok && m.san !== c.played) {
      // another move may be just as good: ask the engine
      coach.say('Checking…', 'thinking');
      const [before, after] = [await engine.analyse(c.fen, { depth: 12 }), await engine.analyse(g.fen(), { depth: 12 })];
      if (!alive || cur !== c) return;
      const best = before.lines[0] ? winPct(scoreNum(before.lines[0])) : 50;
      const got = after.lines[0] ? winPct(-scoreNum(after.lines[0])) : 50;
      ok = best - got <= 3;
    }
    if (ok) {
      playSound('good');
      board.badge(m.to, 'best');
      const idea = ideaOf(c.fen, m.san, m.color);
      const line = c.line[0] === m.san ? c.line.slice(1, 3) : [];
      await grade(tries === 0 && !shown, false, `**${m.san}** ${idea ? idea : 'works'}. Well done!`);
      if (line.length) {
        await new Promise((r) => setTimeout(r, 700));
        if (cur === c && alive) await board.playLine(g.fen(), line, { delay: 800 });
      }
    } else {
      playSound('bad');
      tries++;
      board.badge(m.to, m.san === c.played ? c.cls : 'mistake');
      coach.say(m.san === c.played ? `That's the move from the game. Look for something better!` : `${m.san} isn't it. Try again!`, 'worried', { fen: c.fen });
      await new Promise((r) => setTimeout(r, 1100));
      if (cur !== c || !alive) return;
      busy = false;
      board.badge(null);
      board.set(c.fen, { lastMove: c.lastMove, movable: board.orientation });
    }
  }

  /** Record the answer, then show the result and a Next button. */
  async function grade(correct: boolean, skipped: boolean, text?: string) {
    if (!cur) return;
    const c = cur;
    busy = true;
    const updated = await answerCard(c.id, correct);
    cards = await loadCards();
    session.total++;
    if (correct) session.right++;
    if (skipped) return nextCard();
    const box = updated?.box ?? 1;
    coach.say(`${text ?? ''} ${correct ? `I'll show you this one ${waitText(box)}.` : `We'll practise this one ${waitText(box)}.`}`.trim(), correct ? 'excited' : 'happy', {
      title: h('span.rv-title', classBadge(correct ? 'best' : 'good'), h('span', correct ? 'Correct!' : 'Keep practising')),
      fen: c.fen,
    });
    coach.setActions([{ label: queue.length ? 'Next puzzle' : 'Finish', icon: 'next', primary: true, onclick: () => nextCard() }]);
    ctrl.replaceChildren();
  }

  /** "Show me": animate the game move and its problem, then the better move, narrated. */
  async function showMe() {
    if (!cur || busy) return;
    const c = cur;
    const m = answerMove();
    if (!m) return;
    shown = true;
    const g = new Chess(c.fen);
    let playedTo = '';
    try {
      playedTo = g.move(c.played).to;
    } catch {
      /* ignore */
    }
    const idea = ideaOf(c.fen, m.san, m.color);
    const steps: NarrationStep[] = [
      { text: `In the game you played ${c.played}. That was ${c.cls === 'inaccuracy' ? 'an' : 'a'} ${c.cls}.`, fen: c.fen, lastMove: c.lastMove, moves: [c.played], badge: playedTo ? { sq: playedTo, cls: c.cls } : undefined, mood: 'worried' },
      { text: `The better move is ${m.san}.${idea ? ` It ${idea}.` : ''}`, fen: c.fen, lastMove: c.lastMove, moves: [m.san], arrows: [arrow(m.from + m.to, 'green')], badge: { sq: m.to, cls: 'best' }, mood: 'happy' },
    ];
    if (c.line[0] === m.san && c.line.length > 1) steps.push({ text: `Then the game could go on like this.`, fen: c.fen, lastMove: c.lastMove, moves: c.line.slice(0, 4), mood: 'happy' });
    ctrl.replaceChildren();
    coach.narrate(steps, { startFen: c.fen, onExit: () => void grade(false, false, `Now you know: **${m.san}**.`) });
  }

  function finish() {
    const right = session.right;
    const total = session.total;
    const fin = new Coach(null);
    fin.say(total ? `Session done: **${right} of ${total}** right. Every puzzle you fix here is a mistake you won't make in your next game.` : 'Nothing to practise right now.', right === total ? 'excited' : 'happy');
    body.replaceChildren(fin.el, h('button.btn.primary.big', { type: 'button', onclick: overview }, 'Done'));
  }

  overview();
  return {
    el,
    title: 'Learn from mistakes',
    destroy: () => {
      alive = false;
      coach.stop();
      engine.cancelAll();
      board.destroy();
    },
  };
}

