// Play vs bots: chess.com-style bot picker, game screen with player cards, bot chat, in-game coach,
// "Is it safe?" blunder-check habit, takebacks and an end-of-game card.
import { Chess, type Move } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import { h, modal, toast, setChildren } from '../ui/dom';
import { BoardView, arrow, type UserMove } from '../ui/board';
import { playSound } from '../ui/sound';
import { icon, classBadge, type IconName } from '../ui/icons';
import { botAvatar, userAvatar } from '../ui/avatars';
import { PlayerCard, MoveList, EvalBar, materialFromFen, pageHeader } from '../ui/widgets';
import { Coach, mascot, moodFor, type Mood } from '../ui/coach';
import { BOTS, BOT_GROUPS, botChoose, type Bot } from '../engine/bots';
import { ChatPicker, BOT_CHAT, chatEventFor, type ChatEvent } from '../engine/botchat';
import { engine, scoreNum, winPct, type AnalysisResult } from '../engine/engine';
import { explainBest, explainMistake } from '../chess/explain';
import { classifyMove, isSacrifice, moveAccuracy, type MoveClass } from '../chess/classify';
import { feedbackLine, sanOf } from '../chess/feedback';
import { cct, cctSummary, moveSafety, threatsAgainst, type CctKind } from '../chess/safety';
import { MODE_ASSIST, MODE_INFO, modeOf, normalizeAssist, isPure, type Assist, type PresetMode } from '../chess/playmodes';
import { Clock, TIME_CONTROLS, tcById, type Side, type TimeControl } from '../chess/clock';
import { VALUE } from '../chess/util';
import { dangers } from '../chess/guards';
import { settings, updateSettings } from '../store/settings';
import { saveGame, kvGet, kvSet, type GameRecord } from '../store/db';
import { trackStudy } from '../store/tracker';
import { go, type View } from '../router';
import '../styles/play.css';

interface GameConfig {
  bot: number;
  color: Side;
  tc: string;
  /** legacy toggles (games saved before game modes existed) */
  hints: boolean;
  blunderWarning: boolean;
  dangerMarks?: boolean;
  pure: boolean;
  /** which aids are on (missing in games saved before game modes existed) */
  assist?: Assist;
  /** the colour choice on the setup screen (for rematches) */
  colorChoice?: 'white' | 'black' | 'random';
}

interface SavedGame {
  cfg: GameConfig;
  sans: string[];
  times: number[];
  clock: Record<Side, number>;
  hintsUsed: number;
  classes?: (MoveClass | null)[];
  accs?: number[];
  takebacks?: number;
}

const RESUME_KEY = 'currentGame';

const ASSIST_INFO: Record<keyof Assist, { label: string; desc: string; icon: IconName }> = {
  moveFeedback: { label: 'Move feedback', desc: 'Coach Hoot rates each of your moves.', icon: 'chat' },
  hints: { label: 'Hints', desc: 'Ask for the best move with a plain-English reason.', icon: 'hint' },
  suggestArrows: { label: 'Suggestion arrows', desc: 'Hints also draw a green arrow on the board.', icon: 'next' },
  takebacks: { label: 'Takebacks', desc: 'Undo your last move.', icon: 'undo' },
  threatArrows: { label: 'Threat arrows', desc: 'Red arrows show what your opponent threatens.', icon: 'target' },
  safetyCheck: { label: 'Safety check', desc: '"Is it safe?" before a move that leaves a piece hanging, plus Checks/Captures/Threats chips.', icon: 'shield' },
  blunderCheck: { label: 'Blunder check', desc: 'The engine asks "Are you sure?" before a big mistake.', icon: 'eye' },
  dangerMarks: { label: 'Danger marks', desc: 'Red marks on pinned pieces and on moves that allow mate.', icon: 'close' },
  evalBar: { label: 'Evaluation bar', desc: 'Shows who is better next to the board.', icon: 'chart' },
};
const ASSIST_ORDER: (keyof Assist)[] = ['moveFeedback', 'hints', 'suggestArrows', 'takebacks', 'threatArrows', 'safetyCheck', 'blunderCheck', 'dangerMarks', 'evalBar'];
const CLASS_PHRASE: Record<MoveClass, string> = {
  brilliant: 'brilliant',
  great: 'a great move',
  best: 'best',
  excellent: 'excellent',
  good: 'good',
  book: 'a book move',
  inaccuracy: 'an inaccuracy',
  mistake: 'a mistake',
  miss: 'a miss',
  blunder: 'a blunder',
};
const MODE_ICON: Record<PresetMode, IconName> = { challenge: 'fire', friendly: 'heart', assisted: 'shield' };

/** Aids for a game config, including games saved before game modes existed. */
function assistOf(cfg: GameConfig): Assist {
  if (cfg.assist) return normalizeAssist(cfg.assist);
  if (cfg.pure) return normalizeAssist({});
  return normalizeAssist({ hints: cfg.hints, suggestArrows: cfg.hints, blunderCheck: cfg.blunderWarning, dangerMarks: !!cfg.dangerMarks });
}

/** chess.com-style piece icon (uses the board's piece set). */
function pieceIcon(role: string, color: 'white' | 'black'): HTMLElement {
  return h('span.piece-ico.cg-wrap', h(`piece.${role}.${color}`));
}

export async function playView(): Promise<View> {
  trackStudy(null);
  let saved = await kvGet<SavedGame | null>(RESUME_KEY, null);
  const s = settings();
  let assist: Assist = s.playAssist ? normalizeAssist(s.playAssist as Partial<Assist>) : { ...MODE_ASSIST.friendly };
  let botLevel = Math.min(BOTS.length - 1, Math.max(0, s.lastBot));
  let tcId = s.lastTimeControl;
  let colorChoice: 'white' | 'black' | 'random' = s.lastColor;
  let assistOpen = false;
  const root = h('div.page.play-setup');

  const persist = () =>
    updateSettings({
      lastBot: botLevel,
      lastTimeControl: tcId,
      lastColor: colorChoice,
      playAssist: { ...assist },
      hints: assist.hints,
      blunderWarning: assist.blunderCheck,
      dangerMarks: assist.dangerMarks,
    });

  const renderSetup = () => {
    const bot = BOTS[botLevel];
    const mode = modeOf(assist);
    const hero = h(
      'section.bot-hero',
      h('div.hero-avatar', botAvatar(bot.avatar)),
      h(
        'div.hero-main',
        h('div.hero-bubble', BOT_CHAT[bot.avatar]?.greet[0] ?? 'Hello!'),
        h('div.hero-name', bot.name, h('span.hero-elo', String(bot.elo))),
        h('div.hero-group', bot.group),
        h('p.hero-blurb', bot.blurb),
      ),
    );
    const groups = BOT_GROUPS.map((g) =>
      h(
        'section.bot-group',
        h('h3.group-title', g),
        h(
          'div.bot-row',
          BOTS.filter((b) => b.group === g).map((b) =>
            h(
              `button.bot-pick${b.level === botLevel ? '.on' : ''}`,
              { type: 'button', 'aria-pressed': String(b.level === botLevel), 'aria-label': `${b.name}, rated ${b.elo}`, onclick: () => ((botLevel = b.level), persist(), renderSetup()) },
              h('span.pick-avatar', botAvatar(b.avatar)),
              h('span.pick-name', b.name),
              h('span.pick-elo', String(b.elo)),
            ),
          ),
        ),
      ),
    );
    const tcChips = h(
      'div.chips.tc-chips',
      TIME_CONTROLS.map((t) =>
        h(`button.chip${t.id === tcId ? '.on' : ''}`, { type: 'button', onclick: () => ((tcId = t.id), persist(), renderSetup()) }, t.baseMin ? icon('clock') : null, t.label),
      ),
    );
    const colorBtn = (c: 'white' | 'random' | 'black') =>
      h(
        `button.color-btn${colorChoice === c ? '.on' : ''}`,
        { type: 'button', 'aria-label': `Play as ${c}`, 'aria-pressed': String(colorChoice === c), onclick: () => ((colorChoice = c), persist(), renderSetup()) },
        c === 'random' ? h('span.piece-ico.half.cg-wrap', h('piece.king.white'), h('piece.king.black')) : pieceIcon('king', c),
        h('span', { white: 'White', random: 'Random', black: 'Black' }[c]),
      );
    const modeCard = (m: PresetMode) =>
      h(
        `button.mode-card${mode === m ? '.on' : ''}`,
        { type: 'button', 'aria-pressed': String(mode === m), onclick: () => ((assist = { ...MODE_ASSIST[m] }), persist(), renderSetup()) },
        h(`span.mode-ico.${m}`, icon(MODE_ICON[m])),
        h('span.mode-text', h('strong', MODE_INFO[m].title), h('small', MODE_INFO[m].sub)),
      );
    const switchRow = (label: string, desc: string, ic: IconName, on: boolean, change: (v: boolean) => void) =>
      h(
        'label.assist-row',
        h('span.assist-ico', icon(ic)),
        h('span.assist-text', h('strong', label), h('small', desc)),
        h('input.switch', { type: 'checkbox', role: 'switch', checked: on, onchange: (e: Event) => change((e.target as HTMLInputElement).checked) }),
      );
    const assistBox = h(
      'details.assist-box',
      {
        open: assistOpen,
        ontoggle: (e: Event) => (assistOpen = (e.target as HTMLDetailsElement).open),
      },
      h('summary', icon('settings'), h('span.grow', 'Assistance'), h('span.assist-mode', mode === 'custom' ? 'Custom' : MODE_INFO[mode].title), icon('chevron', 'chev')),
      h(
        'div.assist-list',
        ASSIST_ORDER.map((k) =>
          switchRow(ASSIST_INFO[k].label, ASSIST_INFO[k].desc, ASSIST_INFO[k].icon, assist[k], (v) => {
            assist = { ...assist, [k]: v };
            persist();
            renderSetup();
          }),
        ),
        switchRow('Bot chat', 'Bots say hello and react to the game.', 'chat', settings().botChat, (v) => updateSettings({ botChat: v })),
      ),
    );
    const tc = tcById(tcId);
    const resume = saved;
    setChildren(
      root,
      pageHeader('Play Bots', { icon: 'bot' }),
      resume
        ? h(
            'div.resume-card',
            h('span.resume-avatar', botAvatar(BOTS[resume.cfg.bot].avatar)),
            h('div.grow', h('strong', 'Game in progress'), h('small', `vs ${BOTS[resume.cfg.bot].name} · ${Math.ceil(resume.sans.length / 2)} moves`)),
            h('button.btn.primary.sm', { type: 'button', onclick: () => startGame(resume.cfg, resume) }, 'Resume'),
            h('button.btn.ghost.sm', { type: 'button', 'aria-label': 'Abandon game', onclick: async () => (await kvSet(RESUME_KEY, null), (saved = null), renderSetup()) }, icon('close')),
          )
        : null,
      h(
        'div.ps-layout',
        h('div.ps-bots', hero, ...groups),
        h(
          'div.ps-options',
          h('h3', 'Time control'),
          tcChips,
          h('p.small.muted.tc-tip', tc.long ? 'Long game: great for building good thinking habits.' : 'Tip: slower games (15 | 10 or more) help you improve faster.'),
          h('h3', 'I play as'),
          h('div.color-row', colorBtn('white'), colorBtn('random'), colorBtn('black')),
          h('h3', 'Mode'),
          h('div.mode-row', modeCard('challenge'), modeCard('friendly'), modeCard('assisted')),
          assistBox,
          h(
            'div.play-cta',
            h(
              'button.btn.primary.big.play-btn',
              {
                type: 'button',
                onclick: () => {
                  persist();
                  const color: Side = colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice;
                  const pure = isPure(assist);
                  startGame({ bot: botLevel, color, tc: tcId, hints: assist.hints, blunderWarning: assist.blunderCheck, dangerMarks: assist.dangerMarks, pure, assist: { ...assist }, colorChoice });
                },
              },
              'Play',
            ),
          ),
        ),
      ),
    );
  };

  let game: GameScreen | null = null;
  const startGame = (c: GameConfig, resume?: SavedGame) => {
    game?.destroy();
    saved = null; // the new game replaces any saved one
    game = new GameScreen(c, resume, {
      exit: async () => {
        game?.destroy();
        game = null;
        saved = await kvGet<SavedGame | null>(RESUME_KEY, null);
        renderSetup();
        window.scrollTo(0, 0);
      },
      rematch: () => {
        const color: Side = c.colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : c.color === 'white' ? 'black' : 'white';
        startGame({ ...c, color });
      },
    });
    root.replaceChildren(game.el);
    window.scrollTo(0, 0);
  };

  renderSetup();
  return { el: root, destroy: () => game?.destroy() };
}

/** Engine look at the position at the start of the user's turn (user POV). */
interface PreEval {
  fen: string;
  cp: number;
  mate: number | null;
  best: string;
  /** user's score after the engine's 2nd choice (null = only move) */
  second: number | null;
}

class GameScreen {
  el: HTMLElement;
  private g: Chess;
  private board: BoardView;
  private bot: Bot;
  private tc: TimeControl;
  private clock: Clock;
  private assist: Assist;
  private pure: boolean;
  private times: number[] = [];
  private classes: (MoveClass | null)[] = [];
  private accs: number[] = [];
  private turnStarted = performance.now();
  private over = false;
  private hintsUsed = 0;
  private takebacks = 0;
  private fastMoves = 0;
  private busy = false;
  private botThinking = false;
  private turnId = 0;
  private pre: Promise<PreEval | null> | null = null;
  private viewPly: number | null = null;
  private topCard: PlayerCard;
  private bottomCard: PlayerCard;
  private topWrap: HTMLElement;
  private bottomWrap: HTMLElement;
  private chatBubble = h('div.bot-chat', { role: 'status', 'aria-live': 'polite' });
  private chatTimer = 0;
  private chat: ChatPicker;
  private chatSaid = new Set<ChatEvent>();
  private quietPlies = 99;
  private prevBotCp: number | null = null;
  private moveList: MoveList;
  private evalBar: EvalBar | null = null;
  private coach: Coach | null = null;
  private boardCol: HTMLElement;
  private cctRow: HTMLElement | null = null;
  private cctOn: CctKind | null = null;
  private feedback: { text: string; mood: Mood; cls: MoveClass; fen: string; title: () => Node } | null = null;
  private status = h('div.game-status');
  private actionBtns: Record<string, HTMLButtonElement> = {};
  private menu: HTMLElement | null = null;
  private outsideClick = (e: Event) => {
    if (this.menu && !this.menu.parentElement?.contains(e.target as Node)) this.closeMenu();
  };

  constructor(private cfg: GameConfig, resume: SavedGame | undefined, private nav: { exit: () => void; rematch: () => void }) {
    trackStudy('play');
    this.bot = BOTS[cfg.bot];
    this.tc = tcById(cfg.tc);
    this.assist = assistOf(cfg);
    this.pure = isPure(this.assist);
    this.chat = new ChatPicker(this.bot.avatar);
    this.g = new Chess();
    for (const s of resume?.sans ?? []) this.g.move(s);
    this.times = resume?.times ?? [];
    this.hintsUsed = resume?.hintsUsed ?? 0;
    this.takebacks = resume?.takebacks ?? 0;
    this.classes = resume?.classes ?? [];
    this.accs = resume?.accs ?? [];
    this.clock = new Clock(this.tc, () => this.renderClocks(), (side) => this.flag(side), resume?.clock);
    this.board = new BoardView({ orientation: cfg.color, onMove: (m) => void this.userMove(m) });

    const botColor: Side = cfg.color === 'white' ? 'black' : 'white';
    this.topCard = new PlayerCard({ name: this.bot.name, rating: this.bot.elo, avatar: this.bot.avatar, color: botColor, clock: this.clock.timed });
    this.bottomCard = new PlayerCard({ name: 'You', avatar: userAvatar(), color: cfg.color, clock: this.clock.timed });
    this.topWrap = h('div.pc-wrap', this.topCard.el, this.chatBubble);
    this.bottomWrap = h('div.pc-wrap', this.bottomCard.el);
    this.moveList = new MoveList((i) => this.view(i));

    let boardArea: HTMLElement;
    if (this.assist.evalBar) {
      this.evalBar = new EvalBar();
      this.evalBar.set(0, null, cfg.color === 'black');
      boardArea = h('div.board-area', this.evalBar.el, this.board.el);
    } else boardArea = h('div.board-area.no-bar', this.board.el);

    const actBtn = (key: string, ic: IconName, label: string, onclick: () => void) =>
      (this.actionBtns[key] = h('button.act-btn', { type: 'button', onclick, 'aria-label': label }, icon(ic), h('span', label)) as HTMLButtonElement);
    const actions = h(
      'div.action-bar',
      this.assist.hints ? actBtn('hint', 'hint', 'Hint', () => void this.hint()) : null,
      this.assist.takebacks ? actBtn('undo', 'undo', 'Takeback', () => this.takeback()) : null,
      actBtn('flip', 'flip', 'Flip', () => this.flip()),
      h('div.menu-anchor', actBtn('more', 'more', 'More', () => this.toggleMenu())),
    );
    this.boardCol = h('div.board-col', this.topWrap, boardArea, this.bottomWrap);

    const side: (Node | null)[] = [];
    if (!this.pure) {
      this.coach = new Coach(this.board, { compact: true });
      side.push(this.coach.el);
    }
    if (this.assist.safetyCheck) {
      this.cctRow = h('div.cct-row');
      side.push(h('div.cct-box', h('div.cct-head', icon('shield'), 'Blunder check: tap each one'), this.cctRow));
    }
    side.push(this.status);
    if (!this.pure) side.push(this.checklist());
    this.el = h('div.game', h('div.play-layout', h('div.main-col', this.boardCol, this.moveList.el, actions), h('div.side-col', ...side)));

    this.sync();
    this.renderClocks();
    if (this.coach) {
      const moves = this.g.history().length;
      this.coach.say(moves ? 'Welcome back! Take a fresh look at the board before you move.' : this.introLine(), moves ? 'neutral' : 'happy');
    }
    if (this.g.isGameOver()) return;
    setTimeout(() => this.say('greet'), 400);
    if (this.sideToMove() === cfg.color) this.startUserTurn();
    else void this.botTurn();
  }

  private introLine(): string {
    if (this.assist.safetyCheck) return 'Before each move, ask: **is it safe?** Tap Checks, Captures and Threats to see them on the board.';
    if (this.assist.moveFeedback) return 'Have fun! I will tell you how each of your moves went.';
    return 'Good luck! I am here if you need a hint.';
  }

  private checklist(): HTMLElement {
    return h(
      'details.coach-box.checklist-box',
      { open: this.tc.long && !this.assist.safetyCheck },
      h('summary', icon('learn'), ' Thinking checklist'),
      h(
        'ol.checklist',
        h('li', h('strong', 'Their move: '), 'what does it attack or threaten?'),
        h('li', h('strong', 'Checks, captures, threats'), ' for both sides.'),
        h('li', h('strong', 'Candidates: '), 'list 2 or 3 moves and compare them.'),
        h('li', h('strong', 'Blunder check: '), 'after my move, can they capture or check something?'),
      ),
    );
  }

  // ------------------------------------------------------------------ rendering

  private sideToMove(): Side {
    return this.g.turn() === 'w' ? 'white' : 'black';
  }

  private get userTurn() {
    return this.sideToMove() === this.cfg.color;
  }

  /** Flip the board and keep each player's card next to their own pieces. */
  private flip() {
    this.board.flip();
    const flipped = this.board.orientation !== this.cfg.color;
    const area = this.boardCol.children[1];
    this.boardCol.replaceChildren(flipped ? this.bottomWrap : this.topWrap, area, flipped ? this.topWrap : this.bottomWrap);
    this.evalBar?.el.classList.toggle('flipped', this.board.orientation === 'black');
  }

  private sync() {
    const hist = this.g.history({ verbose: true });
    const last = hist[hist.length - 1];
    this.viewPly = null;
    const movable = !this.over && !this.busy && this.userTurn ? this.cfg.color : null;
    this.board.set(this.g.fen(), { lastMove: last ? [last.from, last.to] : undefined, movable });
    const mat = materialFromFen(this.g.fen());
    const botWhite = this.cfg.color === 'black';
    this.topCard.setCaptured(botWhite ? mat.whiteTook : mat.blackTook, botWhite ? 'black' : 'white', botWhite ? mat.lead : -mat.lead);
    this.bottomCard.setCaptured(botWhite ? mat.blackTook : mat.whiteTook, botWhite ? 'white' : 'black', botWhite ? -mat.lead : mat.lead);
    this.topCard.setTurn(!this.over && !this.userTurn);
    this.bottomCard.setTurn(!this.over && this.userTurn);
    this.topCard.el.classList.toggle('thinking', this.botThinking);
    this.moveList.render(
      hist.map((m, i) => ({ san: m.san, cls: this.classes[i] ?? undefined })),
      hist.length - 1,
    );
    this.updateActions();
  }

  private updateActions() {
    const myTurn = !this.over && !this.busy && this.userTurn;
    if (this.actionBtns.hint) this.actionBtns.hint.disabled = !myTurn;
    if (this.actionBtns.undo) this.actionBtns.undo.disabled = this.over || this.busy || !this.userMovesPlayed();
  }

  private userMovesPlayed(): number {
    const n = this.g.history().length;
    const firstUserPly = this.cfg.color === 'white' ? 0 : 1;
    return Math.max(0, Math.ceil((n - firstUserPly) / 2));
  }

  /** Look at an earlier position from the move list (view only). */
  private view(i: number) {
    const hist = this.g.history({ verbose: true });
    if (i >= hist.length - 1) {
      this.sync();
      this.restoreTurnOverlays();
      return;
    }
    this.viewPly = i;
    const m = hist[i];
    this.board.setDangers(null);
    this.board.arrows([]);
    this.board.badge(null);
    this.board.set(m.after, { lastMove: [m.from, m.to], movable: null });
    this.moveList.select(i);
    this.status.replaceChildren(h('button.btn.sm.back-live', { type: 'button', onclick: () => this.view(hist.length - 1) }, icon('last'), 'Back to the game'));
  }

  private renderClocks() {
    if (!this.clock.timed) return;
    const top: Side = this.cfg.color === 'white' ? 'black' : 'white';
    this.topCard.setClock(this.clock.now(top), this.clock.running === top);
    this.bottomCard.setClock(this.clock.now(this.cfg.color), this.clock.running === this.cfg.color);
  }

  private setEval(userCp: number, mate: number | null) {
    if (!this.evalBar) return;
    const sign = this.cfg.color === 'white' ? 1 : -1;
    this.evalBar.set(userCp * sign, mate === null ? null : mate * sign, this.board.orientation === 'black');
  }

  // ------------------------------------------------------------------ bot chat

  private say(ev: ChatEvent) {
    if (!settings().botChat) return;
    this.chatSaid.add(ev);
    this.quietPlies = 0;
    this.chatBubble.textContent = this.chat.line(ev);
    this.chatBubble.classList.remove('show');
    void this.chatBubble.offsetWidth;
    this.chatBubble.classList.add('show');
    clearTimeout(this.chatTimer);
    this.chatTimer = window.setTimeout(() => this.chatBubble.classList.remove('show'), 4800);
  }

  // ------------------------------------------------------------------ menu

  private toggleMenu() {
    if (this.menu) return this.closeMenu();
    const item = (ic: IconName, label: string, fn: () => void, cls = '') =>
      h(`button.menu-item${cls}`, { type: 'button', onclick: () => (this.closeMenu(), fn()) }, icon(ic), label);
    this.menu = h(
      'div.game-menu',
      { role: 'menu' },
      item('chat', settings().botChat ? 'Turn bot chat off' : 'Turn bot chat on', () => {
        updateSettings({ botChat: !settings().botChat });
        if (!settings().botChat) this.chatBubble.classList.remove('show');
      }),
      item('volume', settings().sound ? 'Sound off' : 'Sound on', () => updateSettings({ sound: !settings().sound })),
      h('button.menu-item', { type: 'button', disabled: this.over, onclick: () => (this.closeMenu(), void this.offerDraw()) }, h('span.half-ico', '½'), 'Offer draw'),
      h('button.menu-item.danger', { type: 'button', disabled: this.over, onclick: () => (this.closeMenu(), void this.resign()) }, icon('flag'), 'Resign'),
      item('back', this.over ? 'New game' : 'Leave for now (saved)', () => this.nav.exit()),
    );
    this.actionBtns.more.parentElement!.append(this.menu);
    setTimeout(() => document.addEventListener('pointerdown', this.outsideClick), 0);
  }

  private closeMenu() {
    this.menu?.remove();
    this.menu = null;
    document.removeEventListener('pointerdown', this.outsideClick);
  }

  // ------------------------------------------------------------------ turns

  private save() {
    if (this.over) return;
    void kvSet(RESUME_KEY, {
      cfg: { ...this.cfg, assist: this.assist },
      sans: this.g.history(),
      times: this.times,
      clock: { ...this.clock.remaining },
      hintsUsed: this.hintsUsed,
      classes: this.classes,
      accs: this.accs,
      takebacks: this.takebacks,
    } satisfies SavedGame);
  }

  /** Compute ✗ marks for the current position (after paint, so the board never waits on it). */
  private showDangers() {
    if (!this.assist.dangerMarks) return;
    const fen = this.g.fen();
    setTimeout(() => {
      if (!this.over && this.g.fen() === fen && this.userTurn && this.viewPly === null) this.board.setDangers(dangers(fen));
    }, 0);
  }

  private get needsEval() {
    return this.assist.moveFeedback || this.assist.blunderCheck || this.assist.evalBar;
  }

  private startUserTurn() {
    this.turnStarted = performance.now();
    this.clock.start(this.cfg.color);
    this.cctOn = null;
    this.sync();
    this.showDangers();
    const fen = this.g.fen();
    this.pre = this.needsEval
      ? engine.analyse(fen, { movetime: 300, multipv: 2 }).then((r) => {
          if (!r.lines[0]) return null;
          const p: PreEval = { fen, cp: scoreNum(r.lines[0]), mate: r.lines[0].mate, best: r.lines[0].pv[0] ?? r.bestmove, second: r.lines[1] ? scoreNum(r.lines[1]) : null };
          if (this.g.fen() === fen) this.setEval(p.cp, p.mate);
          return p;
        })
      : null;
    this.restoreTurnOverlays();
    this.status.replaceChildren();
  }

  /** Threat arrows + CCT chips for the position where the user is to move. */
  private restoreTurnOverlays() {
    if (this.over || !this.userTurn || this.busy) {
      this.renderCct();
      return;
    }
    const fen = this.g.fen();
    const threats = this.assist.threatArrows ? threatsAgainst(fen) : [];
    this.board.arrows(threats.map((t) => ({ orig: t.from as Key, dest: t.to as Key, brush: 'red' })));
    if (this.coach) {
      const watch = threats.length ? `Watch out: ${threats[0].text}.` : '';
      const fb = this.feedback;
      if (fb) this.coach.say(fb.text + (watch ? `\n\n${watch}` : ''), watch && fb.mood === 'happy' ? 'thinking' : fb.mood, { fen: fb.fen, title: fb.title() });
      else if (watch) this.coach.say(watch, 'worried', { fen });
    }
    this.renderCct();
  }

  private renderCct() {
    if (!this.cctRow) return;
    const live = !this.over && this.userTurn && !this.busy && this.viewPly === null;
    const fen = this.g.fen();
    const me = this.g.turn();
    const mine = live ? cct(fen, me) : null;
    const theirs = live ? cct(fen, me === 'w' ? 'b' : 'w') : null;
    const attacked = live ? threatsAgainst(fen).length : 0;
    const chip = (k: CctKind, label: string) =>
      h(
        `button.cct-chip${this.cctOn === k ? '.on' : ''}`,
        {
          type: 'button',
          disabled: !live,
          'aria-pressed': String(this.cctOn === k),
          onclick: () => {
            this.cctOn = this.cctOn === k ? null : k;
            this.showCct();
          },
        },
        h('span.cct-q', `${label}?`),
        mine && theirs ? h('span.cct-n', h('span.you', String(mine[k].length)), h('span.them', String(theirs[k].length + (k === 'threats' ? attacked : 0)))) : null,
      );
    this.cctRow.replaceChildren(chip('checks', 'Checks'), chip('captures', 'Captures'), chip('threats', 'Threats'));
  }

  private showCct() {
    this.renderCct();
    const k = this.cctOn;
    if (!k) {
      this.restoreTurnOverlays();
      return;
    }
    const fen = this.g.fen();
    const me = this.g.turn();
    const mine = cct(fen, me)[k];
    const theirs = cct(fen, me === 'w' ? 'b' : 'w')[k];
    const shapes: DrawShape[] = [
      ...theirs.slice(0, 5).map((m) => ({ orig: m.from as Key, dest: m.to as Key, brush: m.good ? 'red' : 'paleRed' })),
      ...mine.slice(0, 5).map((m) => ({ orig: m.from as Key, dest: m.to as Key, brush: m.good ? 'blue' : 'paleBlue' })),
    ];
    this.board.arrows(shapes);
    let now = '';
    if (k === 'threats') {
      const t = threatsAgainst(fen);
      shapes.push(...t.map((x) => ({ orig: x.from as Key, dest: x.to as Key, brush: 'red' })));
      this.board.arrows(shapes);
      const hang = t.filter((x) => x.kind === 'hanging');
      if (hang.length) this.board.flash(hang.map((x) => x.to), 'red', 1800);
      if (t.length) now = `Right now ${t[0].text}. `;
    }
    this.coach?.say(now + cctSummary(k, mine, theirs), now ? 'worried' : 'thinking', { fen });
  }

  private async userMove(m: UserMove) {
    if (this.over || this.busy || this.viewPly !== null) return;
    const before = this.g.fen();
    this.board.arrows([]);
    this.board.badge(null);
    this.board.setDangers(null);
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

    // 1. "Is it safe?" — instant, no engine
    if (this.assist.safetyCheck) {
      const sfy = moveSafety(before, mv);
      if (!sfy.safe) {
        const shapes: DrawShape[] = sfy.attackers.map((a) => ({ orig: a.from as Key, dest: a.to as Key, brush: 'red' }));
        if (sfy.allowsMate) shapes.push({ orig: sfy.allowsMate.from as Key, dest: sfy.allowsMate.to as Key, brush: 'red' });
        this.board.arrows(shapes);
        this.board.flash(sfy.newlyHanging, 'red', 2400);
        playSound('bad');
        const back = await this.ask(sfy.text, 'Is it safe?');
        if (this.over) return;
        if (back) return this.undoPending('Taken back. Find a safe square, or protect the piece first.');
        this.board.arrows([]);
      }
    }

    // 2. engine look (feedback, eval bar, "Are you sure?")
    let post: AnalysisResult | null = null;
    const pre = this.pre ? await this.pre : null;
    if (this.needsEval && pre && pre.fen === before) {
      if (this.assist.blunderCheck) this.status.replaceChildren(h('div.banner.subtle', 'Coach is checking your move…'));
      post = await engine.analyse(this.g.fen(), { movetime: this.assist.blunderCheck ? 350 : 250 });
      if (this.over) return;
      this.status.replaceChildren();
      const after = this.g.isDraw() ? 0 : post.lines[0] ? -scoreNum(post.lines[0]) : pre.cp;
      const drop = winPct(pre.cp) - winPct(after);
      if (this.assist.blunderCheck && drop >= 18 && after < 300) {
        const why = explainMistake(before, mv, post.lines[0]?.pv ?? [], post.lines[0]?.mate ?? null);
        playSound('bad');
        const back = await this.ask(`${why} Your winning chances drop by about ${Math.round(drop)}%.`, 'Are you sure?');
        if (this.over) return;
        if (back) return this.undoPending('Taken back. Look again: checks, captures, threats.');
      }
      this.rateMove(before, mv, pre, post);
    }

    this.busy = false;
    this.times.push(Math.round(spent));
    playSound(this.g.inCheck() ? 'check' : mv.captured ? 'capture' : 'move');
    this.clock.switch(this.cfg.color);
    this.slowDownNudge(spent, mv, before);
    this.quietPlies++;
    if (this.g.inCheck() && !this.g.isGameOver() && this.quietPlies >= 2 && Math.random() < 0.5) this.say('checked');
    this.sync();
    this.save();
    if (!this.checkEnd()) void this.botTurn();
  }

  /** Coach question with Take back / Play it buttons. Resolves true for "take back". */
  private ask(text: string, title: string): Promise<boolean> {
    return new Promise((resolve) => {
      const done = (v: boolean) => {
        this.coach?.setActions([]);
        resolve(v);
      };
      if (!this.coach) {
        void modal(title, text, [
          { label: 'Take it back', value: 'back', primary: true },
          { label: 'Play anyway', value: 'play' },
        ]).then((c) => done(c === 'back'));
        return;
      }
      this.coach.say(text, 'worried', { title: h('span.ask-title', icon('shield'), title), tone: 'warn' });
      this.coach.setActions([
        { label: 'Take back', icon: 'undo', primary: true, onclick: () => done(true) },
        { label: 'Play it', onclick: () => done(false) },
      ]);
      this.coach.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private undoPending(msg: string) {
    this.g.undo();
    this.busy = false;
    this.board.arrows([]);
    this.sync();
    this.showDangers();
    this.coach?.say(msg, 'thinking');
    this.renderCct();
  }

  /** Classify the move, put a badge on the board and a one-liner in the coach bubble. */
  private rateMove(before: string, mv: Move, pre: PreEval, post: AnalysisResult) {
    const ply = this.g.history().length - 1;
    const line = post.lines[0];
    const afterCp = this.g.isDraw() ? 0 : line ? -scoreNum(line) : pre.cp;
    const uci = mv.from + mv.to + (mv.promotion ?? '');
    const winBefore = winPct(pre.cp);
    const winAfter = this.g.isCheckmate() ? 100 : winPct(afterCp);
    const cls = classifyMove({
      ply,
      winBefore,
      winAfter,
      winSecond: pre.second === null ? null : winPct(pre.second),
      isBest: uci === pre.best,
      isSacrifice: isSacrifice(before, mv),
      allowsMate: !!line && line.mate !== null && line.mate > 0 && !(pre.mate !== null && pre.mate < 0),
      missedMate: pre.mate !== null && pre.mate > 0 && !this.g.isCheckmate() && !(line && line.mate !== null && line.mate < 0),
      isRecapture: !!mv.captured && this.g.history({ verbose: true })[ply - 1]?.to === mv.to,
    });
    this.classes[ply] = cls;
    this.accs.push(moveAccuracy(Math.max(0, winBefore - winAfter)));
    this.setEval(afterCp, line?.mate !== null && line?.mate !== undefined ? -line.mate : null);
    if (!this.assist.moveFeedback) return;
    this.board.badge(mv.to, cls);
    const text = feedbackLine({ cls, fenBefore: before, move: mv, bestSan: sanOf(before, pre.best), replyPv: line?.pv ?? [], replyMate: line?.mate ?? null });
    const title = () => h('span.fb-title', classBadge(cls), `${mv.san} is ${CLASS_PHRASE[cls]}`);
    this.feedback = { text: text.replace(/^[^.!]+[.!]\s*/, ''), mood: moodFor(cls), cls, fen: before, title };
    this.coach?.say(this.feedback.text, this.feedback.mood, { title: title(), fen: before });
    if (cls === 'brilliant' || cls === 'great') playSound('good');
  }

  private slowDownNudge(spent: number, mv: Move, before: string) {
    if (this.pure || !this.tc.long || this.tc.baseMin === 0) return;
    const forced = new Chess(before).moves().length <= 2;
    const recapture = !!mv.captured;
    if (spent < 4000 && !forced && !recapture && this.g.history().length > 12) this.fastMoves++;
    else this.fastMoves = 0;
    if (this.fastMoves >= 3) {
      this.fastMoves = 0;
      toast('Long game: use your time! Run the checklist before each move.', 'info', 4500);
    }
  }

  private async botTurn() {
    if (this.over) return;
    const id = ++this.turnId;
    const side = this.sideToMove();
    this.clock.start(side);
    this.botThinking = true;
    this.cctOn = null;
    this.renderCct();
    this.sync();
    const started = performance.now();
    const remaining = this.clock.timed ? this.clock.now(side) : 60_000;
    const budget = this.clock.timed ? remaining / 35 + this.tc.incSec * 600 : 1200;
    const choice = await botChoose(this.bot, this.g.fen(), budget);
    if (this.over || id !== this.turnId || choice.uci === '(cancelled)') return;
    // natural minimum delay so replies don't feel instant
    const minDelay = 350 + Math.random() * 600;
    const elapsed = performance.now() - started;
    if (elapsed < minDelay) await new Promise((r) => setTimeout(r, minDelay - elapsed));
    if (this.over || id !== this.turnId) return;
    let mv: Move;
    try {
      mv = this.g.move({ from: choice.uci.slice(0, 2), to: choice.uci.slice(2, 4), promotion: choice.uci[4] });
    } catch {
      return;
    }
    this.botThinking = false;
    this.times.push(Math.round(performance.now() - started));
    this.classes[this.g.history().length - 1] = null;
    this.clock.switch(side);
    this.board.badge(null);
    playSound(this.g.inCheck() ? 'check' : mv.captured ? 'capture' : 'move');
    this.quietPlies++;
    const ev = chatEventFor({
      prevCp: this.prevBotCp,
      cp: choice.cp,
      captured: mv.captured ? VALUE[mv.captured] : 0,
      givesCheck: this.g.inCheck(),
      quietPlies: this.quietPlies,
      said: this.chatSaid,
    });
    if (choice.cp !== null) this.prevBotCp = choice.cp;
    this.save();
    if (!this.checkEnd()) {
      if (ev && !this.g.isGameOver()) this.say(ev);
      this.startUserTurn();
    } else this.sync();
  }

  private async hint() {
    if (this.over || !this.userTurn || this.busy) return;
    this.hintsUsed++;
    const fen = this.g.fen();
    this.coach?.say('Let me think…', 'thinking');
    const r = await engine.analyse(fen, { depth: 12 });
    if (this.g.fen() !== fen || !r.lines[0]) return;
    if (this.assist.suggestArrows) this.board.arrows([arrow(r.bestmove)]);
    const text = explainBest(fen, r.bestmove, r.lines[0].pv);
    // one idea at a time: the move and its main reason
    const short = text.split(' A likely continuation')[0].split('; ')[0].replace(/\.?$/, '.');
    if (this.coach) this.coach.say(short, 'happy', { title: h('span.fb-title', icon('hint'), 'Hint'), fen });
    else toast(short.replace(/\*\*/g, ''), 'info', 5000);
    this.save();
  }

  private takeback() {
    if (this.over || this.busy || !this.assist.takebacks || !this.userMovesPlayed()) return;
    this.turnId++;
    if (this.botThinking) engine.cancelAll();
    this.botThinking = false;
    const pop = () => {
      this.g.undo();
      this.times.pop();
      this.classes.length = this.g.history().length;
    };
    pop();
    while (!this.userTurn && this.g.history().length) pop();
    this.takebacks++;
    this.feedback = null;
    this.board.badge(null);
    this.coach?.say('Taken back. Have another look!', 'neutral');
    this.save();
    this.startUserTurn();
  }

  // ------------------------------------------------------------------ game end

  private checkEnd(): boolean {
    const g = this.g;
    if (!g.isGameOver()) return false;
    if (g.isCheckmate()) {
      const winner: Side = g.turn() === 'w' ? 'black' : 'white';
      void this.finish(winner === 'white' ? '1-0' : '0-1', 'checkmate');
    } else if (g.isStalemate()) void this.finish('1/2-1/2', 'stalemate');
    else if (g.isInsufficientMaterial()) void this.finish('1/2-1/2', 'insufficient material');
    else if (g.isThreefoldRepetition()) void this.finish('1/2-1/2', 'repetition');
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
    const botPov = this.userTurn ? -s : s;
    if (this.g.history().length >= 40 && botPov < 40) {
      toast(`${this.bot.name} accepts the draw.`, 'info');
      void this.finish('1/2-1/2', 'agreement');
    } else toast(`${this.bot.name} says: not yet, let us play on!`, 'info');
  }

  private async finish(result: GameRecord['result'], termination: string) {
    if (this.over) return;
    this.over = true;
    this.turnId++;
    this.botThinking = false;
    this.clock.stop();
    engine.cancelAll();
    this.board.setDangers(null);
    this.board.arrows([]);
    this.coach?.setActions([]);
    this.sync();
    this.renderCct();
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
      pure: this.pure,
      hintsUsed: this.hintsUsed,
    };
    const id = await saveGame(rec);
    playSound('end');
    const ev: ChatEvent = draw ? 'draw' : userWon ? 'userWins' : 'botWins';
    this.say(ev);
    const headline = draw ? 'Draw' : userWon ? 'You won!' : `${this.bot.name} won`;
    this.status.replaceChildren(
      h(`div.end-strip.${userWon ? 'win' : draw ? 'draw' : 'loss'}`, h('strong', headline), h('span', ` by ${termination}`), h('button.btn.sm.primary', { type: 'button', onclick: () => go(`/review/${id}`) }, 'Review')),
    );
    if (this.actionBtns.more) this.actionBtns.more.classList.add('pulse');
    setTimeout(() => this.endCard({ id, result, termination, userWon, draw, headline, botLine: this.chat.line(ev) }), 700);
  }

  private endCard(o: { id: number; result: GameRecord['result']; termination: string; userWon: boolean; draw: boolean; headline: string; botLine: string }) {
    if (!this.el.isConnected) return;
    const tone = o.userWon ? 'win' : o.draw ? 'draw' : 'loss';
    const mood: Mood = o.userWon ? 'excited' : o.draw ? 'happy' : 'neutral';
    const coachLine = o.userWon
      ? 'What a game! Let us look at your best moves in the review.'
      : o.draw
        ? 'A hard-fought draw! The review shows where you could have pushed for more.'
        : 'Every loss teaches something. Let us find the turning point together.';
    const acc = this.accs.length ? this.accs.reduce((a, b) => a + b, 0) / this.accs.length : null;
    const counts = (['best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'] as MoveClass[])
      .map((c) => [c, this.classes.filter((x) => x === c || (c === 'best' && (x === 'brilliant' || x === 'great'))).length] as const)
      .filter(([, n]) => n > 0);
    const score = o.draw ? ['½', '½'] : o.userWon ? ['1', '0'] : ['0', '1'];
    const close = () => back.remove();
    const back = h(
      'div.end-back',
      { onclick: (e: Event) => e.target === back && close() },
      h(
        `div.end-card.${tone}`,
        { role: 'dialog', 'aria-modal': 'true', 'aria-label': o.headline },
        h('button.end-x.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: close }, icon('close')),
        h('div.end-head', o.userWon ? icon('trophy', 'end-trophy') : null, h('h2', o.headline), h('div.end-sub', `by ${o.termination}`)),
        h(
          'div.end-players',
          h(`div.end-player${o.userWon ? '.winner' : ''}`, h('div.end-av', userAvatar()), h('span', 'You')),
          h('div.end-score', h('span', score[0]), h('span.dash', '-'), h('span', score[1])),
          h(`div.end-player${!o.userWon && !o.draw ? '.winner' : ''}`, h('div.end-av', botAvatar(this.bot.avatar)), h('span', this.bot.name)),
        ),
        settings().botChat ? h('div.end-quote', h('span.q-av', botAvatar(this.bot.avatar)), h('span.q-text', o.botLine)) : null,
        h('div.end-coach', h('div.end-mascot', mascot(mood)), h('div.end-bubble', coachLine)),
        acc !== null
          ? h(
              'div.end-acc',
              h('div.acc-num', h('strong', acc.toFixed(1)), h('small', 'Accuracy')),
              h('div.acc-counts', counts.map(([c, n]) => h('span.acc-count', classBadge(c), String(n)))),
            )
          : h('div.end-acc.teaser', icon('chart'), h('span', 'See your accuracy and best moves in Game Review.')),
        h('button.btn.primary.big.end-review', { type: 'button', onclick: () => (close(), go(`/review/${o.id}`)) }, icon('analysis'), 'Game Review'),
        h(
          'div.end-row',
          h('button.btn', { type: 'button', onclick: () => (close(), this.nav.rematch()) }, icon('replay'), 'Rematch'),
          h('button.btn', { type: 'button', onclick: () => (close(), this.nav.exit()) }, icon('bot'), 'New bot'),
        ),
      ),
    );
    document.body.append(back);
    this.endEl = back;
  }

  private endEl: HTMLElement | null = null;

  destroy() {
    this.clock.stop();
    this.save(); // keep the game resumable
    this.over = true;
    this.turnId++;
    clearTimeout(this.chatTimer);
    this.closeMenu();
    this.endEl?.remove();
    engine.cancelAll();
    this.coach?.stop();
    this.board.destroy();
  }
}

