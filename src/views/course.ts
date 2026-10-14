// Course page, Learn screen (coach narrates a line move by move) and Practice screen (spaced repetition
// from memory, with "Play it out" against a bot from the line's final position).
import '../styles/courses.css';
import { Chess } from 'chess.js';
import type { Key } from '@lichess-org/chessground/types';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { BoardView, type UserMove } from '../ui/board';
import { Coach, type Mood } from '../ui/coach';
import { MoveList, pageHeader } from '../ui/widgets';
import { playSound } from '../ui/sound';
import { courseById, isPlayable, lineCount } from '../courses/catalog';
import type { Chapter, Course, Line, LineMove } from '../courses/types';
import { lineKey } from '../courses/types';
import { plies, shapesOf, startFen, isExpected, moveNumberLabel, type Ply } from '../courses/line';
import {
  PracticeQueue,
  chapterProgress,
  courseProgress,
  dueKeys,
  lineProgress,
  loadProgress,
  markLearned,
  nextDue,
  nextToLearn,
  review,
  saveProgress,
  DAY,
  type CourseProgress,
  type ReviewResult,
} from '../courses/progress';
import { courseCover } from './course-cover';
import { formatLine } from '../chess/util';
import { engine } from '../engine/engine';
import { BOTS, botMove } from '../engine/bots';
import { trackStudy } from '../store/tracker';
import { go, type View } from '../router';

const SIDE_LABEL = { white: 'Play as White', black: 'Play as Black', both: 'Both colours' } as const;
const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' } as const;
/** Opponent for "Play it out": a gentle bot so the learner can try the line's ideas. */
const PLAYOUT_BOT = BOTS.find((b) => b.level === 3) ?? BOTS[0];

function notFound(msg = 'Course not found.'): View {
  return { el: h('div.page', pageHeader('Courses', { back: '/courses' }), h('p.muted', msg), h('a.btn', { href: '#/courses' }, 'All courses')) };
}

function findLine(c: Course, chapterId: string, lineId: string): { chapter: Chapter; line: Line; index: number } | null {
  const chapter = c.chapters.find((ch) => ch.id === chapterId);
  const index = chapter?.lines.findIndex((l) => l.id === lineId) ?? -1;
  return chapter && index >= 0 ? { chapter, line: chapter.lines[index], index } : null;
}

function nextLineAfter(c: Course, chapterId: string, lineId: string): { chapter: string; line: string } | null {
  const all = c.chapters.flatMap((ch) => ch.lines.map((l) => ({ chapter: ch.id, line: l.id })));
  const i = all.findIndex((x) => x.chapter === chapterId && x.line === lineId);
  return all[i + 1] ?? null;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const studyBucket = (c: Course) => (c.categories.includes('skill') ? 'tactics' : 'openings');

function relDue(ms: number): string {
  const d = ms - Date.now();
  if (d <= 0) return 'now';
  if (d < DAY) return `in ${Math.max(1, Math.round(d / 3_600_000))}h`;
  return `in ${Math.round(d / DAY)}d`;
}

// =================================================================== course page

export async function courseView([id]: string[]): Promise<View> {
  const c = courseById(id);
  if (!c) return notFound();
  const p = await loadProgress(c.id);
  const playable = isPlayable(c);
  const due = playable ? dueKeys(c, p).length : 0;
  const next = playable ? nextToLearn(c, p) : null;
  const learned = Object.values(p.lines).filter((s) => s.learned).length;
  const total = lineCount(c);
  const prog = courseProgress(c, p);
  const nd = nextDue(c, p);

  const actions = playable
    ? h(
        'div.cr-actions',
        next
          ? h('a.btn.primary.big.cr-go', { href: `#/course/${c.id}/learn/${next.chapter}/${next.line}` }, icon('play_arrow'), learned ? 'Learn next line' : 'Start course')
          : h('div.banner.good', 'Every line learned. Keep them fresh with practice.'),
        h(
          `a.btn.big.cr-practice${!next && due ? '.primary' : ''}`,
          { href: `#/course/${c.id}/practice`, 'aria-disabled': learned ? undefined : 'true', class: learned ? '' : 'disabled' },
          icon('replay'),
          due ? `Practice (${due} due)` : 'Practice',
          !due && nd && learned ? h('small.cr-next-due', `next ${relDue(nd)}`) : null,
        ),
      )
    : h(
        'div.cr-production',
        icon(c.status === 'soon' ? 'clock' : 'book'),
        h('div', h('strong', c.status === 'soon' ? 'Coming soon' : 'In production'), h('p.muted.small', c.status === 'soon' ? 'This course is planned. Check back after an update.' : 'The chapters below are being written. Try one of the ready courses meanwhile.')),
      );

  const openIdx = next ? c.chapters.findIndex((ch) => ch.id === next.chapter) : 0;
  const chapters = h(
    'div.cr-chapters',
    c.chapters.map((ch, i) => chapterCard(c, ch, i, p, playable, i === openIdx)),
  );

  const el = h(
    'div.page.course-page',
    pageHeader(c.title, { back: '/courses' }),
    h(
      'section.cr-hero',
      h('div.cr-hero-cover', courseCover(c, { size: 'lg' })),
      h(
        'div.cr-hero-info',
        h('div.cr-sub', c.subtitle),
        h('div.cr-pills', h('span.pill', LEVEL_LABEL[c.level]), h('span.pill', SIDE_LABEL[c.side]), h('span.pill', `${c.chapters.length} chapters${total ? ` · ${total} lines` : ''}`)),
        playable ? h('div.cr-prog', h('div.bar', h('span', { style: `width:${pct(prog)}` })), h('strong', pct(prog))) : null,
      ),
    ),
    h('p.cr-desc', c.description),
    actions,
    h('h3.cr-h', 'Chapters'),
    chapters,
  );
  return { el, title: c.title };
}

function chapterCard(c: Course, ch: Chapter, i: number, p: CourseProgress, playable: boolean, open: boolean): HTMLElement {
  const cp = chapterProgress(ch, p);
  const learnedN = ch.lines.filter((l) => p.lines[lineKey(ch.id, l.id)]?.learned).length;
  const head = h(
    'summary.cr-ch-head',
    h(`span.cr-ch-num${cp >= 1 ? '.done' : ''}`, cp >= 1 ? icon('check') : String(i + 1)),
    h(
      'div.cr-ch-text',
      h('strong', ch.title),
      playable ? h('div.cr-ch-meta', h('div.bar', h('span', { style: `width:${pct(cp)}` })), h('small', `${learnedN}/${ch.lines.length} lines`)) : h('small', 'In production'),
    ),
    playable ? h('span.cr-ch-chev', icon('chevron')) : null,
  );
  if (!playable || !ch.lines.length) return h('div.cr-chapter.locked', head);
  const rows = ch.lines.map((l) => {
    const s = p.lines[lineKey(ch.id, l.id)];
    const lp = lineProgress(s);
    const preview = formatLine(startFen(l), l.moves.slice(0, 6).map((m) => m.san)) + (l.moves.length > 6 ? ' …' : '');
    return h(
      'li.cr-line',
      h(
        'a.cr-line-main',
        { href: `#/course/${c.id}/learn/${ch.id}/${l.id}` },
        h(`span.cr-line-state.s${lp * 2}`, lp >= 1 ? icon('check') : null),
        h('span.cr-line-text', h('strong', l.title), h('small', l.startFen ? (l.intro ?? preview) : preview)),
      ),
      s?.learned ? h('a.btn.sm.ghost.cr-line-practice', { href: `#/course/${c.id}/practice/${ch.id}/${l.id}`, 'aria-label': `Practice ${l.title}` }, icon('replay')) : null,
    );
  });
  const d = h('details.cr-chapter', head, h('div.cr-ch-body', ch.intro ? h('p.cr-ch-intro', ch.intro) : null, h('ul.cr-lines', rows)));
  (d as HTMLDetailsElement).open = open;
  return d;
}

// =================================================================== shared screen chrome

function screenHead(c: Course, eyebrow: string, title: string, right?: Node): HTMLElement {
  return h(
    'header.cr-screen-head',
    h('a.icon-btn.back', { href: `#/course/${c.id}`, 'aria-label': 'Back to course' }, icon('back')),
    h('div.grow', h('div.eyebrow', eyebrow), h('h2', title)),
    right ?? null,
  );
}

function arrowsOf(move: LineMove): DrawShape[] {
  return shapesOf(move).map((s) => ({ orig: s.orig as Key, dest: s.dest as Key | undefined, brush: s.brush }));
}

function startPlyOf(fen: string): number {
  const [, turn, , , , full] = fen.split(' ');
  return (Number(full) - 1) * 2 + (turn === 'b' ? 1 : 0);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// =================================================================== learn

export async function courseLearnView([id, chapterId, lineId]: string[]): Promise<View> {
  const c = courseById(id);
  if (!c || !isPlayable(c)) return notFound();
  const found = findLine(c, chapterId, lineId);
  if (!found) return notFound('Line not found.');
  trackStudy(studyBucket(c));
  const { chapter, line, index } = found;
  let progress = await loadProgress(c.id);
  const key = lineKey(chapter.id, line.id);
  const ps = plies(line);
  const n = ps.length;
  const start = startFen(line);
  const oppName = line.userSide === 'white' ? 'Black' : 'White';

  const board = new BoardView({ orientation: line.userSide });
  const coach = new Coach(board);
  const moves = new MoveList((i) => show(i + 1, false), { startPly: startPlyOf(start) });
  const counter = h('span.cr-counter');
  const firstBtn = h('button.btn.cr-ctl', { type: 'button', 'aria-label': 'Start of line', onclick: () => (stopAuto(), show(0, false)) }, icon('first')) as HTMLButtonElement;
  const prevBtn = h('button.btn.cr-ctl', { type: 'button', 'aria-label': 'Previous move', onclick: () => (stopAuto(), show(idx - 1, false)) }, icon('prev')) as HTMLButtonElement;
  const autoBtn = h('button.btn.cr-ctl', { type: 'button', 'aria-label': 'Auto-play', onclick: () => toggleAuto() }, icon('play_arrow')) as HTMLButtonElement;
  const nextBtn = h('button.btn.primary.cr-ctl.cr-next', { type: 'button', onclick: () => (stopAuto(), forward()) }, 'Next', icon('next')) as HTMLButtonElement;

  let idx = 0;
  let ended = false;
  let ctrl: AbortController | null = null;
  let auto = false;
  let autoTimer = 0;
  let destroyed = false;

  const stepText = (k: number): { text: string; mood: Mood; title?: string } => {
    if (k === 0) return { text: line.intro ?? (index === 0 ? chapter.intro : `Let's learn **${line.title}**.`), mood: 'neutral', title: line.title };
    const p = ps[k - 1];
    const label = moveNumberLabel(p.fenBefore, p.san);
    if (p.move.text) return { text: p.move.text, mood: p.move.trap ? 'worried' : p.san.endsWith('#') ? 'excited' : p.user ? 'happy' : 'thinking', title: label };
    return { text: p.user ? `Play **${p.san}** here.` : `${oppName} answers ${p.san}.`, mood: p.user ? 'happy' : 'neutral', title: label };
  };

  const decorate = (k: number) => {
    board.badge(null);
    if (k === 0) {
      board.arrows([]);
      board.highlight({});
      return;
    }
    const p = ps[k - 1];
    board.highlight(p.move.highlights ?? {});
    board.arrows(arrowsOf(p.move));
    if (p.move.trap) board.badge(p.to, 'mistake');
    else if (p.san.endsWith('#')) board.badge(p.to, 'best');
  };

  const sync = () => {
    counter.textContent = `${idx}/${n}`;
    moves.render(ps.slice(0, idx).map((p) => ({ san: p.san, cls: p.move.trap ? 'mistake' : undefined })), idx - 1);
    firstBtn.disabled = prevBtn.disabled = idx === 0;
    nextBtn.classList.toggle('pulse', !auto && !ended);
    nextBtn.replaceChildren(idx >= n ? 'Finish' : 'Next', icon('next'));
  };

  async function show(k: number, animate: boolean) {
    ctrl?.abort();
    const my = (ctrl = new AbortController());
    ended = false;
    idx = Math.max(0, Math.min(n, k));
    sync();
    const s = stepText(idx);
    coach.setActions([]);
    coach.say(s.text, s.mood, { title: s.title, fen: idx ? ps[idx - 1].fenAfter : start });
    if (animate && idx > 0) {
      const p = ps[idx - 1];
      board.badge(null);
      board.highlight({});
      const ok = await board.playLine(p.fenBefore, [p.san], { signal: my.signal, delay: 600, brush: p.user ? 'green' : 'paleBlue' });
      if (!ok || my.signal.aborted) return;
    } else {
      const p = idx ? ps[idx - 1] : null;
      board.set(p ? p.fenAfter : start, { lastMove: p ? [p.from, p.to] : undefined });
      if (p && !animate) playSound(p.captured ? 'capture' : 'move');
    }
    decorate(idx);
    if (auto) scheduleAuto(s.text);
  }

  function forward() {
    if (ended) return;
    if (idx < n) void show(idx + 1, true);
    else void finish();
  }

  function scheduleAuto(text: string) {
    clearTimeout(autoTimer);
    autoTimer = window.setTimeout(() => (auto && !destroyed ? forward() : undefined), 1400 + Math.min(4000, text.length * 38));
  }

  function toggleAuto() {
    auto = !auto;
    autoBtn.replaceChildren(icon(auto ? 'pause' : 'play_arrow'));
    autoBtn.classList.toggle('on', auto);
    autoBtn.setAttribute('aria-label', auto ? 'Pause' : 'Auto-play');
    sync();
    if (auto) forward();
    else clearTimeout(autoTimer);
  }

  function stopAuto() {
    if (auto) toggleAuto();
  }

  async function finish() {
    stopAuto();
    ended = true;
    progress = markLearned(progress, key);
    await saveProgress(c!.id, progress);
    if (destroyed) return;
    const nl = nextLineAfter(c!, chapter.id, line.id);
    coach.say(line.summary, 'excited', { title: 'Line learned!' });
    coach.setActions([
      { label: 'Practice it now', icon: 'replay', primary: true, onclick: () => go(`/course/${c!.id}/practice/${chapter.id}/${line.id}`) },
      ...(nl ? [{ label: 'Next line', icon: 'next' as const, onclick: () => go(`/course/${c!.id}/learn/${nl.chapter}/${nl.line}`) }] : []),
      { label: 'Replay', icon: 'first', onclick: () => void show(0, false) },
    ]);
    nextBtn.classList.remove('pulse');
    board.badge(null);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'ArrowRight') (stopAuto(), forward());
    else if (e.key === 'ArrowLeft') (stopAuto(), void show(idx - 1, false));
  };
  addEventListener('keydown', onKey);

  const el = h(
    'div.page.cr-screen.cr-learn',
    screenHead(c, `${chapter.title} · Learn`, line.title, counter),
    h(
      'div.play-layout',
      h('div.board-col', board.el, moves.el),
      h(
        'div.side-col',
        coach.el,
        h('div.cr-controls', firstBtn, prevBtn, autoBtn, nextBtn),
        h(
          'div.cr-aside',
          h('div.cr-loop', ['Learn', 'Practice', 'Play it out'].map((t, i) => h(`span${i === 0 ? '.on' : ''}`, t))),
          h('p.muted.small', `Line ${index + 1} of ${chapter.lines.length} in "${chapter.title}". Tap a move in the coach's note to see it on the board. Arrow keys step through the line.`),
        ),
      ),
    ),
  );
  board.set(start);
  // let the board lay out before the first narration (arrows need its size)
  requestAnimationFrame(() => void show(0, false));
  return {
    el,
    title: line.title,
    destroy: () => {
      destroyed = true;
      ctrl?.abort();
      clearTimeout(autoTimer);
      coach.stop();
      removeEventListener('keydown', onKey);
      board.destroy();
    },
  };
}

// =================================================================== practice

const PRAISE = ['Correct!', 'Nice, that\'s the move.', 'Exactly right.', 'Well remembered!', 'Yes!'];

export async function coursePracticeView([id, chapterId, lineId]: string[]): Promise<View> {
  const c = courseById(id);
  if (!c || !isPlayable(c)) return notFound();
  trackStudy(studyBucket(c));
  let progress = await loadProgress(c.id);
  const allLines = new Map(c.chapters.flatMap((ch) => ch.lines.map((l) => [lineKey(ch.id, l.id), { chapter: ch, line: l }] as const)));

  let keys: string[];
  let mode: 'single' | 'due' | 'extra';
  if (chapterId && lineId) {
    keys = allLines.has(lineKey(chapterId, lineId)) ? [lineKey(chapterId, lineId)] : [];
    mode = 'single';
  } else {
    keys = dueKeys(c, progress);
    mode = 'due';
    if (!keys.length) {
      keys = [...allLines.keys()].filter((k) => progress.lines[k]?.learned);
      mode = 'extra';
    }
  }
  if (!keys.length) {
    const next = nextToLearn(c, progress);
    return {
      el: h(
        'div.page.cr-screen',
        screenHead(c, c.title, 'Practice'),
        h('div.cr-empty', icon('book'), h('h3', 'Learn a line first'), h('p.muted', 'Practice tests the lines you have learned, from memory.'), next ? h('a.btn.primary', { href: `#/course/${c.id}/learn/${next.chapter}/${next.line}` }, 'Learn your first line') : null),
      ),
    };
  }

  const queue = new PracticeQueue(keys);
  const total = keys.length;
  let handler: ((m: UserMove) => void) | null = null;
  const board = new BoardView({ onMove: (m) => handler?.(m) });
  const coach = new Coach(board);
  const leftPill = h('span.pill.cr-left');
  const streakPill = h('span.pill.cr-streak', icon('fire'), h('span'));
  const hintBtn = h('button.btn.cr-hint', { type: 'button', onclick: () => hint() }, icon('hint'), 'Hint') as HTMLButtonElement;
  const lineTitle = h('div.cr-line-title');
  const eyebrow = h('div.eyebrow');
  let destroyed = false;
  let token = 0; // bumps whenever a new line / mode starts, so stale timers do nothing
  let best = progress.bestStreak ?? 0;

  // per-line state
  let ps: Ply[] = [];
  let idx = 0;
  let side: 'white' | 'black' = 'white';
  let mistakes = 0;
  let hinted = false;
  let hintLevel = 0;
  let cur: { chapter: Chapter; line: Line } | null = null;

  const updateStats = () => {
    leftPill.textContent = `${queue.remaining} left`;
    (streakPill.lastChild as HTMLElement).textContent = String(queue.streak);
    streakPill.classList.toggle('hot', queue.streak >= 3);
  };

  function startLine() {
    const k = queue.current;
    updateStats();
    if (!k) return sessionDone();
    const t = ++token;
    cur = allLines.get(k)!;
    ps = plies(cur.line);
    idx = 0;
    mistakes = 0;
    hinted = false;
    hintLevel = 0;
    side = cur.line.userSide;
    eyebrow.textContent = `${cur.chapter.title} · ${mode === 'extra' ? 'Extra practice' : 'Practice'}`;
    lineTitle.textContent = cur.line.title;
    board.setOrientation(side);
    board.set(startFen(cur.line));
    board.arrows([]);
    board.highlight({});
    board.badge(null);
    coach.setActions([]);
    coach.say(cur.line.startFen ? (cur.line.intro ?? 'Find the best moves.') : `Play the line from memory. You have the ${side} pieces.`, 'neutral', {
      title: `Line ${Math.min(queue.done + 1, total)} of ${total}${queue.done >= total ? ' (retry)' : ''}`,
    });
    hintBtn.hidden = false;
    hintBtn.disabled = true;
    handler = onUserMove;
    setTimeout(() => t === token && void advance(t), 500);
  }

  async function advance(t: number) {
    while (idx < ps.length && !ps[idx].user) {
      const p = ps[idx];
      board.set(p.fenBefore, { lastMove: idx ? [ps[idx - 1].from, ps[idx - 1].to] : undefined });
      await sleep(idx === 0 ? 150 : 420);
      if (t !== token || destroyed) return;
      board.badge(null);
      board.arrows([]);
      board.playMove(p.fenAfter, p.from, p.to, p.captured, null);
      idx++;
      await sleep(260);
      if (t !== token || destroyed) return;
    }
    if (idx >= ps.length) return void finishLine(t);
    const p = ps[idx];
    board.set(p.fenBefore, { lastMove: idx ? [ps[idx - 1].from, ps[idx - 1].to] : undefined, movable: side });
    hintBtn.disabled = false;
    hintLevel = 0;
  }

  function onUserMove(m: UserMove) {
    const t = token;
    const p = ps[idx];
    if (!p || !p.user) return;
    const r = isExpected(p, m);
    const g = new Chess(p.fenBefore);
    let mv;
    try {
      mv = g.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
    } catch {
      board.set(p.fenBefore, { movable: side });
      return;
    }
    board.arrows([]);
    if (r.ok) {
      board.set(g.fen(), { lastMove: [mv.from, mv.to] });
      playSound(g.inCheck() ? 'check' : mv.captured ? 'capture' : 'move');
      board.badge(mv.to, 'best');
      board.highlight(p.move.highlights ?? {});
      const praise = PRAISE[(idx + queue.done) % PRAISE.length];
      coach.say(p.move.text ?? praise, 'happy', { title: p.move.text ? `${praise} ${mv.san}` : mv.san, fen: g.fen() });
      idx++;
      hintBtn.disabled = true;
      setTimeout(() => t === token && !destroyed && void advance(t), p.move.text ? 900 : 550);
      return;
    }
    // wrong move: show it, mark it, then take it back and point at the right one
    mistakes++;
    board.set(g.fen(), { lastMove: [mv.from, mv.to] });
    playSound('bad');
    board.badge(mv.to, 'mistake');
    coach.say(`In this line we play **${p.san}**. Try it now.`, 'worried', { title: `Not ${mv.san}`, fen: p.fenBefore });
    hintBtn.disabled = true;
    setTimeout(() => {
      if (t !== token || destroyed) return;
      board.badge(null);
      board.set(p.fenBefore, { lastMove: idx ? [ps[idx - 1].from, ps[idx - 1].to] : undefined, movable: side });
      board.arrows([{ orig: p.from as Key, dest: p.to as Key, brush: 'green' }]);
    }, 1100);
  }

  function hint() {
    const p = ps[idx];
    if (!p?.user) return;
    hinted = true;
    if (hintLevel === 0) {
      board.arrows([{ orig: p.from as Key, brush: 'green' }]);
      board.flash([p.from], 'green', 1200);
      coach.say(`Move the piece on ${p.from}.`, 'thinking', { title: 'Hint' });
      hintLevel = 1;
    } else {
      board.arrows([{ orig: p.from as Key, dest: p.to as Key, brush: 'green' }]);
      coach.say(`Play **${p.san}**.`, 'thinking', { title: 'Hint', fen: p.fenBefore });
      hintBtn.disabled = true;
    }
  }

  async function finishLine(t: number) {
    if (!cur) return;
    hintBtn.hidden = true;
    const result: ReviewResult = mistakes ? 'mistake' : hinted ? 'hinted' : 'clean';
    const k = queue.current!;
    progress = review(progress, k, result);
    queue.next(result);
    if (queue.streak > best) best = queue.streak;
    progress = { ...progress, bestStreak: best };
    await saveProgress(c!.id, progress);
    if (t !== token || destroyed) return;
    updateStats();
    const last = ps[ps.length - 1];
    board.set(last.fenAfter, { lastMove: [last.from, last.to] });
    if (result === 'clean') playSound('good');
    const title = result === 'clean' ? 'Perfect line!' : result === 'hinted' ? 'Done, with a hint' : 'Line done';
    const extra = result === 'mistake' ? ' It will come back soon.' : '';
    coach.say(cur.line.summary + extra, result === 'clean' ? 'excited' : result === 'hinted' ? 'happy' : 'thinking', { title });
    const finalFen = last.fenAfter;
    const over = new Chess(finalFen).isGameOver();
    coach.setActions([
      ...(queue.current ? [{ label: 'Next line', icon: 'next' as const, primary: true, onclick: () => startLine() }] : [{ label: 'Finish', icon: 'check' as const, primary: true, onclick: () => sessionDone() }]),
      ...(over ? [] : [{ label: 'Play it out', icon: 'bot' as const, onclick: () => playOut(finalFen, cur!.line.userSide) }]),
    ]);
  }

  function sessionDone() {
    token++;
    handler = null;
    hintBtn.hidden = true;
    updateStats();
    const p = courseProgress(c!, progress);
    coach.say(`You practised ${total} line${total === 1 ? '' : 's'}. Course progress: **${pct(p)}**.`, 'excited', { title: 'Session complete' });
    coach.setActions([
      { label: 'Back to course', icon: 'back', primary: true, onclick: () => go(`/course/${c!.id}`) },
      ...(nextToLearn(c!, progress) ? [{ label: 'Learn a new line', icon: 'learn' as const, onclick: () => { const n = nextToLearn(c!, progress)!; go(`/course/${c!.id}/learn/${n.chapter}/${n.line}`); } }] : []),
    ]);
  }

  // ---------------------------------------------------------- play it out vs a bot
  function playOut(fen: string, me: 'white' | 'black') {
    const t = ++token;
    const g = new Chess(fen);
    const myTurn = () => (g.turn() === 'w' ? 'white' : 'black') === me;
    hintBtn.hidden = true;
    board.arrows([]);
    board.highlight({});
    board.badge(null);
    board.setOrientation(me);
    eyebrow.textContent = 'Play it out';
    coach.say(`Now play on against **${PLAYOUT_BOT.name}** (${PLAYOUT_BOT.elo}). Use the ideas from this line!`, 'excited', { title: 'Play it out' });
    const back = queue.current ? { label: 'Next line', icon: 'next' as const, primary: true, onclick: () => startLine() } : { label: 'Finish', icon: 'check' as const, primary: true, onclick: () => sessionDone() };
    coach.setActions([back, { label: 'Restart', icon: 'replay', onclick: () => playOut(fen, me) }]);
    const sync = () => board.set(g.fen(), { lastMove: lastOf(g), movable: !g.isGameOver() && myTurn() ? me : null });
    const ended = () => {
      if (!g.isGameOver()) return false;
      const won = g.isCheckmate() && !myTurn();
      coach.say(g.isCheckmate() ? (won ? 'Checkmate! You won the game.' : 'Checkmated this time. Try again from the same spot!') : 'The game is a draw.', won ? 'excited' : g.isCheckmate() ? 'sad' : 'neutral', { title: 'Game over' });
      playSound('end');
      return true;
    };
    const botTurn = async () => {
      if (ended()) return;
      const uci = await botMove(PLAYOUT_BOT, g.fen(), 900).catch(() => '');
      if (t !== token || destroyed) return;
      let mv;
      try {
        mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
      } catch {
        const legal = g.moves({ verbose: true });
        mv = g.move(legal[Math.floor(Math.random() * legal.length)]);
      }
      board.playMove(g.fen(), mv.from, mv.to, !!mv.captured, g.isGameOver() ? null : me);
      ended();
    };
    handler = (m) => {
      if (t !== token || !myTurn()) return;
      try {
        const mv = g.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
        board.playMove(g.fen(), mv.from, mv.to, !!mv.captured, null);
      } catch {
        sync();
        return;
      }
      void botTurn();
    };
    sync();
    if (!myTurn()) void botTurn();
  }

  const el = h(
    'div.page.cr-screen.cr-practice',
    h(
      'header.cr-screen-head',
      h('a.icon-btn.back', { href: `#/course/${c.id}`, 'aria-label': 'Back to course' }, icon('back')),
      h('div.grow', eyebrow, h('h2', lineTitle)),
      h('div.cr-stats', streakPill, leftPill),
    ),
    h('div.play-layout', h('div.board-col', board.el), h('div.side-col', coach.el, h('div.cr-controls', hintBtn))),
  );
  requestAnimationFrame(() => !destroyed && startLine());
  return {
    el,
    title: 'Practice',
    destroy: () => {
      destroyed = true;
      token++;
      engine.cancelAll();
      coach.stop();
      board.destroy();
    },
  };
}

function lastOf(g: Chess): [string, string] | undefined {
  const hst = g.history({ verbose: true });
  const m = hst[hst.length - 1];
  return m ? [m.from, m.to] : undefined;
}

