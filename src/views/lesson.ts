import { Chess } from 'chess.js';
import { h, rich, toast } from '../ui/dom';
import { BoardView, arrow, type UserMove } from '../ui/board';
import { playSound } from '../ui/sound';
import { lessonById, lessonsForTrack, ALL_LESSONS } from '../lessons';
import type { Lesson, Step, TryStep, DemoStep, PlayoutStep, QuizStep } from '../lessons/types';
import { getLessonProgress, saveLessonProgress, categoryBucket } from '../store/db';
import { trackStudy } from '../store/tracker';
import { engine, scoreNum } from '../engine/engine';
import { explainBest } from '../chess/explain';
import { material, turnColor, moveToUci } from '../chess/util';
import { go, type View } from '../router';

export async function lessonView([id]: string[]): Promise<View> {
  const lesson = lessonById(id);
  if (!lesson) {
    return { el: h('div.page', h('p', 'Lesson not found.'), h('a.btn', { href: '#/learn' }, 'Back to lessons')) };
  }
  trackStudy(categoryBucket(lesson.category));
  const progress = (await getLessonProgress()).get(lesson.id);
  return new LessonPlayer(lesson, progress?.step ?? 0, progress?.completed ?? false).view();
}

class LessonPlayer {
  private idx: number;
  private board: BoardView;
  private panel = h('div.lesson-panel');
  private dots = h('div.dots');
  private root: HTMLElement;
  private cleanSolves = 0;
  private cleanup: (() => void) | null = null;
  private onBoardMove: ((m: UserMove) => void) | null = null;

  constructor(private lesson: Lesson, startStep: number, private completed: boolean) {
    this.idx = Math.min(startStep, lesson.steps.length); // steps.length == summary screen
    this.board = new BoardView({ onMove: (m) => this.onBoardMove?.(m) });
    this.root = h(
      'div.page.lesson',
      h('header.lesson-head', h('a.icon-btn', { href: '#/learn', 'aria-label': 'Back' }, '‹'), h('div.grow', h('div.eyebrow', `Level ${lesson.level} · ${lesson.minutes} min`), h('h2', lesson.title)), this.dots),
      h('div.play-layout', h('div.board-col', this.board.el), h('div.side-col', this.panel)),
    );
    this.render();
  }

  view(): View {
    return {
      el: this.root,
      destroy: () => {
        this.cleanup?.();
        engine.cancelAll();
        this.board.destroy();
      },
    };
  }

  private renderDots() {
    this.dots.replaceChildren(
      ...this.lesson.steps.map((s, i) =>
        h(`button.dot${i === this.idx ? '.on' : ''}${i < this.idx ? '.done' : ''}${s.kind === 'try' || s.kind === 'playout' ? '.try' : ''}`, {
          'aria-label': `Step ${i + 1}`,
          onclick: () => this.goto(i),
        }),
      ),
    );
  }

  private goto(i: number) {
    this.cleanup?.();
    this.cleanup = null;
    engine.cancelAll();
    this.idx = Math.max(0, Math.min(i, this.lesson.steps.length));
    void saveLessonProgress({ id: this.lesson.id, completed: this.completed, step: Math.min(this.idx, this.lesson.steps.length - 1), clean: this.cleanSolves, updated: Date.now() });
    this.render();
    this.root.scrollIntoView({ block: 'start' });
  }

  private next = () => this.goto(this.idx + 1);

  private nav(canNext = true, nextLabel = 'Next') {
    return h(
      'div.step-nav',
      h('button.btn.ghost', { disabled: this.idx === 0, onclick: () => this.goto(this.idx - 1) }, '‹ Back'),
      h(`button.btn.primary${canNext ? '' : '.muted'}`, { onclick: this.next }, nextLabel),
    );
  }

  private render() {
    this.renderDots();
    this.onBoardMove = null;
    this.board.clearAnnotations();
    this.board.el.classList.remove('dim'); // a position-less quiz dims the board
    if (this.idx >= this.lesson.steps.length) return this.renderSummary();
    const step = this.lesson.steps[this.idx];
    const head = h('div.step-kind', stepLabel(step), step.title ? h('span', ` · ${step.title}`) : null);
    this.panel.replaceChildren(head);
    switch (step.kind) {
      case 'explain': {
        this.board.set(step.fen, { orientation: step.orientation ?? turnColor(step.fen) });
        this.board.annotate(step);
        this.panel.append(rich(step.text), this.nav());
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

  // ---------------------------------------------------------------- demo
  private renderDemo(step: DemoStep) {
    const fens: string[] = [step.fen];
    const lastMoves: ([string, string] | undefined)[] = [undefined];
    const g = new Chess(step.fen);
    for (const m of step.moves) {
      const mv = g.move(m.san);
      fens.push(g.fen());
      lastMoves.push([mv.from, mv.to]);
    }
    let i = 0;
    const text = h('div.demo-text');
    const counter = h('span.counter');
    const moveList = h('div.demo-moves');
    const orientation = step.orientation ?? turnColor(step.fen);
    const show = (k: number, sound = true) => {
      i = Math.max(0, Math.min(k, step.moves.length));
      this.board.set(fens[i], { lastMove: lastMoves[i], orientation });
      if (sound && i > 0) playSound(step.moves[i - 1].san.includes('x') ? 'capture' : 'move');
      this.board.annotate(i === 0 ? step : step.moves[i - 1]);
      text.replaceChildren(rich(i === 0 ? step.text : step.moves[i - 1].text));
      counter.textContent = `${i} / ${step.moves.length}`;
      moveList.replaceChildren(
        ...step.moves.map((m, k) => h(`button.chip${k === i - 1 ? '.on' : ''}`, { onclick: () => show(k + 1) }, m.san)),
      );
      prev.disabled = i === 0;
      nextBtn.disabled = i === step.moves.length;
      nextBtn.classList.toggle('pulse', i < step.moves.length);
    };
    const prev = h('button.btn', { onclick: () => show(i - 1), 'aria-label': 'Previous move' }, '◀') as HTMLButtonElement;
    const nextBtn = h('button.btn.primary', { onclick: () => show(i + 1), 'aria-label': 'Next move' }, 'Play move ▶') as HTMLButtonElement;
    this.panel.append(text, moveList, h('div.demo-ctrl', h('button.btn', { onclick: () => show(0) }, '⟲'), prev, counter, nextBtn), this.nav(true, 'Continue'));
    show(0, false);
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
    const status = h('div.try-status');
    const hintBox = h('div.hints');
    const after = h('div');
    const timers: number[] = [];
    this.cleanup = () => timers.forEach(clearTimeout);

    const sync = (last?: [string, string]) => this.board.set(g.fen(), { lastMove: last, movable: done ? null : learner, orientation });
    const finish = (bonus?: string) => {
      done = true;
      sync(lastOf(g));
      playSound('good');
      if (!mistakes && !hintsShown) this.cleanSolves++;
      this.board.annotate(step.solvedAnnotations ?? {});
      status.replaceChildren(h('div.banner.good', mistakes || hintsShown ? '✓ Solved' : '✓ Solved first try!'));
      after.replaceChildren(...(bonus ? [rich(bonus)] : []), rich(step.explain), this.nav(true, 'Continue'));
      hintBtn.remove();
      solBtn.remove();
    };
    const autoReply = () => {
      const reply = step.solution[ply];
      timers.push(
        window.setTimeout(() => {
          const mv = g.move(reply);
          ply++;
          this.board.playMove(g.fen(), mv.from, mv.to, !!mv.captured, learner);
          status.replaceChildren(h('div.banner.info', `Opponent replies ${mv.san}. Your move again.`));
        }, 550),
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
        status.replaceChildren(h('div.banner.good', `✓ ${mv.san} — correct!`));
        return autoReply();
      }
      // Not the book move: ask Stockfish whether it's just as good.
      this.board.set(g.fen(), { lastMove: [mv.from, mv.to], movable: null, orientation });
      status.replaceChildren(h('div.banner.info', 'Checking your move…'));
      checking = true;
      const verdict = await judgeAlternative(before, moveToUci(mv), step.solution[ply]);
      checking = false;
      if (this.onBoardMove !== handler || done) return; // the learner left this step meanwhile
      if (verdict === 'equal' && step.solution.length - ply === 1) {
        return finish(`**${mv.san}** is just as strong — nicely found! (The lesson move was ${expected}.)`);
      }
      g.undo();
      mistakes++;
      playSound('bad');
      const msg = verdict === 'equal' ? `${mv.san} is also good, but look for the move that fits this lesson's idea.` : `${mv.san} isn't it. ${step.hints[Math.min(hintsShown, step.hints.length - 1)] ? 'Try again — or take a hint.' : 'Try again.'}`;
      status.replaceChildren(h(`div.banner.${verdict === 'equal' ? 'info' : 'bad'}`, msg));
      timers.push(window.setTimeout(() => sync(), 450));
    };
    this.onBoardMove = handler;

    const hintBtn = h('button.btn', {
      onclick: () => {
        if (checking) return;
        if (hintsShown < step.hints.length) {
          hintBox.append(h('div.hint', `💡 ${step.hints[hintsShown]}`));
          hintsShown++;
          if (hintsShown === step.hints.length) hintBtn.textContent = 'Show first move';
        } else {
          const t = new Chess(g.fen()).move(step.solution[ply]);
          this.board.arrows([arrow(t.from + t.to, 'green')]);
          hintsShown++;
        }
      },
    }, 'Hint');
    const solBtn = h('button.btn.ghost', {
      onclick: () => {
        if (checking) return;
        // Play the rest of the solution with explanations.
        hintsShown += 10;
        while (ply < step.solution.length) {
          g.move(step.solution[ply]);
          ply++;
        }
        finish(`Solution: ${step.solution.join(' ')}`);
      },
    }, 'Show solution');

    this.panel.append(
      h('div.prompt', rich(step.prompt)),
      h('div.to-move', `${learner === 'white' ? '⚪ White' : '⚫ Black'} to move`),
      status,
      hintBox,
      h('div.row', hintBtn, solBtn),
      after,
    );
    if (step.solution.length > 1) this.panel.insertBefore(h('div.muted.small', `Find ${Math.ceil(step.solution.length / 2)} moves in a row.`), status);
    sync();
    this.board.annotate(step);
  }

  // ---------------------------------------------------------------- playout
  private renderPlayout(step: PlayoutStep) {
    const learner = turnColor(step.fen);
    const lc = learner[0] as 'w' | 'b';
    let g = new Chess(step.fen);
    let moves = 0;
    let over = false;
    let hintsShown = 0;
    const status = h('div.try-status');
    const hintBox = h('div.hints');
    const after = h('div');
    const startMat = material(g) * (lc === 'w' ? 1 : -1);
    const orientation = step.orientation ?? learner;
    const counter = h('span.muted.small');

    const updateCounter = () => (counter.textContent = step.maxMoves ? `Moves: ${moves} / ${step.maxMoves}` : `Moves: ${moves}`);
    const end = (win: boolean, msg: string) => {
      over = true;
      this.board.set(g.fen(), { lastMove: lastOf(g), movable: null, orientation });
      playSound(win ? 'good' : 'bad');
      status.replaceChildren(h(`div.banner.${win ? 'good' : 'bad'}`, msg));
      after.replaceChildren(win ? this.nav(true, 'Continue') : h('div'));
    };
    const checkGoal = (): boolean => {
      const myMat = material(g) * (lc === 'w' ? 1 : -1);
      if (g.isCheckmate()) {
        end(g.turn() !== lc, g.turn() !== lc ? '✓ Checkmate — goal achieved!' : '✗ You were checkmated. Restart and try again.');
        return true;
      }
      if (g.isDraw() || g.isStalemate()) {
        const win = step.goal === 'draw';
        end(win, win ? '✓ Draw secured — well defended!' : g.isStalemate() ? '✗ Stalemate! The opponent had no legal move. Always leave the king a square.' : '✗ The game ended in a draw.');
        return true;
      }
      if (step.goal === 'promote' && g.history({ verbose: true }).some((m) => m.promotion && m.color === lc)) {
        end(true, '✓ Pawn promoted — goal achieved!');
        return true;
      }
      if (step.goal === 'win-material' && myMat - startMat >= 3) {
        end(true, '✓ Material won — goal achieved!');
        return true;
      }
      if (step.maxMoves && moves >= step.maxMoves && g.turn() === lc) {
        if (step.goal === 'draw') end(true, `✓ You held for ${moves} moves — that's a draw!`);
        else end(false, `✗ ${step.maxMoves} moves used up. Restart and try a more direct plan.`);
        return true;
      }
      return false;
    };
    const engineMove = async () => {
      status.replaceChildren(h('div.banner.info', 'Stockfish is thinking…'));
      const r = await engine.analyse(g.fen(), { movetime: 350 });
      if (over || r.bestmove === '(cancelled)' || r.bestmove === '(none)') return;
      const mv = g.move({ from: r.bestmove.slice(0, 2), to: r.bestmove.slice(2, 4), promotion: r.bestmove[4] });
      this.board.playMove(g.fen(), mv.from, mv.to, !!mv.captured, learner);
      status.replaceChildren(h('div.banner.info', `Stockfish played ${mv.san}. Your move.`));
      checkGoal();
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
        if (!checkGoal()) void engineMove();
      } catch {
        this.board.set(g.fen(), { movable: learner, orientation });
      }
    };
    const restart = () => {
      engine.cancelAll();
      g = new Chess(step.fen);
      moves = 0;
      over = false;
      updateCounter();
      status.replaceChildren();
      after.replaceChildren();
      this.board.set(step.fen, { movable: learner, orientation });
      this.board.annotate(step);
    };
    const hint = async () => {
      if (over) return;
      if (hintsShown < step.hints.length) {
        hintBox.append(h('div.hint', `💡 ${step.hints[hintsShown++]}`));
        return;
      }
      const fen = g.fen();
      const r = await engine.analyse(fen, { depth: 16 });
      if (g.fen() !== fen || !r.lines[0]) return;
      this.board.arrows([arrow(r.bestmove)]);
      hintBox.append(h('div.hint', rich(`🤖 ${explainBest(fen, r.bestmove, r.lines[0].pv)}`)));
    };
    const goalText = { mate: 'Deliver checkmate', promote: 'Promote a pawn', draw: 'Hold the draw', 'win-material': 'Win material' }[step.goal];
    this.panel.append(
      h('div.prompt', rich(step.prompt)),
      h('div.to-move', `🎯 ${goalText} · you are ${learner}`, ' ', counter),
      status,
      hintBox,
      h('div.row', h('button.btn', { onclick: hint }, 'Hint'), h('button.btn.ghost', { onclick: restart }, '⟲ Restart'), h('button.btn.ghost', { onclick: this.next }, 'Skip')),
      after,
    );
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
    const result = h('div');
    let answered = false;
    // Shuffle so the right answer isn't always in the same place.
    const order = step.options.map((_, i) => i).sort(() => Math.random() - 0.5);
    const opts = order.map((i) => [step.options[i], i] as const).map(([o, i]) =>
      h('button.option', {
        onclick: (e: Event) => {
          if (answered) return;
          const btn = e.currentTarget as HTMLElement;
          if (i === step.answer) {
            answered = true;
            btn.classList.add('right');
            playSound('good');
            result.replaceChildren(h('div.banner.good', '✓ Correct!'), rich(step.explain), this.nav(true, 'Continue'));
          } else {
            btn.classList.add('wrong');
            playSound('bad');
            result.replaceChildren(h('div.banner.bad', 'Not quite — think again.'));
          }
        },
      }, o),
    );
    this.panel.append(h('div.prompt', rich(step.question)), h('div.options', opts), result);
  }

  // ---------------------------------------------------------------- summary
  private renderSummary() {
    this.board.el.classList.remove('dim');
    this.completed = true;
    void saveLessonProgress({ id: this.lesson.id, completed: true, step: this.lesson.steps.length - 1, clean: this.cleanSolves, updated: Date.now() });
    const track = lessonsForTrack(this.lesson.track);
    const pos = ALL_LESSONS.indexOf(this.lesson);
    const nextLesson = ALL_LESSONS[pos + 1];
    playSound('end');
    this.panel.replaceChildren(
      h('div.banner.good', '🏆 Lesson complete'),
      h('h3', 'Key points'),
      h('ul.keypoints', this.lesson.keyPoints.map((k) => h('li', rich(k)))),
      h(
        'div.row.wrap',
        nextLesson ? h('button.btn.primary', { onclick: () => go(`/lesson/${nextLesson.id}`) }, `Next: ${nextLesson.title} ›`) : null,
        h('button.btn', { onclick: () => this.goto(0) }, 'Review again'),
        h('button.btn.ghost', { onclick: () => go('/learn') }, 'All lessons'),
      ),
      h('p.muted.small', `${track.indexOf(this.lesson) + 1} of ${track.length} in this track.`),
    );
    toast('Progress saved', 'good');
  }
}

function stepLabel(s: Step) {
  return { explain: '📖 Learn', demo: '▶ Watch', try: '🎯 Try it', playout: '♟ Play it out', quiz: '❓ Quiz' }[s.kind];
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
