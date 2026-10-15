// Openings: an offline explorer (book moves + on-device engine evals), coach-narrated opening ideas,
// and a spaced-repetition repertoire trainer.
import { Chess, type Move } from 'chess.js';
import type { Key } from '@lichess-org/chessground/types';
import { BoardView, type UserMove } from '../ui/board';
import { Coach } from '../ui/coach';
import { h, toast } from '../ui/dom';
import { icon } from '../ui/icons';
import { pageHeader, segmented } from '../ui/widgets';
import { engine, fmtEval } from '../engine/engine';
import { describeMove } from '../chess/explain';
import { loadBook, posKey, type Continuation, type OpeningBook } from '../data/openings';
import { OPENING_IDEAS, ideaNarration, type OpeningIdea } from '../data/openingIdeas';
import { REPERTOIRES, repertoireById, type Repertoire, type RepLine } from '../data/repertoire';
import { dueLabel, grade, loadCards, pickNext, progress, saveCards, soonest, type Cards } from '../store/repertoire';
import { kvGet, kvSet } from '../store/db';
import { trackStudy } from '../store/tracker';
import { playSound } from '../ui/sound';
import { settings } from '../store/settings';
import type { View } from '../router';
import '../styles/openings.css';

type Tab = 'explore' | 'ideas' | 'practice';
const TAB_PREF = 'cs.openings.tab';
const START = new Chess().fen();

function readTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_PREF);
    return t === 'ideas' || t === 'practice' ? t : 'explore';
  } catch {
    return 'explore';
  }
}
function writeTab(t: Tab) {
  try {
    localStorage.setItem(TAB_PREF, t);
  } catch {
    /* not persisted */
  }
}

const fenAfter = (sans: string[]) => {
  const g = new Chess();
  for (const s of sans) g.move(s);
  return g.fen();
};
const colorOf = (fen: string): 'white' | 'black' => (fen.split(' ')[1] === 'w' ? 'white' : 'black');

/** #/openings — optional params: ['train', <repertoireId>] opens the trainer directly. */
export function openingsView(params: string[] = []): View {
  trackStudy('openings');
  let panel: { el: HTMLElement; destroy: () => void } | null = null;
  const body = h('div.op-body');
  let tab: Tab = readTab();
  const tabs = segmented<Tab>(
    [
      { value: 'explore', label: 'Explorer' },
      { value: 'ideas', label: 'Key ideas' },
      { value: 'practice', label: 'Practice' },
    ],
    tab,
    (t) => show(t),
  );
  const head = h('div.op-head', pageHeader('Openings', { back: '/learn', icon: 'book', sub: 'Explore, learn the ideas, drill your lines' }), tabs);
  const el = h('div.openings', head, body);

  function mount(p: { el: HTMLElement; destroy: () => void }) {
    panel?.destroy();
    panel = p;
    body.replaceChildren(p.el);
  }

  function show(t: Tab, o: { idea?: OpeningIdea } = {}) {
    tab = t;
    writeTab(t);
    head.hidden = false;
    // keep the segmented control in sync when switching from code
    tabs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', ['explore', 'ideas', 'practice'][i] === t));
    if (t === 'explore') mount(explorerPanel(o.idea));
    else if (t === 'ideas') mount(ideasPanel((idea) => show('explore', { idea })));
    else mount(practicePanel((rep) => openTrainer(rep)));
  }

  function openTrainer(rep: Repertoire) {
    head.hidden = true;
    mount(trainerView(rep, { onBack: () => show('practice') }));
    window.scrollTo(0, 0);
  }

  const direct = params[0] === 'train' ? repertoireById(params[1] ?? '') : undefined;
  if (direct) openTrainer(direct);
  else show(tab);

  return {
    el,
    title: 'Openings',
    destroy: () => {
      panel?.destroy();
      engine.cancelAll();
    },
  };
}

// =================================================================== explorer

interface CachedEval {
  cp: number;
  mate: number | null;
}

function explorerPanel(startIdea?: OpeningIdea): { el: HTMLElement; destroy: () => void } {
  let path: string[] = [];
  let book: OpeningBook | null = null;
  let token = 0;
  let narrating = false;
  const evals = new Map<string, CachedEval>();

  const board = new BoardView({ onMove: (m) => onMove(m) });
  const coach = new Coach(board, { compact: true });
  coach.el.hidden = true;
  const nameEl = h('div.op-name');
  const crumbs = h('div.op-crumbs');
  const list = h('div.op-list');
  const ideaSlot = h('div.op-idea-slot');
  const btn = (name: Parameters<typeof icon>[0], label: string, fn: () => void) => h('button.btn.op-ctl', { type: 'button', 'aria-label': label, title: label, onclick: fn }, icon(name));
  const controls = h(
    'div.op-controls',
    btn('first', 'Start position', () => setPath([])),
    btn('prev', 'Take back', () => setPath(path.slice(0, -1))),
    btn('flip', 'Flip board', () => board.flip()),
    h('a.btn.op-ctl.op-analyse', { href: '#/analysis', title: 'Open in the analysis board' }, icon('analysis'), h('span', 'Analyse')),
  );
  const analyseLink = controls.querySelector('.op-analyse') as HTMLAnchorElement;

  const el = h(
    'div.play-layout.op-explorer',
    h('div.board-col', nameEl, board.el, controls),
    h('div.side-col.op-side', coach.el, ideaSlot, h('section.op-card', h('div.op-card-head', h('strong', 'Book moves'), h('span.muted.small', 'eval by Stockfish on this device')), crumbs, list)),
  );

  function onMove(m: UserMove) {
    const g = new Chess(fenAfter(path));
    let mv: Move;
    try {
      mv = g.move({ from: m.from, to: m.to, promotion: m.promotion });
    } catch {
      render();
      return;
    }
    playSound(mv.captured ? 'capture' : 'move');
    setPath([...path, mv.san]);
  }

  function setPath(p: string[]) {
    if (narrating) stopNarration();
    path = p;
    render();
  }

  function render() {
    const fen = fenAfter(path);
    const g = new Chess();
    let last: Move | undefined;
    for (const s of path) last = g.move(s);
    board.set(fen, { lastMove: last ? [last.from, last.to] : undefined, movable: narrating ? null : colorOf(fen) });
    board.arrows([]);
    analyseLink.href = `#/analysis/${encodeURIComponent(fen)}`;
    renderCrumbs();
    renderName(fen);
    renderIdea();
    renderList(fen);
  }

  function renderCrumbs() {
    const kids: Node[] = [h('button.op-crumb', { type: 'button', class: path.length ? '' : 'on', onclick: () => setPath([]) }, 'Start')];
    path.forEach((s, i) => {
      const no = i % 2 === 0 ? `${i / 2 + 1}.` : '';
      kids.push(h(`button.op-crumb${i === path.length - 1 ? '.on' : ''}`, { type: 'button', onclick: () => setPath(path.slice(0, i + 1)) }, no ? h('span.op-no', no) : null, s));
    });
    crumbs.replaceChildren(...kids);
    crumbs.scrollLeft = crumbs.scrollWidth;
  }

  function renderName(fen: string) {
    if (!book) {
      nameEl.replaceChildren(h('span.op-eco', ''), h('span', 'Loading the opening book…'));
      return;
    }
    const fens = [START];
    const g = new Chess();
    for (const s of path) fens.push((g.move(s), g.fen()));
    const n = book.identify(fens);
    const inBook = book.inBook(fen);
    nameEl.replaceChildren(
      n ? h('span.op-eco', n.eco) : '',
      h('span.op-title', n?.name ?? 'Starting position'),
      inBook ? '' : h('span.op-out', 'Out of book'),
    );
  }

  function ideaFor(): OpeningIdea | undefined {
    // the most specific idea whose defining moves match the start of the current path
    return OPENING_IDEAS.filter((i) => i.moves.length <= path.length && i.moves.every((m, k) => path[k] === m)).sort((a, b) => b.moves.length - a.moves.length)[0];
  }

  function renderIdea() {
    const idea = ideaFor();
    if (!idea || narrating) {
      ideaSlot.replaceChildren();
      return;
    }
    ideaSlot.replaceChildren(
      h(
        'button.op-idea',
        { type: 'button', onclick: () => narrate(idea) },
        h('span.op-idea-icon', icon('hint')),
        h('span.grow', h('strong', `Key ideas: ${idea.name}`), h('small', idea.summary)),
        h('span.op-idea-go', icon('next')),
      ),
    );
  }

  function narrate(idea: OpeningIdea) {
    narrating = true;
    token++;
    engine.cancelAll();
    ideaSlot.replaceChildren();
    coach.el.hidden = false;
    board.setOrientation(idea.side);
    coach.narrate(ideaNarration(idea), {
      startFen: START,
      onExit: () => {
        // land on the position the walkthrough ended in
        const g = new Chess();
        for (const s of idea.steps.flatMap((s) => s.moves ?? [])) g.move(s);
        stopNarration();
        setPath(g.history());
      },
    });
    el.classList.add('narrating');
    if (innerWidth < 900) board.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function stopNarration() {
    narrating = false;
    coach.stop();
    coach.el.hidden = true;
    el.classList.remove('narrating');
    board.badge(null);
    board.highlight({});
  }

  function renderList(fen: string) {
    const my = ++token;
    engine.cancelAll();
    if (!book) {
      list.replaceChildren(...[0, 1, 2, 3].map(() => h('div.op-row.skeleton')));
      return;
    }
    const conts = book.continuations(fen).slice(0, 14);
    if (!conts.length) {
      list.replaceChildren(
        h(
          'div.op-empty',
          h('p', h('strong', path.length ? 'You\'ve left the book.' : 'No book moves here.'), ' There are no more named lines from this position.'),
          h('div.row.wrap', h('button.btn.sm', { type: 'button', onclick: () => setPath(path.slice(0, -1)) }, icon('undo'), 'Take back'), h('a.btn.sm.primary', { href: `#/analysis/${encodeURIComponent(fen)}` }, icon('analysis'), 'Analyse with engine')),
        ),
      );
      return;
    }
    const rows = conts.map((c) => contRow(c, fen));
    list.replaceChildren(...rows.map((r) => r.el));
    void evaluate(conts, rows, my);
  }

  function contRow(c: Continuation, fen: string) {
    const pill = h('span.op-eval.pending', '…');
    const no = new Chess(fen).turn() === 'w' ? `${new Chess(fen).moveNumber()}.` : `${new Chess(fen).moveNumber()}…`;
    const g = new Chess(fen);
    const mv = g.move(c.san);
    const el = h(
      'button.op-row',
      {
        type: 'button',
        onclick: () => setPath([...path, c.san]),
        onpointerenter: () => !narrating && board.arrows([{ orig: mv.from as Key, dest: mv.to as Key, brush: 'paleGreen' }]),
        onpointerleave: () => !narrating && board.arrows([]),
      },
      h('span.op-san', h('span.op-no', no), c.san),
      h('span.op-row-name', h('span', c.name), h('small', `${c.eco}${c.lines > 1 ? ` · ${c.lines} named lines` : ''}`)),
      pill,
    );
    return { el, pill, c };
  }

  async function evaluate(conts: Continuation[], rows: { pill: HTMLElement }[], my: number) {
    for (let i = 0; i < conts.length; i++) {
      if (my !== token) return;
      const key = posKey(conts[i].fen);
      let e = evals.get(key) ?? (await kvGet<CachedEval | null>(`oeval:${key}`, null));
      if (!e) {
        const r = await engine.analyse(conts[i].fen, { depth: 12 });
        if (my !== token || r.bestmove === '(cancelled)') return;
        const l = r.lines[0];
        if (!l) continue;
        const s = colorOf(conts[i].fen) === 'white' ? 1 : -1;
        e = { cp: (l.cp ?? 0) * s, mate: l.mate === null ? null : l.mate * s };
        void kvSet(`oeval:${key}`, e);
      }
      evals.set(key, e);
      if (my !== token) return;
      const pill = rows[i].pill;
      pill.textContent = fmtEval(e.cp, e.mate);
      pill.className = `op-eval ${e.mate !== null ? (e.mate > 0 ? 'w' : 'b') : e.cp > 30 ? 'w' : e.cp < -30 ? 'b' : 'eq'}`;
    }
  }

  loadBook()
    .then((b) => {
      book = b;
      render();
      if (startIdea) narrate(startIdea);
    })
    .catch(() => {
      nameEl.replaceChildren(h('span', 'The opening book could not be loaded.'));
      toast('Opening book missing. Reload the app while online once.', 'bad', 4000);
    });
  render();

  return {
    el,
    destroy: () => {
      token++;
      coach.stop();
      engine.cancelAll();
      board.destroy();
    },
  };
}

// =================================================================== ideas

function ideasPanel(onPick: (idea: OpeningIdea) => void): { el: HTMLElement; destroy: () => void } {
  const card = (idea: OpeningIdea) =>
    h(
      'button.op-idea-tile',
      { type: 'button', onclick: () => onPick(idea) },
      h(`span.op-color.cg-wrap.${idea.side}`, { title: `From ${idea.side === 'white' ? "White's" : "Black's"} side` }, h(`piece.king.${idea.side}`)),
      h('span.grow', h('strong', idea.name), h('small', idea.summary)),
      h('span.op-moves', idea.moves.slice(0, 8).map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ') + (idea.moves.length > 8 ? ' …' : '')),
      icon('chevron'),
    );
  const forWhite = OPENING_IDEAS.filter((i) => i.side === 'white');
  const forBlack = OPENING_IDEAS.filter((i) => i.side === 'black');
  const el = h(
    'div.op-ideas',
    h('p.muted.op-lead', 'Short walkthroughs: the board plays the moves while the coach explains the plan, one idea at a time.'),
    h('h3', 'Playing White'),
    h('div.op-grid', forWhite.map(card)),
    h('h3', 'Playing Black'),
    h('div.op-grid', forBlack.map(card)),
  );
  return { el, destroy: () => undefined };
}

// =================================================================== practice list

function practicePanel(onPick: (rep: Repertoire) => void): { el: HTMLElement; destroy: () => void } {
  const el = h('div.op-practice', h('p.muted.op-lead', 'Pick an opening. You play your side, the app answers. Lines come back for review just before you\'d forget them.'));
  const grid = h('div.op-grid');
  el.append(grid);
  let alive = true;
  void (async () => {
    const now = Date.now();
    for (const rep of REPERTOIRES) {
      const cards = await loadCards(rep.id);
      if (!alive) return;
      const p = progress(rep.lines.map((l) => l.id), cards, now);
      const fresh = rep.lines.length - p.seen;
      grid.append(
        h(
          'button.op-rep',
          { type: 'button', onclick: () => onPick(rep) },
          h('div.op-rep-top', h(`span.op-color.cg-wrap.${rep.color}`, h(`piece.king.${rep.color}`)), h('strong.grow', rep.name), p.due ? h('span.op-due', `${p.due} due`) : fresh ? h('span.op-new', `${fresh} new`) : h('span.op-done', icon('check'))),
          h('small', rep.blurb),
          h('div.progress-line', h('div.bar', h('span', { style: `width:${p.pct}%` })), h('span.small.muted', `${p.learned}/${p.total} learned`)),
        ),
      );
    }
  })();
  return { el, destroy: () => (alive = false) };
}

// =================================================================== trainer

export interface TrainerOptions {
  onBack?: () => void;
  /** title shown above the board (defaults to the repertoire name) */
  title?: string;
}

/**
 * Drill a repertoire's lines with spaced repetition. Works for any line list (e.g. a course built
 * elsewhere): pass `{ id, name, color, blurb, lines }`; progress is stored under `rep:<id>`.
 */
export function trainerView(rep: Repertoire, o: TrainerOptions = {}): { el: HTMLElement; destroy: () => void } {
  const ids = rep.lines.map((l) => l.id);
  let cards: Cards = {};
  let line: RepLine | null = null;
  let ply = 0;
  let mistakes = 0;
  let wrongHere = 0;
  let alive = true;
  let ctrl: AbortController | null = null;
  const userColor = rep.color;
  const userTurn = (p: number) => (p % 2 === 0) === (userColor === 'white');

  const board = new BoardView({ orientation: userColor, onMove: (m) => onMove(m) });
  const coach = new Coach(board);
  const lineName = h('div.op-tr-line');
  const dots = h('div.op-tr-dots');
  const stats = h('div.op-tr-stats');
  const el = h(
    'div.op-trainer',
    pageHeader(o.title ?? rep.name, { right: o.onBack ? h('button.btn.sm.ghost', { type: 'button', onclick: () => o.onBack!() }, icon('back'), 'All openings') : undefined, sub: `You play ${userColor === 'white' ? 'White' : 'Black'}` }),
    h('div.play-layout', h('div.board-col', h('div.op-tr-bar', lineName, dots), board.el), h('div.side-col', coach.el, stats)),
  );

  const delay = (ms: number) =>
    new Promise<void>((res) => {
      const t = setTimeout(res, settings().animation ? ms : Math.min(ms, 150));
      ctrl?.signal.addEventListener('abort', () => (clearTimeout(t), res()), { once: true });
    });

  function fenAt(p: number) {
    return fenAfter(line!.moves.slice(0, p));
  }

  function renderDots() {
    if (!line) return dots.replaceChildren();
    dots.replaceChildren(
      ...line.moves.map((_, i) => h(`span${i < ply ? '.done' : i === ply ? '.on' : ''}${userTurn(i) ? '.mine' : ''}`)),
    );
  }

  function renderStats() {
    const p = progress(ids, cards, Date.now());
    stats.replaceChildren(
      h('div.op-tr-progress', h('div.progress-line', h('div.bar', h('span', { style: `width:${p.pct}%` })), h('strong', `${p.pct}%`)), h('small', `${p.learned} of ${p.total} lines learned · ${p.due} due · ${p.total - p.seen} new`)),
      h(
        'ul.op-tr-lines',
        rep.lines.map((l) => {
          const c = cards[l.id];
          return h(
            `li${line?.id === l.id ? '.on' : ''}`,
            h('button', { type: 'button', onclick: () => start(l) }, h('span.grow', l.name), h('small', c ? dueLabel(c.due, Date.now()) : 'new'), h('span.op-box', { title: 'Memory level' }, ...[1, 2, 3, 4, 5].map((k) => h(`i${c && c.box >= k ? '.on' : ''}`)))),
          );
        }),
      ),
    );
  }

  function next() {
    const id = pickNext(ids, cards, Date.now());
    if (!id) {
      const s = soonest(ids, cards);
      const when = s && cards[s] ? dueLabel(cards[s].due, Date.now()) : '';
      board.set(START, { orientation: userColor });
      line = null;
      renderDots();
      lineName.textContent = 'All caught up';
      coach.say(`All caught up! Your next review is ${when}. Come back then, or practise a line now.`, 'excited', { title: 'Nice work' });
      coach.setActions([{ label: 'Practise anyway', icon: 'replay', primary: true, onclick: () => s && start(rep.lines.find((l) => l.id === s)!) }]);
      renderStats();
      return;
    }
    start(rep.lines.find((l) => l.id === id)!);
  }

  function start(l: RepLine) {
    ctrl?.abort();
    ctrl = new AbortController();
    line = l;
    ply = 0;
    mistakes = 0;
    wrongHere = 0;
    lineName.textContent = l.name;
    board.set(START, { orientation: userColor });
    board.arrows([]);
    board.highlight({});
    renderDots();
    renderStats();
    if (!cards[l.id]) {
      coach.say(`New line: **${l.name}**. Watch it once, then it's your turn.`, 'happy', { title: 'Something new' });
      coach.setActions([
        { label: 'Watch', icon: 'next', primary: true, onclick: () => void watch() },
        { label: 'Skip to drill', onclick: () => void drill() },
      ]);
    } else void drill();
  }

  async function watch() {
    if (!line) return;
    const my = ctrl!;
    coach.setActions([]);
    coach.say(`Watch the moves of the **${line.name}**.`, 'neutral');
    await board.playLine(START, line.moves, {
      signal: my.signal,
      delay: 800,
      onStep: (i) => {
        ply = i + 1;
        renderDots();
      },
    });
    if (my.signal.aborted) return;
    await delay(700);
    if (my.signal.aborted) return;
    void drill();
  }

  async function drill() {
    if (!line) return;
    const my = ctrl!;
    ply = 0;
    board.set(START, { orientation: userColor });
    board.arrows([]);
    renderDots();
    coach.setActions([{ label: 'Hint', icon: 'hint', onclick: () => hint() }]);
    coach.say(userColor === 'white' ? 'Your move. Play the first move of this line.' : 'I\'ll play White. You answer with the moves of this line.', 'neutral');
    await advance(my);
  }

  /** Play the opponent's move(s) until it's the learner's turn or the line ends. */
  async function advance(my: AbortController) {
    while (line && ply < line.moves.length && !userTurn(ply)) {
      board.set(fenAt(ply), { lastMove: lastMove(ply) });
      await delay(550);
      if (my.signal.aborted) return;
      const before = fenAt(ply);
      const m = new Chess(before).move(line.moves[ply]);
      ply++;
      board.playMove(fenAt(ply), m.from, m.to, !!m.captured, null);
      renderDots();
    }
    if (!line || my.signal.aborted) return;
    if (ply >= line.moves.length) return finish();
    board.set(fenAt(ply), { lastMove: lastMove(ply), movable: userColor });
  }

  function lastMove(p: number): [string, string] | undefined {
    if (!line || p === 0) return undefined;
    const m = new Chess(fenAt(p - 1)).move(line.moves[p - 1]);
    return [m.from, m.to];
  }

  function onMove(u: UserMove) {
    if (!line || !userTurn(ply)) return;
    const before = fenAt(ply);
    const expected = new Chess(before).move(line.moves[ply]);
    let played: Move;
    try {
      played = new Chess(before).move({ from: u.from, to: u.to, promotion: u.promotion });
    } catch {
      board.set(before, { lastMove: lastMove(ply), movable: userColor });
      return;
    }
    if (played.san === expected.san) {
      ply++;
      board.playMove(fenAt(ply), played.from, played.to, !!played.captured, null);
      board.flash([played.to], 'green', 700);
      board.arrows([]);
      wrongHere = 0;
      renderDots();
      const why = describeMove(before, expected).filter((r) => r !== 'improves the position')[0];
      if (ply < line.moves.length) coach.say(why ? `Right! **${expected.san}** ${why}.` : `Right! **${expected.san}**.`, 'happy', { fen: before });
      void advance(ctrl!);
      return;
    }
    // wrong: undo, show the right move
    mistakes++;
    wrongHere++;
    playSound('move');
    board.set(before, { lastMove: lastMove(ply), movable: userColor });
    board.flash([played.to], 'red', 900);
    board.arrows([{ orig: expected.from as Key, dest: expected.to as Key, brush: 'green' }]);
    const why = describeMove(before, expected).filter((r) => r !== 'improves the position')[0];
    const alsoBook = !!bookRef?.inBook(fenAfterMove(before, played.san));
    const lead = alsoBook ? `**${played.san}** is a fine opening move too, but this line goes **${expected.san}**.` : `Not quite. This line goes **${expected.san}**.`;
    coach.say(`${lead}${why ? ` It ${why}.` : ''}${wrongHere > 1 ? ' Follow the green arrow.' : ''}`, alsoBook ? 'thinking' : 'worried', { fen: before });
  }

  function hint() {
    if (!line || !userTurn(ply) || ply >= line.moves.length) return;
    const m = new Chess(fenAt(ply)).move(line.moves[ply]);
    mistakes = Math.max(mistakes, 1);
    board.flash([m.from], 'yellow', 1400);
    coach.say(`Move the piece on **${m.from}**.`, 'thinking', { fen: fenAt(ply) });
  }

  async function finish() {
    if (!line) return;
    const done = line;
    cards = { ...cards, [done.id]: grade(cards[done.id], mistakes, Date.now()) };
    await saveCards(rep.id, cards);
    if (!alive) return;
    playSound('move');
    renderStats();
    renderDots();
    const c = cards[done.id];
    const clean = mistakes === 0;
    coach.say(
      clean ? `Perfect run! I'll bring the **${done.name}** back ${dueLabel(c.due, Date.now())}.` : `Line done with ${mistakes} slip${mistakes > 1 ? 's' : ''}. We'll go over it again soon.`,
      clean ? 'excited' : 'thinking',
      { title: clean ? 'Line complete' : 'Keep going' },
    );
    coach.setActions([
      { label: 'Next line', icon: 'next', primary: true, onclick: () => next() },
      { label: 'Repeat', icon: 'replay', onclick: () => start(done) },
    ]);
  }

  let bookRef: OpeningBook | null = null;
  const fenAfterMove = (fen: string, san: string) => {
    const g = new Chess(fen);
    g.move(san);
    return g.fen();
  };
  loadBook()
    .then((b) => (bookRef = b))
    .catch(() => undefined);

  void loadCards(rep.id).then((c) => {
    if (!alive) return;
    cards = c;
    next();
  });
  renderStats();

  return {
    el,
    destroy: () => {
      alive = false;
      ctrl?.abort();
      coach.stop();
      board.destroy();
    },
  };
}
