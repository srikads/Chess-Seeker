// One puzzle on a board, chess.com style: the opponent's setup move animates first, correct moves turn green
// with a check badge, wrong moves get a red badge and a shake, hints point at the piece then draw the arrow,
// and "Explain" walks through the solution with the coach while the board plays it.
import { Chess, type Move } from 'chess.js';
import type { Key } from '@lichess-org/chessground/types';
import { h } from '../ui/dom';
import { BoardView, type UserMove } from '../ui/board';
import { Coach, type CoachAction } from '../ui/coach';
import { icon } from '../ui/icons';
import { playSound } from '../ui/sound';
import { motifsOf } from '../chess/motifs';
import { NAME, moveToUci } from '../chess/util';
import { puzzleStart, solverColor, ucisToSans, type Puzzle, type Side } from '../data/puzzles';
import { buildPuzzleNarration } from '../data/puzzle-narration';
import '../styles/puzzles.css';

export type SolveMode = 'rated' | 'practice' | 'daily' | 'rush';
type State = 'idle' | 'setup' | 'solving' | 'solved' | 'done';

export interface SolverOptions {
  mode: SolveMode;
  /** First attempt result (once per puzzle): false on the first wrong move, hint, solution or explain. */
  onFirst?: (p: Puzzle, success: boolean) => void;
  /** Puzzle finished: solved by the learner (`clean` = no mistakes or help), or given up / failed (rush). */
  onComplete?: (p: Puzzle, solved: boolean, clean: boolean) => void;
  /** Shows the big "Next puzzle" button when set. */
  onNext?: () => void;
  nextLabel?: string;
  /** Rush: no coach, no hints; a wrong move ends the puzzle. */
  coach?: boolean;
}

const PRAISE = ['Correct!', 'Nice!', 'Good move!', 'Yes!'];
const SOLVED = ['Solved!', 'Well done!', 'Great job!', 'Excellent!'];
const sideName = (s: Side) => (s === 'white' ? 'White' : 'Black');
const rnd = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export class PuzzleSolver {
  readonly el: HTMLElement;
  readonly board: BoardView;
  readonly coach: Coach;
  readonly pill: HTMLElement;
  readonly boardBox: HTMLElement;
  readonly side: HTMLElement;
  private footer: HTMLElement;
  private o: SolverOptions;
  puzzle: Puzzle | null = null;
  private g = new Chess();
  private ply = 0;
  private state: State = 'idle';
  private missed = false;
  private reported = false;
  private hintStage = 0;
  private solver: Side = 'white';
  private timers: number[] = [];
  private anim: AbortController | null = null;
  private lastMove: [string, string] | undefined;

  constructor(o: SolverOptions) {
    this.o = o;
    this.board = new BoardView({ onMove: (m) => this.onMove(m) });
    this.coach = new Coach(this.board, { compact: o.mode === 'rush' });
    this.pill = h('div.tm-pill');
    this.boardBox = h('div.pz-board', this.board.el);
    this.footer = h('div.pz-footer');
    this.side = h('div.pz-coach', o.coach === false ? null : this.coach.el, this.footer);
    this.el = h('div.play-layout.pz-layout', h('div.board-col', this.pill, this.boardBox), h('div.side-col', this.side));
  }

  get isSolving() {
    return this.state === 'solving' || this.state === 'setup';
  }

  /** Start a puzzle. `again` = retry of the same puzzle (keeps the first-attempt result). */
  load(p: Puzzle, again = false) {
    this.clear();
    if (!again) {
      this.missed = false;
      this.reported = false;
    }
    this.puzzle = p;
    this.g = new Chess(p.fen);
    this.ply = 0;
    this.hintStage = 0;
    this.solver = solverColor(p);
    this.lastMove = undefined;
    this.board.clearAnnotations();
    this.board.badge(null);
    this.board.set(p.fen, { orientation: this.solver, movable: null });
    this.setPill('turn');
    this.footer.replaceChildren();
    const { setupSan } = puzzleStart(p);
    const opp = sideName(this.solver === 'white' ? 'black' : 'white');
    if (this.o.coach !== false)
      this.coach.say(setupSan ? `${opp} played **${setupSan}**. Find the best move for ${sideName(this.solver)}.` : `Find the best move for ${sideName(this.solver)}.`, 'neutral', {
        fen: p.fen,
      });
    if (p.setup) {
      this.state = 'setup';
      this.renderActions();
      this.later(() => this.playOpponent(), again ? 350 : 600);
    } else {
      this.state = 'solving';
      this.board.set(p.fen, { orientation: this.solver, movable: this.solver });
      this.renderActions();
    }
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private clear() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.anim?.abort();
    this.anim = null;
    this.coach.stop();
    this.boardBox.classList.remove('shake');
  }

  private setPill(kind: 'turn' | 'solved' | 'wrong' | 'shown') {
    const sw = h(`span.tm-swatch.${this.solver}`);
    const map = {
      turn: [sw, `${sideName(this.solver)} to move`],
      solved: [icon('check'), 'Solved'],
      wrong: [icon('close'), 'Not quite — try again'],
      shown: [icon('hint'), 'Solution shown'],
    } as const;
    this.pill.className = `tm-pill ${kind}`;
    this.pill.replaceChildren(...map[kind]);
  }

  private uciMove(u: string): Move {
    return this.g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  }

  private playOpponent() {
    const p = this.puzzle;
    if (!p || this.ply >= p.moves.length) return;
    const mv = this.uciMove(p.moves[this.ply]);
    this.ply++;
    this.lastMove = [mv.from, mv.to];
    this.board.highlight({});
    this.board.badge(null);
    this.board.arrows([]);
    this.board.playMove(this.g.fen(), mv.from, mv.to, !!mv.captured, this.solver);
    this.state = 'solving';
    this.renderActions();
  }

  private report(success: boolean) {
    if (this.reported || !this.puzzle) return;
    this.reported = true;
    this.o.onFirst?.(this.puzzle, success);
  }

  private onMove(m: UserMove) {
    const p = this.puzzle;
    if (!p || this.state !== 'solving') {
      this.board.set(this.g.fen(), { orientation: this.solver, movable: null, lastMove: this.lastMove });
      return;
    }
    const before = this.g.fen();
    let mv: Move;
    try {
      mv = this.g.move(m);
    } catch {
      this.board.set(before, { orientation: this.solver, movable: this.solver, lastMove: this.lastMove });
      return;
    }
    const expected = p.moves[this.ply];
    if (moveToUci(mv) === expected || this.g.isCheckmate()) this.correct(mv, before);
    else this.wrong(mv);
  }

  private correct(mv: Move, before: string) {
    const p = this.puzzle!;
    this.ply++;
    this.lastMove = [mv.from, mv.to];
    this.board.set(this.g.fen(), { orientation: this.solver, movable: null, lastMove: this.lastMove });
    this.board.arrows([]);
    this.board.highlight({ [mv.from]: 'green', [mv.to]: 'green' });
    this.board.badge(mv.to, 'good');
    playSound(this.g.inCheck() ? 'check' : mv.captured ? 'capture' : 'move');
    this.hintStage = 0;
    if (this.ply >= p.moves.length || this.g.isCheckmate()) {
      this.state = 'solved';
      this.board.badge(mv.to, 'best');
      this.later(() => playSound('good'), 120);
      this.report(!this.missed);
      this.setPill('solved');
      if (this.o.coach !== false) {
        const first = this.firstMotif();
        const tail = this.g.isCheckmate() ? ' That is checkmate.' : first ? ` That was a **${first.toLowerCase()}**.` : '';
        this.coach.say(`${rnd(SOLVED)}${tail}`, 'excited', { fen: before });
      }
      this.renderActions();
      this.o.onComplete?.(p, true, !this.missed);
      return;
    }
    if (this.o.coach !== false) this.coach.say(`${rnd(PRAISE)} Keep going.`, 'happy');
    this.state = 'setup';
    this.renderActions();
    this.later(() => this.playOpponent(), 520);
  }

  private firstMotif(): string | null {
    const p = this.puzzle!;
    const { fen, solution } = puzzleStart(p);
    const g = new Chess(fen);
    try {
      const m = g.move({ from: solution[0].slice(0, 2), to: solution[0].slice(2, 4), promotion: solution[0][4] });
      const mo = motifsOf(fen, m).find((x) => !['develop', 'centre', 'castle', 'active-king', 'passed'].includes(x.id));
      return mo?.label ?? null;
    } catch {
      return null;
    }
  }

  private wrong(mv: Move) {
    const p = this.puzzle!;
    this.g.undo();
    this.board.badge(mv.to, 'miss');
    this.board.highlight({ [mv.to]: 'red' });
    this.boardBox.classList.remove('shake');
    void this.boardBox.offsetWidth;
    this.boardBox.classList.add('shake');
    playSound('bad');
    this.missed = true;
    this.report(false);
    if (this.o.mode === 'rush') {
      // show what was right, then move on
      this.state = 'done';
      this.setPill('wrong');
      this.later(() => {
        this.board.set(this.g.fen(), { orientation: this.solver, movable: null, lastMove: this.lastMove });
        this.board.badge(null);
        this.board.highlight({});
        const u = p.moves[this.ply];
        this.board.arrows([{ orig: u.slice(0, 2) as Key, dest: u.slice(2, 4) as Key, brush: 'green' }]);
      }, 450);
      this.later(() => this.o.onComplete?.(p, false, false), 1300);
      return;
    }
    this.setPill('wrong');
    this.state = 'setup';
    if (this.o.coach !== false) this.coach.say(`**${mv.san}** isn't it. Try again, or ask for a hint.`, 'worried', { fen: this.g.fen() });
    this.renderActions();
    this.later(() => {
      if (this.puzzle !== p) return;
      this.board.set(this.g.fen(), { orientation: this.solver, movable: this.solver, lastMove: this.lastMove });
      this.board.badge(null);
      this.board.highlight({});
      this.state = 'solving';
      this.setPill('turn');
      this.renderActions();
    }, 750);
  }

  hint() {
    const p = this.puzzle;
    if (!p || this.state !== 'solving') return;
    const u = p.moves[this.ply];
    const from = u.slice(0, 2);
    const to = u.slice(2, 4);
    const piece = this.g.get(from as never);
    this.missed = true;
    this.report(false);
    if (this.hintStage === 0) {
      this.hintStage = 1;
      this.board.arrows([{ orig: from as Key, brush: 'yellow' }]);
      this.board.flash([from], 'yellow', 1400);
      this.coach.say(`Look at your **${piece ? NAME[piece.type] : 'piece'}** on ${from}.`, 'thinking', { fen: this.g.fen() });
    } else {
      this.hintStage = 2;
      this.board.arrows([{ orig: from as Key, dest: to as Key, brush: 'yellow' }]);
      this.coach.say(`Move it to ${to}.`, 'thinking', { fen: this.g.fen() });
    }
    this.renderActions();
  }

  async showSolution() {
    const p = this.puzzle;
    if (!p || this.state === 'solved' || this.state === 'done') return;
    this.clear();
    this.missed = true;
    this.report(false);
    this.state = 'done';
    this.setPill('shown');
    const startFen = this.g.fen();
    const sans = ucisToSans(startFen, p.moves.slice(this.ply));
    this.coach.say(`Here is the solution: ${sans.join(' ')}`, 'neutral', { fen: startFen });
    this.renderActions();
    const ctrl = (this.anim = new AbortController());
    this.board.highlight({});
    this.board.badge(null);
    await this.board.playLine(startFen, sans, { delay: 800, signal: ctrl.signal, brush: 'green' });
    for (const s of sans) this.g.move(s);
    this.ply = p.moves.length;
    if (!ctrl.signal.aborted) {
      const last = this.g.history({ verbose: true }).at(-1);
      if (last) this.lastMove = [last.from, last.to];
      this.coach.say('That is the idea. Tap **Explain** to go through it step by step.', 'neutral');
      this.o.onComplete?.(p, false, false);
    }
  }

  explain() {
    const p = this.puzzle;
    if (!p) return;
    this.clear();
    if (this.state === 'solving' || this.state === 'setup') {
      this.missed = true;
      this.report(false);
      this.state = 'done';
      this.setPill('shown');
      this.o.onComplete?.(p, false, false);
    }
    const { startFen, steps } = buildPuzzleNarration(p);
    this.footer.hidden = true;
    this.coach.setActions([]);
    this.board.set(startFen, { orientation: this.solver, movable: null });
    this.coach.narrate(steps, {
      startFen,
      onExit: () => {
        // finish on the solved position
        const g = new Chess(p.fen);
        let last: Move | undefined;
        for (const u of p.moves) last = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        this.g = g;
        this.ply = p.moves.length;
        this.lastMove = last ? [last.from, last.to] : undefined;
        this.board.set(g.fen(), { orientation: this.solver, movable: null, lastMove: this.lastMove });
        this.board.arrows([]);
        this.board.highlight({});
        this.board.badge(null);
        this.footer.hidden = false;
        this.coach.say('Want to try it yourself? Tap **Retry**.', 'happy');
        this.renderActions();
      },
    });
  }

  retry() {
    if (this.puzzle) this.load(this.puzzle, true);
  }

  private renderActions() {
    if (this.o.coach === false) return;
    const a: CoachAction[] = [];
    const busy = this.state === 'setup';
    if (this.state === 'solving' || busy) {
      a.push({ label: this.hintStage ? 'Show move' : 'Hint', icon: 'hint', onclick: () => this.hint() });
      a.push({ label: 'Solution', icon: 'eye', onclick: () => void this.showSolution() });
    } else if (this.state === 'solved' || this.state === 'done') {
      a.push({ label: 'Explain', icon: 'chat', onclick: () => this.explain() });
      a.push({ label: 'Retry', icon: 'replay', onclick: () => this.retry() });
    }
    this.coach.setActions(a);
    const finished = this.state === 'solved' || this.state === 'done';
    this.footer.replaceChildren(
      this.o.onNext && finished ? h('button.btn.primary.big.pz-next', { type: 'button', onclick: () => this.o.onNext?.() }, this.o.nextLabel ?? 'Next puzzle', icon('next')) : '',
    );
  }

  destroy() {
    this.clear();
    this.board.destroy();
  }
}
