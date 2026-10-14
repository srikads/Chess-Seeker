// Analysis board: live Stockfish (3 lines), eval bar, best-move arrows, a variation tree, opening names,
// on-the-fly move grading, a position editor, PGN load/copy and a coach that explains the best move.
// Route: #/analysis or #/analysis/<encodeURIComponent(fen)>
import { Chess, type Move } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import { BoardView, type UserMove } from '../ui/board';
import { Coach, moodFor } from '../ui/coach';
import { h, modal, toast } from '../ui/dom';
import { classBadge, CLASS_STYLE, icon } from '../ui/icons';
import { EvalBar, pageHeader } from '../ui/widgets';
import { engine, fmtEval, type PvLine } from '../engine/engine';
import { explainBest, explainMistake } from '../chess/explain';
import { classifyLive } from '../chess/liveClassify';
import { GameTree, START_FEN, type TreeNode } from '../chess/tree';
import { loadBook, type OpeningBook } from '../data/openings';
import { uciToMove } from '../chess/util';
import { go } from '../router';
import { trackStudy } from '../store/tracker';
import { openEditor } from './analysisEditor';
import type { View } from '../router';
import '../styles/analysis.css';

const MAX_DEPTH = 22;
const CLASSIFY_DEPTH = 10;
const ENGINE_PREF = 'cs.analysis.engine';

interface EvalInfo {
  lines: PvLine[];
  depth: number;
  done: boolean;
}

const evalKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

function readPref(): boolean {
  try {
    return localStorage.getItem(ENGINE_PREF) !== 'off';
  } catch {
    return true;
  }
}
function writePref(on: boolean) {
  try {
    localStorage.setItem(ENGINE_PREF, on ? 'on' : 'off');
  } catch {
    /* private mode — not persisted */
  }
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} copied`, 'good');
  } catch {
    // clipboard blocked: show it so it can be copied by hand
    const ta = h('textarea.pgn-input', { readonly: true }, text) as HTMLTextAreaElement;
    void modal(what, ta, [{ label: 'Close', value: 'x' }]);
    setTimeout(() => ta.select(), 50);
  }
}

/** Link helper for other views. */
export const analysisHref = (fen: string) => `#/analysis/${encodeURIComponent(fen)}`;

export function analysisView(params: string[]): View {
  trackStudy(null);
  let startFen = START_FEN;
  if (params[0]) {
    try {
      startFen = new Chess(params[0]).fen();
    } catch {
      toast("That position isn't valid. Showing the start position.", 'bad');
    }
  }
  let tree = new GameTree(startFen);
  let cur: TreeNode = tree.root;
  let engineOn = readPref();
  let book: OpeningBook | null = null;
  const evals = new Map<string, EvalInfo>();
  let token = 0;
  let timer = 0;
  let busy = false; // coach animation running: freeze engine arrows
  let lastPlayed: TreeNode | null = null; // node the user just played (gets a coach comment once graded)
  const anim = { ctrl: null as AbortController | null };

  const board = new BoardView({ onMove: (m) => onUserMove(m) });
  const evalBar = new EvalBar();
  const coach = new Coach(board, { compact: true });

  // ---------------------------------------------------------------- DOM
  const depthEl = h('span.an-depth');
  const linesEl = h('div.an-lines');
  const engineSwitch = h('button.an-switch', {
    type: 'button',
    role: 'switch',
    onclick: () => setEngine(!engineOn),
  }) as HTMLButtonElement;
  const engineCard = h('section.an-engine', h('div.an-engine-head', h('span.an-engine-name', icon('bot'), 'Stockfish 19'), depthEl, h('div.grow'), h('label.an-switch-label', 'Engine'), engineSwitch), linesEl);
  const openingEl = h('div.an-opening');
  const treeEl = h('div.an-tree', { role: 'list' });
  const nodeTools = h('div.an-node-tools');
  const navBtn = (name: Parameters<typeof icon>[0], label: string, fn: () => void) => h('button.btn.an-nav', { type: 'button', 'aria-label': label, title: label, onclick: fn }, icon(name));
  const controls = h(
    'div.an-controls',
    navBtn('first', 'Start', () => goto(tree.root)),
    navBtn('prev', 'Previous move', () => cur.parent && goto(cur.parent)),
    navBtn('next', 'Next move', () => cur.children[0] && goto(cur.children[0])),
    navBtn('last', 'End of line', () => goto(tree.lineEnd(cur))),
    navBtn('flip', 'Flip board', () => {
      board.flip();
      renderEval();
    }),
  );
  const tool = (name: Parameters<typeof icon>[0], label: string, fn: () => void, primary = false) =>
    h(`button.btn.sm${primary ? '.primary' : ''}`, { type: 'button', onclick: fn }, icon(name), label);
  const tools = h(
    'div.an-tools',
    tool('hint', 'Coach explains', () => void explain(), true),
    tool('settings', 'Set up position', () => setup()),
    tool('upload', 'Load PGN', () => loadPgn()),
    tool('book', 'Copy FEN', () => void copy(cur.fen, 'FEN')),
    tool('games', 'Copy PGN', () => void copy(tree.toPgn(), 'PGN')),
  );

  const boardArea = h('div.board-area', evalBar.el, board.el);
  const el = h(
    'div.analysis',
    pageHeader('Analysis', { back: '/more', icon: 'analysis' }),
    h(
      'div.play-layout.an-layout',
      h('div.board-col', boardArea, h('div.an-under', controls)),
      h('div.side-col.an-side', engineCard, openingEl, h('div.an-movebox', treeEl, nodeTools), coach.el, tools),
    ),
  );

  coach.say('Move pieces to explore. I grade your moves against the engine as you go.', 'neutral');

  // ---------------------------------------------------------------- navigation
  function goto(n: TreeNode) {
    if (anim.ctrl) stopAnim();
    cur = n;
    render();
    schedule();
  }

  function onUserMove(m: UserMove) {
    if (anim.ctrl) stopAnim();
    const r = tree.play(cur, { from: m.from, to: m.to, promotion: m.promotion });
    if (!r) {
      render();
      return;
    }
    lastPlayed = r.node;
    cur = r.node;
    render();
    schedule();
    tryClassify(r.node);
  }

  function lastMoveOf(n: TreeNode): [string, string] | undefined {
    return n.uci ? [n.uci.slice(0, 2), n.uci.slice(2, 4)] : undefined;
  }

  // ---------------------------------------------------------------- rendering
  function render() {
    board.set(cur.fen, { lastMove: lastMoveOf(cur), movable: busy ? null : (new Chess(cur.fen).turn() === 'w' ? 'white' : 'black') });
    board.arrows([]);
    renderBadge();
    renderTree();
    renderOpening();
    renderEngine();
    renderNodeTools();
  }

  function renderBadge() {
    if (cur.cls && cur.uci) board.badge(cur.uci.slice(2, 4), cur.cls);
    else board.badge(null);
  }

  function moveNo(n: TreeNode, force: boolean) {
    const white = n.ply % 2 === 1;
    return white ? `${Math.ceil(n.ply / 2)}.` : force ? `${Math.ceil(n.ply / 2)}…` : '';
  }

  function moveBtn(n: TreeNode, force: boolean): HTMLElement {
    const no = moveNo(n, force);
    const showBadge = n.cls && !['best', 'excellent', 'good'].includes(n.cls);
    return h(
      `button.an-mv${n === cur ? '.on' : ''}${n.cls ? `.c-${n.cls}` : ''}`,
      { type: 'button', role: 'listitem', 'data-id': n.id, onclick: () => goto(n), title: n.cls ? CLASS_STYLE[n.cls].label : undefined },
      no ? h('span.an-no', no) : null,
      showBadge ? classBadge(n.cls!) : null,
      n.san,
    );
  }

  function renderLine(parent: TreeNode, into: HTMLElement, depth: number) {
    let node = parent;
    let force = true;
    while (node.children.length) {
      const [main, ...vars] = node.children;
      into.append(moveBtn(main, force));
      force = false;
      if (vars.length) {
        // chess.com/lichess style: each sideline on its own indented row
        for (const v of vars) {
          const row = h(`div.an-var${depth > 0 ? '.nested' : ''}`, moveBtn(v, true));
          renderLine(v, row, depth + 1);
          into.append(row);
        }
        force = true;
      }
      node = main;
    }
  }

  function renderTree() {
    treeEl.replaceChildren();
    if (!tree.root.children.length) {
      treeEl.append(h('p.an-empty', 'Make a move on the board, or tap an engine line.'));
      return;
    }
    const main = h('div.an-mainline');
    renderLine(tree.root, main, 0);
    treeEl.append(main);
    const on = treeEl.querySelector('.an-mv.on') as HTMLElement | null;
    if (on) {
      // keep the current move visible without jumping the page
      const top = on.offsetTop - treeEl.offsetTop;
      if (top < treeEl.scrollTop || top > treeEl.scrollTop + treeEl.clientHeight - 30) treeEl.scrollTop = Math.max(0, top - treeEl.clientHeight / 2);
    }
  }

  function renderNodeTools() {
    const kids: Node[] = [];
    if (cur !== tree.root) {
      if (!tree.isMainline(cur)) kids.push(h('button.btn.ghost.sm', { type: 'button', onclick: () => (tree.promote(cur), render()) }, icon('chevron', 'rot-up'), 'Promote variation'));
      kids.push(
        h(
          'button.btn.ghost.sm.danger',
          {
            type: 'button',
            onclick: () => {
              const p = tree.remove(cur);
              if (p) goto(p);
            },
          },
          icon('close'),
          'Delete from here',
        ),
      );
    }
    nodeTools.replaceChildren(...kids);
  }

  function renderOpening() {
    if (!book) {
      openingEl.replaceChildren();
      return;
    }
    const fens = [tree.root.fen, ...tree.path(cur).map((n) => n.fen)];
    const name = book.identify(fens);
    const inBook = book.inBook(cur.fen);
    openingEl.replaceChildren(
      name
        ? h('a.an-opening-name', { href: '#/openings', title: 'Open the opening explorer' }, icon('book'), h('span.an-eco', name.eco), h('span.grow', name.name), inBook ? h('span.an-book-chip', 'Book') : null)
        : h('div.an-opening-name.muted', icon('book'), h('span.grow', cur === tree.root && tree.root.fen === START_FEN ? 'Starting position' : 'Custom position')),
    );
  }

  // ---------------------------------------------------------------- engine
  function setEngine(on: boolean) {
    engineOn = on;
    writePref(on);
    if (!on) {
      token++;
      engine.cancelAll();
    }
    renderEngine();
    renderArrows();
    if (on) schedule();
  }

  function info(n: TreeNode = cur) {
    return evals.get(evalKey(n.fen));
  }

  function schedule() {
    clearTimeout(timer);
    token++;
    engine.cancelAll();
    if (!engineOn) return;
    const my = token;
    timer = window.setTimeout(() => void analyse(my), 140);
  }

  async function analyse(my: number) {
    const node = cur;
    const g = new Chess(node.fen);
    if (g.isGameOver()) {
      renderEngine();
      return;
    }
    const cached = info(node);
    if (cached?.done && cached.depth >= MAX_DEPTH) return;
    const key = evalKey(node.fen);
    await engine.analyse(node.fen, {
      multipv: Math.min(3, g.moves().length),
      depth: MAX_DEPTH,
      movetime: 25_000,
      onInfo: (lines) => {
        if (my !== token) return;
        const depth = Math.min(...lines.map((l) => l.depth));
        const prev = evals.get(key);
        if (prev && prev.depth > depth) return;
        evals.set(key, { lines: lines.slice(0, 3), depth, done: false });
        renderEngine();
        renderArrows();
        if (depth >= CLASSIFY_DEPTH) {
          tryClassify(node);
          for (const c of node.children) tryClassify(c);
        }
      },
    });
    if (my !== token) return;
    const e = evals.get(key);
    if (e) e.done = true;
    renderEngine();
  }

  function whitePov(fen: string, l: { cp: number | null; mate: number | null }) {
    const s = fen.split(' ')[1] === 'w' ? 1 : -1;
    return { cp: (l.cp ?? 0) * s, mate: l.mate === null ? null : l.mate * s };
  }

  function renderEval() {
    const g = new Chess(cur.fen);
    const flipped = board.orientation === 'black';
    evalBar.el.classList.toggle('off', !engineOn);
    if (g.isCheckmate()) return evalBar.set(g.turn() === 'w' ? -10000 : 10000, 0, flipped);
    if (g.isDraw() || g.isStalemate()) return evalBar.set(0, null, flipped);
    const top = info()?.lines[0];
    if (!engineOn || !top) return evalBar.set(0, null, flipped);
    const w = whitePov(cur.fen, top);
    evalBar.set(w.mate !== null ? (w.mate > 0 ? 10000 : -10000) : w.cp, w.mate, flipped);
  }

  function renderEngine() {
    renderEval();
    engineSwitch.setAttribute('aria-checked', String(engineOn));
    engineSwitch.classList.toggle('on', engineOn);
    engineCard.classList.toggle('off', !engineOn);
    if (!engineOn) {
      depthEl.textContent = '';
      linesEl.replaceChildren(h('div.an-self', icon('eye'), h('span', h('strong', 'Self analysis'), h('small', 'Engine is off. Turn it on to see the best lines.'))));
      return;
    }
    const g = new Chess(cur.fen);
    if (g.isGameOver()) {
      depthEl.textContent = '';
      const msg = g.isCheckmate() ? `Checkmate. ${g.turn() === 'w' ? 'Black' : 'White'} wins.` : g.isStalemate() ? 'Stalemate. It\'s a draw.' : 'Draw.';
      linesEl.replaceChildren(h('div.an-self', icon('flag'), h('strong', msg)));
      return;
    }
    const e = info();
    depthEl.textContent = e ? `depth ${e.depth}${e.done ? '' : '…'}` : 'thinking…';
    depthEl.classList.toggle('live', !!e && !e.done);
    if (!e) {
      linesEl.replaceChildren(...[0, 1, 2].map(() => h('div.an-line.skeleton', h('span.an-pill', ''), h('span.an-pv', ''))));
      return;
    }
    linesEl.replaceChildren(...e.lines.map((l) => lineRow(l)));
  }

  function lineRow(l: PvLine): HTMLElement {
    const w = whitePov(cur.fen, l);
    const txt = fmtEval(w.cp, w.mate);
    const g = new Chess(cur.fen);
    const moves: { san: string; i: number; no: string }[] = [];
    for (let i = 0; i < Math.min(l.pv.length, 12); i++) {
      const white = g.turn() === 'w';
      let m: Move;
      try {
        m = g.move(uciToMove(l.pv[i]));
      } catch {
        break;
      }
      const moveNumber = Number(g.fen().split(' ')[5]) - (white ? 0 : 1);
      moves.push({ san: m.san, i, no: white ? `${moveNumber}.` : i === 0 ? `${moveNumber}…` : '' });
    }
    const pill = h(`span.an-pill${w.mate !== null ? (w.mate > 0 ? '.w' : '.b') : w.cp >= 0 ? '.w' : '.b'}`, txt);
    return h(
      'div.an-line',
      { onclick: () => playPv(l.pv, 0), role: 'button', tabindex: 0, title: 'Play the first move' },
      pill,
      h(
        'span.an-pv',
        moves.map((m) =>
          h(
            'span.an-pvm',
            m.no ? h('span.an-no', m.no) : null,
            h('button.an-pv-btn', { type: 'button', onclick: (e: Event) => (e.stopPropagation(), playPv(l.pv, m.i)) }, m.san),
          ),
        ),
      ),
    );
  }

  /** Add the PV up to index `upto` into the tree (as a variation if needed) and jump there. */
  function playPv(pv: string[], upto: number) {
    const n = tree.playLine(cur, pv.slice(0, upto + 1));
    goto(n);
  }

  function renderArrows() {
    if (busy) return;
    const e = info();
    if (!engineOn || !e || e.depth < 6) {
      board.arrows([]);
      return;
    }
    const shapes: DrawShape[] = [];
    e.lines.slice(0, 3).forEach((l, i) => {
      const u = l.pv[0];
      if (!u || shapes.some((s) => s.orig === u.slice(0, 2) && s.dest === u.slice(2, 4))) return;
      shapes.push({ orig: u.slice(0, 2) as Key, dest: u.slice(2, 4) as Key, brush: i === 0 ? 'green' : 'paleGreen' });
    });
    // draw the best move last so it sits on top
    board.arrows(shapes.reverse());
  }

  // ---------------------------------------------------------------- classification
  function tryClassify(n: TreeNode) {
    if (!n.parent || n.cls) return;
    const before = info(n.parent);
    const afterInfo = info(n);
    const g = new Chess(n.parent.fen);
    let move: Move;
    try {
      move = g.move(uciToMove(n.uci));
    } catch {
      return;
    }
    const inBook = !!book?.inBook(n.fen);
    if (!inBook && (!before || before.depth < CLASSIFY_DEPTH)) return;
    if (!inBook && !g.isGameOver() && (!afterInfo || afterInfo.depth < CLASSIFY_DEPTH)) return;
    const cls = classifyLive({
      fenBefore: n.parent.fen,
      move,
      before: before?.lines ?? [],
      after: afterInfo?.lines ?? [],
      ply: n.ply,
      prevCls: n.parent.cls,
      prevTo: n.parent.uci ? n.parent.uci.slice(2, 4) : undefined,
      inBook,
    });
    if (!cls) return;
    n.cls = cls;
    if (n === cur) renderBadge();
    renderTree();
    if (n === lastPlayed) {
      lastPlayed = null;
      comment(n, move, before?.lines ?? [], afterInfo?.lines ?? []);
    }
  }

  function comment(n: TreeNode, move: Move, before: PvLine[], after: PvLine[]) {
    const cls = n.cls!;
    const label = CLASS_STYLE[cls].label;
    const title = h('span.row', classBadge(cls), `${n.san} is ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()} move`);
    if (cls === 'book') title.lastChild!.textContent = `${n.san} is a book move`;
    const best = before[0]?.pv[0];
    const bestSan = best ? new Chess(n.parent!.fen).move(uciToMove(best)).san : '';
    let text: string;
    if (cls === 'book') text = 'Known opening theory. Nice.';
    else if (cls === 'mistake' || cls === 'blunder' || cls === 'miss' || cls === 'inaccuracy') {
      const why = cls === 'inaccuracy' ? '' : explainMistake(n.parent!.fen, move, after[0]?.pv ?? [], after[0]?.mate ?? null);
      text = `${why ? why + ' ' : ''}${bestSan && bestSan !== n.san ? `Better was **${bestSan}**.` : ''}`.trim() || 'There was something better here.';
    } else if (cls === 'best' || cls === 'great' || cls === 'brilliant') text = cls === 'best' ? 'That\'s the engine\'s top choice.' : 'Strong find! Every other move is clearly worse.';
    else text = bestSan && bestSan !== n.san ? `Fine move. The engine slightly prefers **${bestSan}**.` : 'Fine move.';
    coach.say(text, moodFor(cls), { title, fen: n.parent!.fen });
    const acts = [];
    if (bestSan && bestSan !== n.san && cls !== 'book')
      acts.push({ label: `Show ${bestSan}`, icon: 'play' as const, onclick: () => void showLine(n.parent!, before[0].pv) });
    coach.setActions(acts);
  }

  // ---------------------------------------------------------------- coach explains
  async function explain() {
    const node = cur;
    const g = new Chess(node.fen);
    if (g.isGameOver()) {
      coach.say(g.isCheckmate() ? 'The game is over: it\'s checkmate.' : 'The game is over: it\'s a draw.', 'neutral');
      return;
    }
    let e = info(node);
    if (!e || e.depth < 12) {
      coach.say('Let me take a look…', 'thinking');
      const r = await engine.analyse(node.fen, { multipv: 1, depth: 14 });
      if (cur !== node) return;
      if (!r.lines.length) {
        coach.say("I couldn't analyse this position.", 'worried');
        return;
      }
      e = { lines: r.lines, depth: r.lines[0].depth, done: true };
      if (!info(node) || info(node)!.depth < e.depth) evals.set(evalKey(node.fen), e);
      schedule();
    }
    const top = e.lines[0];
    const text = explainBest(node.fen, top.pv[0], top.pv);
    const w = whitePov(node.fen, top);
    const bestSan = new Chess(node.fen).move(uciToMove(top.pv[0])).san;
    coach.say(text, 'happy', { title: `Best here: ${bestSan} (${fmtEval(w.cp, w.mate)})`, fen: node.fen });
    coach.setActions([
      { label: 'Replay line', icon: 'replay', onclick: () => void showLine(node, top.pv) },
      { label: `Play ${bestSan}`, icon: 'play', primary: true, onclick: () => playPv(top.pv, 0) },
    ]);
    void showLine(node, top.pv);
  }

  async function showLine(from: TreeNode, pv: string[]) {
    stopAnim();
    if (cur !== from) {
      cur = from;
      render();
      schedule();
    }
    const sans: string[] = [];
    const g = new Chess(from.fen);
    for (const u of pv.slice(0, 6)) {
      try {
        sans.push(g.move(uciToMove(u)).san);
      } catch {
        break;
      }
    }
    const ctrl = (anim.ctrl = new AbortController());
    busy = true;
    // phones: bring the board into view so the animation isn't missed
    if (innerWidth < 900 && boardArea.getBoundingClientRect().top < 0) boardArea.scrollIntoView({ block: 'start', behavior: 'smooth' });
    board.badge(null);
    board.arrows([]);
    el.classList.add('animating');
    await board.playLine(from.fen, sans, { signal: ctrl.signal, delay: 850 });
    if (ctrl.signal.aborted) return;
    await new Promise((r) => setTimeout(r, 1100));
    if (ctrl.signal.aborted) return;
    stopAnim();
    render();
    renderArrows();
  }

  function stopAnim() {
    anim.ctrl?.abort();
    anim.ctrl = null;
    busy = false;
    el.classList.remove('animating');
  }

  // ---------------------------------------------------------------- setup / PGN
  function setup() {
    openEditor(cur.fen, (fen) => go(`/analysis/${encodeURIComponent(fen)}`));
  }

  async function loadPgn() {
    const ta = h('textarea.pgn-input', { placeholder: '1. e4 e5 2. Nf3 Nc6 …  (variations in brackets are kept)' }) as HTMLTextAreaElement;
    const box = h('div', h('p.muted.small', 'Paste a PGN. It stays on this device.'), ta);
    setTimeout(() => ta.focus(), 50);
    const v = await modal('Load PGN', box, [
      { label: 'Cancel', value: 'cancel' },
      { label: 'Load', value: 'load', primary: true },
    ]);
    if (v !== 'load' || !ta.value.trim()) return;
    try {
      const t = GameTree.fromPgn(ta.value);
      if (!t.root.children.length) throw new Error('No moves found in this PGN.');
      tree = t;
      evals.clear();
      goto(tree.root);
      toast(`Loaded ${tree.mainline().length} moves`, 'good');
    } catch (e) {
      toast((e as Error).message, 'bad', 4000);
    }
  }

  // ---------------------------------------------------------------- keyboard
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (document.querySelector('.modal-back, .an-editor')) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => cur.parent && goto(cur.parent),
      ArrowRight: () => cur.children[0] && goto(cur.children[0]),
      ArrowUp: () => goto(tree.root),
      ArrowDown: () => goto(tree.lineEnd(cur)),
      f: () => (board.flip(), renderEval()),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };
  addEventListener('keydown', onKey);

  loadBook()
    .then((b) => {
      book = b;
      renderOpening();
      for (const n of tree.path(cur)) tryClassify(n);
    })
    .catch(() => {
      openingEl.replaceChildren();
    });

  render();
  schedule();

  return {
    el,
    title: 'Analysis',
    destroy: () => {
      token++;
      clearTimeout(timer);
      stopAnim();
      coach.stop();
      engine.cancelAll();
      removeEventListener('keydown', onKey);
      board.destroy();
    },
  };
}
