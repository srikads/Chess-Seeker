import { Chess } from 'chess.js';
import { h, toast, setChildren } from '../ui/dom';
import { BoardView, arrow, type UserMove } from '../ui/board';
import { Coach, coachText, mascot } from '../ui/coach';
import { icon, type IconName } from '../ui/icons';
import { playSound } from '../ui/sound';
import { lessonById, lessonsForTrack, ALL_LESSONS } from '../lessons';
import type { Lesson, Step, TryStep, DemoStep, PlayoutStep, QuizStep } from '../lessons/types';
import { getLessonProgress, saveLessonProgress, categoryBucket } from '../store/db';
import { trackStudy } from '../store/tracker';
import { engine, scoreNum } from '../engine/engine';
import { explainBest } from '../chess/explain';
import { demoNarration } from '../chess/lessonSteps';
import { material, turnColor, moveToUci } from '../chess/util';
import { go, type View } from '../router';
import '../styles/learn.css';

export async function lessonView([id]: string[]): Promise<View> {
  const lesson = lessonById(id);
  if (!lesson) {
    return { el: h('div.page', h('p', 'Lesson not found.'), h('a.btn', { href: '#/learn' }, 'Back to lessons')) };
  }
  trackStudy(categoryBucket(lesson.category));
  const progress = (await getLessonProgress()).get(lesson.id);
  return new LessonPlayer(lesson, progress?.step ?? 0, progress?.completed ?? false).view();
}

const KIND: Record<Step['kind'], { label: string; icon: IconName }> = {
  explain: { label: 'Learn', icon: 'book' },
  demo: { label: 'Watch', icon: 'eye' },
  try: { label: 'Try it', icon: 'target' },
  playout: { label: 'Play it out', icon: 'play' },
  quiz: { label: 'Quiz', icon: 'hint' },
};

class LessonPlayer {
  private idx: number;
  private board: BoardView;
  private coach: Coach;
  private panel = h('div.lesson-panel2');
  private extra = h('div.lesson-extra');
  private kindEl = h('div.step-kind2');
  private bar = h('div.lesson-steps');
  private root: HTMLElement;
  private cleanSolves = 0;
  private cleanup: (() => void) | null = null;
  private onBoardMove: ((m: UserMove) => void) | null = null;

  constructor(private lesson: Lesson, startStep: number, private completed: boolean) {
    this.idx = Math.min(startStep, lesson.steps.length); // steps.length == summary screen
    this.board = new BoardView({ onMove: (m) => this.onBoardMove?.(m) });
    this.coach = new Coach(this.board);
    this.panel.append(this.kindEl, this.coach.el, this.extra);
    this.root = h(
      'div.page.lesson2',
      h(
        'header.lesson2-head',
        h('a.icon-btn.back', { href: '#/learn', 'aria-label': 'Back to lessons' }, icon('back')),
        h('div.grow', h('div.eyebrow', `Level ${lesson.level} · ${lesson.minutes} min`), h('h1', lesson.title)),
      ),
      this.bar,
      h('div.play-layout', h('div.board-col', this.board.el), h('div.side-col', this.panel)),
    );
    this.render();
  }

  view(): View {
    return {
      el: this.root,
      title: this.lesson.title,
      destroy: () => {
        this.cleanup?.();
        this.coach.stop();
        engine.cancelAll();
        this.board.destroy();
      },
    };
  }

  private renderBar() {
    this.bar.replaceChildren(
      ...this.lesson.steps.map((s, i) =>
        h(`button.lseg${i === this.idx ? '.on' : ''}${i < this.idx ? '.done' : ''}${s.kind === 'try' || s.kind === 'playout' ? '.try' : ''}`, {
          type: 'button',
          'aria-label': `Step ${i + 1}: ${KIND[s.kind].label}`,
          title: KIND[s.kind].label,
          onclick: () => this.goto(i),
        }),
      ),
    );
  }

  private goto(i: number) {
    this.cleanup?.();
    this.cleanup = null;
    this.coach.stop();
    engine.cancelAll();
    this.idx = Math.max(0, Math.min(i, this.lesson.steps.length));
    void saveLessonProgress({ id: this.lesson.id, completed: this.completed, step: Math.min(this.idx, this.lesson.steps.length - 1), clean: this.cleanSolves, updated: Date.now() });
    this.render();
    this.root.scrollIntoView({ block: 'start' });
  }

  private next = () => this.goto(this.idx + 1);

  private nav(nextLabel = 'Continue', primary = true) {
    return h(
      'div.step-nav2',
      h('button.btn.ghost', { type: 'button', disabled: this.idx === 0, onclick: () => this.goto(this.idx - 1) }, icon('back'), 'Back'),
      h(`button.btn${primary ? '.primary' : ''}`, { type: 'button', onclick: this.next }, nextLabel, icon('chevron')),
    );
  }

  private resetBoardFx() {
    this.board.badge(null);
    this.board.arrows([]);
    this.board.highlight({});
  }

  private render() {
    this.renderBar();
    this.onBoardMove = null;
    this.board.clearAnnotations();
    this.resetBoardFx();
    this.board.el.classList.remove('dim'); // a position-less quiz dims the board
    this.coach.setActions([]);
    this.extra.replaceChildren();
    this.root.classList.remove('summary');
    if (this.idx >= this.lesson.steps.length) return this.renderSummary();
    const step = this.lesson.steps[this.idx];
    const k = KIND[step.kind];
    setChildren(
      this.kindEl,
      h(`span.sk-badge.k-${step.kind}`, icon(k.icon), k.label),
      step.title ? h('span.sk-title', step.title) : null,
      h('span.sk-count', `${this.idx + 1}/${this.lesson.steps.length}`),
    );
    switch (step.kind) {
      case 'explain': {
        this.board.set(step.fen, { orientation: step.orientation ?? turnColor(step.fen) });
        this.board.annotate(step);
        this.coach.say(step.text, 'neutral', { fen: step.fen });
        this.extra.append(this.nav());
        break;
      }
      case 'demo':
        this.renderDemo(step);
        break;
      case 'try':
        this.renderTry(step);
        break;
      case 'playout':
        this.renderPlayout(step);
        break;
      case 'quiz':
        this.renderQuiz(step);
        break;
    }
  }

  // ---------------------------------------------------------------- demo ("Watch")
  private renderDemo(step: DemoStep) {
    // The coach narrates: each Next animates the move (arrow first), then shows that move's annotations
    // while the bubble explains it — words and board stay in sync.
    this.board.set(step.fen, { orientation: step.orientation ?? turnColor(step.fen) });
    this.coach.narrate(demoNarration(step), { startFen: step.fen, onExit: this.next });
    this.extra.append(this.nav('Skip', false));
  }

  // ---------------------------------------------------------------- try
  private renderTry(step: TryStep) {
    const g = new Chess(step.fen);
    const learner = turnColor(step.fen);
    const orientation = step.orientation ?? learner;
    let ply = 0;
    let hintsShown = 0;
    let mistakes = 0;
    let done = false;
    /** Stockfish is judging an alternative move; the board position is provisional */
    let checking = false;
    const timers: number[] = [];
    const anim = new AbortController();
    this.cleanup = () => (timers.forEach(clearTimeout), anim.abort());
    const side = learner === 'white' ? 'White' : 'Black';
    const movesNeeded = Math.ceil(step.solution.length / 2);
    const title = h('span.try-title', h(`span.to-move-dot.${learner}`), `${side} to move`, movesNeeded > 1 ? h('span.muted', ` · find ${movesNeeded} moves`) : null);
    const ask = () => this.coach.say(step.prompt, 'thinking', { title, fen: g.fen() });

    const sync = (last?: [string, string]) => this.board.set(g.fen(), { lastMove: last, movable: done ? null : learner, orientation });
    const finish = (bonus?: string) => {
      done = true;
      sync(lastOf(g));
      playSound('good');
      const clean = !mistakes && !hintsShown;
      if (clean) this.cleanSolves++;
      this.board.annotate(step.solvedAnnotations ?? {});
      const last = lastOf(g);
      if (last) this.board.badge(last[1], clean ? 'best' : 'good');
      this.coach.say([bonus, step.explain].filter(Boolean).join('\n\n'), clean ? 'excited' : 'happy', {
        title: h('span.solved-title', icon('check'), clean ? 'Solved first try!' : 'Solved'),
        fen: step.fen,
        tone: 'good',
      });
      this.coach.setActions([{ label: 'Continue', icon: 'chevron', primary: true, onclick: this.next }]);
    };
    const autoReply = () => {
      const reply = step.solution[ply];
      timers.push(
        window.setTimeout(() => {
          const mv = g.move(reply);
          ply++;
          this.board.badge(null);
          this.board.playMove(g.fen(), mv.from, mv.to, !!mv.captured, learner);
          this.coach.say(`Your opponent answers ${mv.san}. Keep going: your move.`, 'thinking', { title, fen: g.fen() });
        }, 650),
      );
    };

    const handler = async (m: UserMove) => {
      if (done || checking) return;
      const before = g.fen();
      let mv;
      try {
        mv = g.move(m);
      } catch {
        return sync();
      }
      const expected = step.solution[ply];
      const ok = mv.san === expected || (ply === 0 && step.alsoAccept?.includes(mv.san)) || g.isCheckmate();
      if (ok) {
        playSound(mv.captured ? 'capture' : g.inCheck() ? 'check' : 'move');
        ply++;
        this.board.arrows([]); // drop a "show first move" arrow
        const altFirst = ply === 1 && mv.san !== expected;
        if (ply >= step.solution.length || g.isCheckmate() || altFirst) return finish(altFirst ? `**${mv.san}** works too!` : undefined);
        this.board.set(g.fen(), { lastMove: [mv.from, mv.to], movable: null, orientation });
        this.board.badge(mv.to, 'best');
        this.coach.say(`**${mv.san}** is right!`, 'happy', { title, fen: before });
        return autoReply();
      }
      // Not the book move: ask Stockfish whether it's just as good.
      this.board.set(g.fen(), { lastMove: [mv.from, mv.to], movable: null, orientation });
      this.coach.say('Hmm, let me check that move…', 'thinking', { title, fen: before });
      checking = true;
      const verdict = await judgeAlternative(before, moveToUci(mv), step.solution[ply]);
      checking = false;
      if (this.onBoardMove !== handler || done) return; // the learner left this step meanwhile
      if (verdict === 'equal' && step.solution.length - ply === 1) {
        return finish(`**${mv.san}** is just as strong. Nicely found! (The lesson move was ${expected}.)`);
      }
      g.undo();
      mistakes++;
      playSound('bad');
      this.board.badge(mv.to, verdict === 'equal' ? 'inaccuracy' : 'mistake');
      const msg =
        verdict === 'equal'
          ? `${mv.san} is also good, but look for the move that fits this lesson's idea.`
          : `${mv.san} isn't it. ${step.hints[Math.min(hintsShown, step.hints.length - 1)] ? 'Try again, or tap Hint.' : 'Try again.'}`;
      this.coach.say(msg, verdict === 'equal' ? 'thinking' : 'worried', { title, fen: before, tone: verdict === 'equal' ? '' : 'bad' });
      timers.push(
        window.setTimeout(() => {
          if (this.onBoardMove !== handler || done) return;
          this.board.badge(null);
          sync();
        }, 900),
      );
    };
    this.onBoardMove = handler;

    const hint = () => {
      if (checking || done) return;
      if (hintsShown < step.hints.length) {
        this.coach.say(step.hints[hintsShown], 'thinking', { title: h('span.solved-title', icon('hint'), `Hint ${hintsShown + 1}`), fen: g.fen() });
        hintsShown++;
        if (hintsShown === step.hints.length) actions[0].label = 'Show first move';
        this.coach.setActions(actions);
      } else {
        const t = new Chess(g.fen()).move(step.solution[ply]);
        this.board.arrows([arrow(t.from + t.to, 'green')]);
        hintsShown++;
      }
    };
    const showSolution = () => {
      if (checking || done) return;
      hintsShown += 10;
      const from = g.fen();
      const rest = step.solution.slice(ply);
      done = true;
      this.coach.setActions([]);
      this.board.badge(null);
      void this.board.playLine(from, rest, { delay: 700, signal: anim.signal }).then((ok) => {
        if (!ok || this.onBoardMove !== handler) return;
        for (const san of rest) g.move(san);
        ply = step.solution.length;
        finish(`Solution: ${step.solution.join(' ')}`);
      });
    };
    const actions = [
      { label: 'Hint', icon: 'hint' as const, onclick: hint },
      { label: 'Show solution', icon: 'eye' as const, onclick: showSolution },
    ];
    sync();
    this.board.annotate(step);
    ask();
    this.coach.setActions(actions);
    this.extra.append(this.nav('Skip', false));
  }

  // ---------------------------------------------------------------- playout
  private renderPlayout(step: PlayoutStep) {
    const learner = turnColor(step.fen);
    const lc = learner[0] as 'w' | 'b';
    let g = new Chess(step.fen);
    let moves = 0;
    let over = false;
    let hintsShown = 0;
    const startMat = material(g) * (lc === 'w' ? 1 : -1);
    const orientation = step.orientation ?? learner;
    const goalText = { mate: 'Deliver checkmate', promote: 'Promote a pawn', draw: 'Hold the draw', 'win-material': 'Win material' }[step.goal];
    const counter = h('span.po-count');
    const goal = h('div.po-goal', h('span.po-goal-icon', icon('target')), h('div.grow', h('strong', goalText), h('small', `You play ${learner}`)), counter);

    const updateCounter = () => (counter.textContent = step.maxMoves ? `${moves} / ${step.maxMoves}` : `${moves} moves`);
    const end = (win: boolean, msg: string) => {
      over = true;
      this.board.set(g.fen(), { lastMove: lastOf(g), movable: null, orientation });
      playSound(win ? 'good' : 'bad');
      this.coach.say(msg, win ? 'excited' : 'sad', { tone: win ? 'good' : 'bad' });
      this.coach.setActions(
        win
          ? [{ label: 'Continue', icon: 'chevron', primary: true, onclick: this.next }]
          : [{ label: 'Try again', icon: 'replay', primary: true, onclick: restart }, { label: 'Skip', onclick: this.next }],
      );
    };
    const checkGoal = (): boolean => {
      const myMat = material(g) * (lc === 'w' ? 1 : -1);
      if (g.isCheckmate()) {
        end(g.turn() !== lc, g.turn() !== lc ? '**Checkmate!** Goal achieved.' : 'You were checkmated. Restart and try again.');
        return true;
      }
      if (g.isDraw() || g.isStalemate()) {
        const win = step.goal === 'draw';
        end(win, win ? '**Draw secured.** Well defended!' : g.isStalemate() ? '**Stalemate!** The opponent had no legal move. Always leave the king a square.' : 'The game ended in a draw.');
        return true;
      }
      if (step.goal === 'promote' && g.history({ verbose: true }).some((m) => m.promotion && m.color === lc)) {
        end(true, '**Pawn promoted!** Goal achieved.');
        return true;
      }
      if (step.goal === 'win-material' && myMat - startMat >= 3) {
        end(true, '**Material won!** Goal achieved.');
        return true;
      }
      if (step.maxMoves && moves >= step.maxMoves && g.turn() === lc) {
        if (step.goal === 'draw') end(true, `You held for ${moves} moves. **That's a draw!**`);
        else end(false, `${step.maxMoves} moves used up. Restart and try a more direct plan.`);
        return true;
      }
      return false;
    };
    const engineMove = async () => {
      const r = await engine.analyse(g.fen(), { movetime: 350 });
      if (over || r.bestmove === '(cancelled)' || r.bestmove === '(none)') return;
      const mv = g.move({ from: r.bestmove.slice(0, 2), to: r.bestmove.slice(2, 4), promotion: r.bestmove[4] });
      this.board.playMove(g.fen(), mv.from, mv.to, !!mv.captured, learner);
      if (!checkGoal()) this.coach.say(`Stockfish played ${mv.san}. Your move.`, 'neutral', { fen: g.fen() });
    };
    this.onBoardMove = (m) => {
      if (over) return;
      try {
        const mv = g.move(m);
        moves++;
        updateCounter();
        playSound(mv.captured ? 'capture' : 'move');
        this.board.set(g.fen(), { lastMove: [mv.from, mv.to], movable: null, orientation });
        this.board.clearAnnotations();
        this.board.arrows([]);
        if (!checkGoal()) void engineMove();
      } catch {
        this.board.set(g.fen(), { movable: learner, orientation });
      }
    };
    const hint = async () => {
      if (over) return;
      if (hintsShown < step.hints.length) {
        this.coach.say(step.hints[hintsShown++], 'thinking', { title: h('span.solved-title', icon('hint'), 'Hint'), fen: g.fen() });
        return;
      }
      const fen = g.fen();
      const r = await engine.analyse(fen, { depth: 16 });
      if (g.fen() !== fen || !r.lines[0]) return;
      this.board.arrows([arrow(r.bestmove)]);
      this.coach.say(explainBest(fen, r.bestmove, r.lines[0].pv), 'thinking', { title: h('span.solved-title', icon('bot'), 'Engine hint'), fen });
    };
    const actions = () => [
      { label: 'Hint', icon: 'hint' as const, onclick: () => void hint() },
      { label: 'Restart', icon: 'replay' as const, onclick: restart },
    ];
    const restart = () => {
      engine.cancelAll();
      g = new Chess(step.fen);
      moves = 0;
      over = false;
      updateCounter();
      this.board.set(step.fen, { movable: learner, orientation });
      this.board.annotate(step);
      this.coach.say(step.prompt, 'neutral', { fen: step.fen });
      this.coach.setActions(actions());
    };
    this.extra.append(goal, this.nav('Skip', false));
    updateCounter();
    restart();
  }

  // ---------------------------------------------------------------- quiz
  private renderQuiz(step: QuizStep) {
    if (step.fen) {
      this.board.set(step.fen, { orientation: step.orientation ?? turnColor(step.fen) });
      this.board.annotate(step);
    }
    this.board.el.classList.toggle('dim', !step.fen);
    this.coach.say(step.question, 'thinking', { fen: step.fen });
    let answered = false;
    // Shuffle so the right answer isn't always in the same place.
    const order = step.options.map((_, i) => i).sort(() => Math.random() - 0.5);
    const letters = 'ABCDEF';
    const opts = order.map((i, k) =>
      h(
        'button.option2',
        {
          type: 'button',
          onclick: (e: Event) => {
            if (answered) return;
            const btn = e.currentTarget as HTMLElement;
            if (i === step.answer) {
              answered = true;
              btn.classList.add('right');
              btn.querySelector('.opt-mark')?.replaceChildren(icon('check'));
              list.classList.add('answered');
              playSound('good');
              this.coach.say(step.explain, 'excited', { title: h('span.solved-title', icon('check'), 'Correct!'), fen: step.fen, tone: 'good' });
              this.coach.setActions([{ label: 'Continue', icon: 'chevron', primary: true, onclick: this.next }]);
            } else {
              btn.classList.add('wrong');
              btn.querySelector('.opt-mark')?.replaceChildren(icon('close'));
              (btn as HTMLButtonElement).disabled = true;
              playSound('bad');
              this.coach.say(`Not quite. Think again!\n\n${step.question}`, 'worried', { fen: step.fen });
            }
          },
        },
        h('span.opt-mark', letters[k]),
        h('span.grow', coachText(step.options[i], this.board, step.fen)),
      ),
    );
    const list = h('div.options2', opts);
    this.extra.append(list, this.nav('Skip', false));
  }

  // ---------------------------------------------------------------- summary
  private renderSummary() {
    this.board.el.classList.remove('dim');
    this.root.classList.add('summary');
    this.completed = true;
    void saveLessonProgress({ id: this.lesson.id, completed: true, step: this.lesson.steps.length - 1, clean: this.cleanSolves, updated: Date.now() });
    const track = lessonsForTrack(this.lesson.track);
    const pos = ALL_LESSONS.indexOf(this.lesson);
    const nextLesson = ALL_LESSONS[pos + 1];
    playSound('end');
    this.kindEl.replaceChildren(h('span.sk-badge.k-done', icon('trophy'), 'Lesson complete'), h('span.sk-count', `${track.indexOf(this.lesson) + 1} of ${track.length} in this track`));
    this.coach.say('Great work! Here is what to remember.', 'excited');
    this.extra.replaceChildren(
      h('div.summary-card', h('div.sum-face', mascot('excited')), h('h2', this.lesson.title), h('ul.keypoints2', this.lesson.keyPoints.map((k) => h('li', icon('check'), coachText(k, this.board))))),
      h(
        'div.sum-actions',
        nextLesson ? h('button.btn.primary.big', { type: 'button', onclick: () => go(`/lesson/${nextLesson.id}`) }, `Next: ${nextLesson.title}`, icon('chevron')) : null,
        h('div.row', h('button.btn.grow', { type: 'button', onclick: () => this.goto(0) }, icon('replay'), 'Review again'), h('button.btn.ghost.grow', { type: 'button', onclick: () => go('/learn') }, 'All lessons')),
      ),
    );
    toast('Progress saved', 'good');
  }
}

function lastOf(g: Chess): [string, string] | undefined {
  const hist = g.history({ verbose: true });
  const m = hist[hist.length - 1];
  return m ? [m.from, m.to] : undefined;
}

/** Is the learner's alternative about as good as the expected move? */
async function judgeAlternative(fenBefore: string, altUci: string, expectedSan: string): Promise<'equal' | 'worse'> {
  try {
    const exp = new Chess(fenBefore).move(expectedSan);
    const g1 = new Chess(fenBefore);
    g1.move({ from: exp.from, to: exp.to, promotion: exp.promotion });
    const g2 = new Chess(fenBefore);
    g2.move({ from: altUci.slice(0, 2), to: altUci.slice(2, 4), promotion: altUci[4] });
    const [a, b] = [await engine.analyse(g1.fen(), { depth: 12 }), await engine.analyse(g2.fen(), { depth: 12 })];
    if (!a.lines[0] || !b.lines[0]) return 'worse';
    const expScore = -scoreNum(a.lines[0]);
    const altScore = -scoreNum(b.lines[0]);
    if (expScore >= 9000) return altScore >= 9000 ? 'equal' : 'worse';
    return altScore >= expScore - 40 ? 'equal' : 'worse';
  } catch {
    return 'worse';
  }
}
