import { Chess, type Move } from 'chess.js';
import { h, rich, modal, toast, fmtClock, setChildren } from '../ui/dom';
import { BoardView, arrow, type UserMove } from '../ui/board';
import { playSound } from '../ui/sound';
import { BOTS, botMove, type Bot } from '../engine/bots';
import { engine, scoreNum, winPct } from '../engine/engine';
import { explainBest, explainMistake, currentThreats } from '../chess/explain';
import { Clock, TIME_CONTROLS, tcById, type Side, type TimeControl } from '../chess/clock';
import { capturedPieces, material } from '../chess/util';
import { settings, updateSettings } from '../store/settings';
import { saveGame, kvGet, kvSet, type GameRecord } from '../store/db';
import { trackStudy } from '../store/tracker';
import { go, type View } from '../router';

interface GameConfig {
  bot: number;
  color: Side;
  tc: string;
  hints: boolean;
  blunderWarning: boolean;
  pure: boolean;
}

interface SavedGame {
  cfg: GameConfig;
  sans: string[];
  times: number[];
  clock: Record<Side, number>;
  hintsUsed: number;
}

const RESUME_KEY = 'currentGame';

export async function playView(): Promise<View> {
  trackStudy(null);
  let saved = await kvGet<SavedGame | null>(RESUME_KEY, null);
  const s = settings();
  const cfg: GameConfig = { bot: s.lastBot, color: s.lastColor === 'black' ? 'black' : 'white', tc: s.lastTimeControl, hints: s.hints, blunderWarning: s.blunderWarning, pure: false };
  let colorChoice: 'white' | 'black' | 'random' = s.lastColor;
  const root = h('div.page.play-setup');

  const renderSetup = () => {
    const resume = saved;
    const botGrid = h(
      'div.bot-grid',
      BOTS.map((b) =>
        h(
          `button.bot-card${b.level === cfg.bot ? '.on' : ''}`,
          { onclick: () => ((cfg.bot = b.level), renderSetup()) },
          h('span.avatar', b.avatar),
          h('span.bot-name', b.name),
          h('span.bot-elo', `${b.elo}`),
        ),
      ),
    );
    const bot = BOTS[cfg.bot];
    const tcChips = h(
      'div.chips',
      TIME_CONTROLS.map((t) =>
        h(`button.chip${t.id === cfg.tc ? '.on' : ''}`, { onclick: () => ((cfg.tc = t.id), renderSetup()) }, t.label, t.long ? h('small', ' ⏳') : null),
      ),
    );
    const colorChips = h(
      'div.chips',
      (['white', 'random', 'black'] as const).map((c) =>
        h(`button.chip${colorChoice === c ? '.on' : ''}`, { onclick: () => ((colorChoice = c), renderSetup()) }, { white: '⚪ White', random: '🎲 Random', black: '⚫ Black' }[c]),
      ),
    );
    const toggle = (label: string, key: 'hints' | 'blunderWarning' | 'pure', desc: string) =>
      h(
        'label.toggle',
        h('input', {
          type: 'checkbox',
          checked: cfg[key],
          onchange: (e: Event) => {
            cfg[key] = (e.target as HTMLInputElement).checked;
            renderSetup();
          },
          disabled: key !== 'pure' && cfg.pure,
        }),
        h('span', h('strong', label), h('small', desc)),
      );
    const tc = tcById(cfg.tc);
    setChildren(
      root,
      h('h1', 'Play'),
      resume ? h('div.card.next-up', h('div.eyebrow', 'Game in progress'), h('p', `vs ${BOTS[resume.cfg.bot].name} · ${resume.sans.length} moves played`), h('div.row', h('button.btn.primary', { onclick: () => startGame(resume.cfg, resume) }, 'Resume ›'), h('button.btn.ghost', { onclick: async () => (await kvSet(RESUME_KEY, null), go('/play')) }, 'Abandon'))) : null,
      h('h3', 'Opponent'),
      botGrid,
      h('div.card.bot-detail', h('span.avatar.big', bot.avatar), h('div', h('strong', `${bot.name} (${bot.elo})`), h('p.small', bot.blurb))),
      h('h3', 'Time control'),
      tcChips,
      tc.long ? h('p.small.muted', '⏳ Long time control: perfect for building good thinking habits. The coach checklist will be shown.') : h('p.small.muted', 'Tip: for improvement, prefer 15|10 or slower.'),
      h('h3', 'Your colour'),
      colorChips,
      h('h3', 'Coach'),
      h('div.toggles', toggle('Hints on demand', 'hints', 'Ask for the best move with a plain-English reason.'), toggle('Blunder warning', 'blunderWarning', '"Are you sure?" before you hang a piece or allow mate.'), toggle('Pure mode', 'pure', 'No help at all — a real game.')),
      h('button.btn.primary.big', {
        onclick: () => {
          const color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;
          updateSettings({ lastBot: cfg.bot, lastTimeControl: cfg.tc, lastColor: colorChoice, hints: cfg.hints, blunderWarning: cfg.blunderWarning });
          startGame({ ...cfg, color, hints: cfg.hints && !cfg.pure, blunderWarning: cfg.blunderWarning && !cfg.pure });
        },
      }, 'Start game'),
    );
  };

  let game: GameScreen | null = null;
  const startGame = (c: GameConfig, resume?: SavedGame) => {
    game?.destroy();
    saved = null; // the new game replaces any saved one
    game = new GameScreen(c, resume, async () => {
      game?.destroy();
      game = null;
      saved = await kvGet<SavedGame | null>(RESUME_KEY, null);
      renderSetup();
    });
    root.replaceChildren(game.el);
  };

  renderSetup();
  return { el: root, destroy: () => game?.destroy() };
}

class GameScreen {
  el: HTMLElement;
  private g: Chess;
  private board: BoardView;
  private bot: Bot;
  private tc: TimeControl;
  private clock: Clock;
  private times: number[] = [];
  private turnStarted = performance.now();
  private over = false;
  private hintsUsed = 0;
  private fastMoves = 0;
  private busy = false;
  private preEval: Promise<number> | null = null;
  private viewPly: number | null = null;
  private topBar: HTMLElement;
  private bottomBar: HTMLElement;
  private boardCol: HTMLElement;
  private els = {
    topName: h('div.player-name'),
    topClock: h('div.clock'),
    topCap: h('div.captured'),
    botName: h('div.player-name'),
    botClock: h('div.clock'),
    botCap: h('div.captured'),
    moves: h('div.movelist'),
    coach: h('div.coach'),
    status: h('div.game-status'),
  };

  constructor(private cfg: GameConfig, resume: SavedGame | undefined, private exit: () => void) {
    trackStudy('play');
    this.bot = BOTS[cfg.bot];
    this.tc = tcById(cfg.tc);
    this.g = new Chess();
    for (const s of resume?.sans ?? []) this.g.move(s);
    this.times = resume?.times ?? [];
    this.hintsUsed = resume?.hintsUsed ?? 0;
    this.clock = new Clock(this.tc, () => this.renderClocks(), (side) => this.flag(side), resume?.clock);
    this.board = new BoardView({ orientation: cfg.color, onMove: (m) => void this.userMove(m) });
    const actions = h(
      'div.row.wrap.actions',
      cfg.hints ? h('button.btn', { onclick: () => void this.hint() }, '💡 Hint') : null,
      h('button.btn.ghost', { onclick: () => this.flip() }, '⇅ Flip'),
      h('button.btn.ghost', { onclick: () => void this.offerDraw() }, '½ Draw'),
      h('button.btn.ghost.danger', { onclick: () => void this.resign() }, '⚑ Resign'),
    );
    this.topBar = h('div.player-bar', h('div', this.els.topName, this.els.topCap), this.els.topClock);
    this.bottomBar = h('div.player-bar', h('div', this.els.botName, this.els.botCap), this.els.botClock);
    this.boardCol = h('div.board-col', this.topBar, this.board.el, this.bottomBar);
    this.el = h('div.game', h('div.play-layout', this.boardCol, h('div.side-col', this.els.status, this.els.moves, actions, this.els.coach)));
    this.els.topName.textContent = `${this.bot.avatar} ${this.bot.name} (${this.bot.elo})`;
    this.els.botName.textContent = 'You';
    this.renderCoach();
    this.sync();
    this.renderClocks();
    if (this.g.isGameOver()) return;
    if (this.sideToMove() === cfg.color) this.startUserTurn();
    else void this.botTurn();
  }

  /** Flip the board and keep each player's name and clock next to their own pieces. */
  private flip() {
    this.board.flip();
    const flipped = this.board.cg.state.orientation !== this.cfg.color;
    this.boardCol.replaceChildren(flipped ? this.bottomBar : this.topBar, this.board.el, flipped ? this.topBar : this.bottomBar);
  }

  private sideToMove(): Side {
    return this.g.turn() === 'w' ? 'white' : 'black';
  }

  private sync() {
    const hist = this.g.history({ verbose: true });
    const last = hist[hist.length - 1];
    const movable = !this.over && !this.busy && this.sideToMove() === this.cfg.color && this.viewPly === null ? this.cfg.color : null;
    this.board.set(this.g.fen(), { lastMove: last ? [last.from, last.to] : undefined, movable });
    const cap = capturedPieces(this.g);
    const mat = material(this.g) * (this.cfg.color === 'white' ? 1 : -1);
    const glyph = (c: 'w' | 'b', t: string) => ({ w: { q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }, b: { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' } })[c][t as 'q'] ?? '';
    const mine = this.cfg.color === 'white' ? 'b' : 'w'; // pieces I captured are opponent's colour
    this.els.botCap.textContent = cap[mine].map((t) => glyph(mine, t)).join('') + (mat > 0 ? ` +${mat}` : '');
    const theirs = mine === 'w' ? 'b' : 'w';
    this.els.topCap.textContent = cap[theirs].map((t) => glyph(theirs, t)).join('') + (mat < 0 ? ` +${-mat}` : '');
    this.renderMoves();
  }

  private renderMoves() {
    const sans = this.g.history();
    const rows: HTMLElement[] = [];
    for (let i = 0; i < sans.length; i += 2) {
      rows.push(h('span.mv-no', `${i / 2 + 1}.`), h('span.mv', sans[i]), h('span.mv', sans[i + 1] ?? ''));
    }
    this.els.moves.replaceChildren(...rows);
    this.els.moves.scrollTop = this.els.moves.scrollHeight;
  }

  private renderClocks() {
    const top: Side = this.cfg.color === 'white' ? 'black' : 'white';
    const set = (el: HTMLElement, side: Side) => {
      if (!this.clock.timed) {
        el.textContent = '∞';
        return;
      }
      const ms = this.clock.now(side);
      el.textContent = fmtClock(ms);
      el.classList.toggle('active', this.clock.running === side);
      el.classList.toggle('low', ms < 30_000);
    };
    set(this.els.topClock, top);
    set(this.els.botClock, this.cfg.color);
  }

  private renderCoach() {
    if (this.cfg.pure) {
      this.els.coach.replaceChildren(h('p.small.muted', '🧘 Pure mode — no help. Good luck!'));
      return;
    }
    const list = h(
      'ol.checklist',
      h('li', h('strong', 'Their move: '), 'what does it attack or threaten?'),
      h('li', h('strong', 'Checks, captures, threats'), ' — for both sides.'),
      h('li', h('strong', 'Candidates: '), 'list 2–3 moves, compare them.'),
      h('li', h('strong', 'Blunder check: '), 'after my move, can they capture or check something?'),
    );
    this.els.coach.replaceChildren(h('details.coach-box', { open: this.tc.long }, h('summary', '🧠 Thinking checklist'), list));
  }

  private save() {
    if (this.over) return;
    void kvSet(RESUME_KEY, { cfg: this.cfg, sans: this.g.history(), times: this.times, clock: { ...this.clock.remaining }, hintsUsed: this.hintsUsed } satisfies SavedGame);
  }

  private startUserTurn() {
    this.turnStarted = performance.now();
    this.clock.start(this.cfg.color);
    this.sync();
    if (this.cfg.blunderWarning) {
      const fen = this.g.fen();
      this.preEval = engine.analyse(fen, { movetime: 450 }).then((r) => (r.lines[0] ? scoreNum(r.lines[0]) : 0));
    }
    if (!this.cfg.pure) {
      const threats = currentThreats(this.g.fen());
      this.els.status.replaceChildren(threats.length && this.cfg.hints ? h('div.banner.info', `Your move. Watch out: ${threats[0]}.`) : h('div.banner.subtle', 'Your move.'));
    } else this.els.status.replaceChildren(h('div.banner.subtle', 'Your move.'));
  }

  private async userMove(m: UserMove) {
    if (this.over || this.busy) return;
    const before = this.g.fen();
    this.board.arrows([]); // a hint is only for the position it was asked in
    let mv: Move;
    try {
      mv = this.g.move(m);
    } catch {
      this.sync();
      return;
    }
    const spent = performance.now() - this.turnStarted;
    this.busy = true;
    this.sync();
    if (this.cfg.blunderWarning && this.preEval) {
      this.els.status.replaceChildren(h('div.banner.subtle', 'Coach is checking your move…'));
      const bestBefore = await this.preEval;
      const r = await engine.analyse(this.g.fen(), { movetime: 400 });
      if (this.over) return;
      // stalemate / draw leaves no engine line: score it as 0, not "unchanged"
      const after = this.g.isDraw() ? 0 : r.lines[0] ? -scoreNum(r.lines[0]) : bestBefore;
      const drop = winPct(bestBefore) - winPct(after);
      if (drop >= 18 && after < 300) {
        const why = explainMistake(before, mv, r.lines[0]?.pv ?? [], r.lines[0]?.mate ?? null);
        playSound('bad');
        const choice = await modal('⚠ Are you sure?', `${why}\n\nWinning chances drop by about ${Math.round(drop)}%.`, [
          { label: 'Take it back', value: 'back', primary: true },
          { label: 'Play anyway', value: 'play' },
        ]);
        if (this.over) return;
        if (choice === 'back') {
          this.g.undo();
          this.busy = false;
          this.sync();
          this.els.status.replaceChildren(h('div.banner.info', 'Taken back. Look again: checks, captures, threats.'));
          return;
        }
      }
    }
    this.busy = false;
    this.times.push(Math.round(spent));
    playSound(mv.captured ? 'capture' : this.g.inCheck() ? 'check' : 'move');
    this.clock.switch(this.cfg.color);
    this.slowDownNudge(spent, mv, before);
    this.sync();
    this.save();
    if (!this.checkEnd()) void this.botTurn();
  }

  private slowDownNudge(spent: number, mv: Move, before: string) {
    if (this.cfg.pure || !this.tc.long || this.tc.baseMin === 0) return;
    const forced = new Chess(before).moves().length <= 2;
    const recapture = !!mv.captured;
    if (spent < 4000 && !forced && !recapture && this.g.history().length > 12) this.fastMoves++;
    else this.fastMoves = 0;
    if (this.fastMoves >= 3) {
      this.fastMoves = 0;
      toast('⏳ Long game — use your time! Run the checklist before each move.', 'info', 4500);
    }
  }

  private async botTurn() {
    if (this.over) return;
    const side = this.sideToMove();
    this.clock.start(side);
    this.els.status.replaceChildren(h('div.banner.subtle', `${this.bot.name} is thinking…`));
    const started = performance.now();
    const remaining = this.clock.timed ? this.clock.now(side) : 60_000;
    const budget = this.clock.timed ? remaining / 35 + this.tcIncMs() * 0.6 : 1200;
    const uci = await botMove(this.bot, this.g.fen(), budget);
    if (this.over || uci === '(cancelled)') return;
    // natural minimum delay so replies don't feel instant
    const minDelay = 350 + Math.random() * 600;
    const elapsed = performance.now() - started;
    if (elapsed < minDelay) await new Promise((r) => setTimeout(r, minDelay - elapsed));
    if (this.over) return;
    let mv: Move;
    try {
      mv = this.g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      return;
    }
    this.times.push(Math.round(performance.now() - started));
    this.clock.switch(side);
    playSound(mv.captured ? 'capture' : this.g.inCheck() ? 'check' : 'move');
    this.save();
    if (!this.checkEnd()) this.startUserTurn();
    else this.sync();
  }

  private tcIncMs() {
    return this.tc.incSec * 1000;
  }

  private async hint() {
    if (this.over || this.sideToMove() !== this.cfg.color || this.busy) return;
    this.hintsUsed++;
    const fen = this.g.fen();
    this.els.status.replaceChildren(h('div.banner.subtle', 'Thinking about a hint…'));
    const r = await engine.analyse(fen, { depth: 14 });
    if (this.g.fen() !== fen || !r.lines[0]) return;
    this.board.arrows([arrow(r.bestmove)]);
    this.els.status.replaceChildren(h('div.banner.info', rich(`💡 ${explainBest(fen, r.bestmove, r.lines[0].pv)}`)));
    this.save();
  }

  private checkEnd(): boolean {
    const g = this.g;
    if (!g.isGameOver()) return false;
    if (g.isCheckmate()) {
      const winner: Side = g.turn() === 'w' ? 'black' : 'white';
      void this.finish(winner === 'white' ? '1-0' : '0-1', 'checkmate');
    } else if (g.isStalemate()) void this.finish('1/2-1/2', 'stalemate');
    else if (g.isInsufficientMaterial()) void this.finish('1/2-1/2', 'insufficient material');
    else if (g.isThreefoldRepetition()) void this.finish('1/2-1/2', 'threefold repetition');
    else void this.finish('1/2-1/2', '50-move rule');
    return true;
  }

  private flag(side: Side) {
    if (this.over) return;
    // If the opponent cannot possibly mate, a flag is a draw.
    const opp = side === 'white' ? 'b' : 'w';
    const pieces = this.g.board().flat().filter((p) => p && p.color === opp && p.type !== 'k');
    const canMate = pieces.some((p) => p!.type !== 'b' && p!.type !== 'n') || pieces.length >= 2;
    void this.finish(canMate ? (side === 'white' ? '0-1' : '1-0') : '1/2-1/2', 'time');
  }

  private async resign() {
    if (this.over) return;
    const c = await modal('Resign?', 'You can still review the game afterwards.', [
      { label: 'Resign', value: 'yes', primary: true },
      { label: 'Keep playing', value: 'no' },
    ]);
    if (c === 'yes') void this.finish(this.cfg.color === 'white' ? '0-1' : '1-0', 'resignation');
  }

  private async offerDraw() {
    if (this.over || this.busy) return;
    const fen = this.g.fen();
    const r = await engine.analyse(fen, { depth: 12 });
    const s = r.lines[0] ? scoreNum(r.lines[0]) : 0;
    const botPov = this.sideToMove() === this.cfg.color ? -s : s;
    if (this.g.history().length >= 40 && botPov < 40) {
      toast(`${this.bot.name} accepts the draw.`, 'info');
      void this.finish('1/2-1/2', 'agreement');
    } else toast(`${this.bot.name} declines — play on!`, 'info');
  }

  private async finish(result: GameRecord['result'], termination: string) {
    if (this.over) return;
    this.over = true;
    this.clock.stop();
    engine.cancelAll();
    this.sync();
    await kvSet(RESUME_KEY, null);
    const userWon = (result === '1-0' && this.cfg.color === 'white') || (result === '0-1' && this.cfg.color === 'black');
    const draw = result === '1/2-1/2';
    const rec: GameRecord = {
      date: Date.now(),
      white: this.cfg.color === 'white' ? 'You' : `${this.bot.name} (${this.bot.elo})`,
      black: this.cfg.color === 'black' ? 'You' : `${this.bot.name} (${this.bot.elo})`,
      userColor: this.cfg.color,
      botLevel: this.bot.level,
      timeControl: this.tc.id,
      result,
      termination,
      startFen: new Chess().fen(),
      sans: this.g.history(),
      times: this.times,
      pure: this.cfg.pure,
      hintsUsed: this.hintsUsed,
    };
    const id = await saveGame(rec);
    playSound('end');
    const title = draw ? '½ Draw' : userWon ? '🏆 You won!' : `${this.bot.name} wins`;
    this.els.status.replaceChildren(h('div.banner.' + (userWon ? 'good' : draw ? 'info' : 'bad'), `${title} — by ${termination}`));
    const choice = await modal(title, `Game over by ${termination}. Reviewing every game is the fastest way to improve.`, [
      { label: 'Review game', value: 'review', primary: true },
      { label: 'New game', value: 'new' },
      { label: 'Close', value: 'close' },
    ]);
    if (choice === 'review') go(`/review/${id}`);
    else if (choice === 'new') this.exit();
  }

  destroy() {
    this.clock.stop();
    this.save(); // keep the game resumable
    this.over = true;
    engine.cancelAll();
    this.board.destroy();
  }
}

