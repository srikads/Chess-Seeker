// "Hoot" — Chess Seeker's original owl coach — plus a speech bubble that can narrate an explanation
// step by step while driving the board (moves animate, arrows draw in, squares flash), so the words
// and the position on screen always line up.
import { Chess } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { MoveClass } from '../chess/classify';
import type { BoardView } from './board';
import { h } from './dom';
import { icon } from './icons';

export type Mood = 'neutral' | 'happy' | 'excited' | 'worried' | 'sad' | 'thinking';

/** Mood that suits a move classification. */
export function moodFor(cls: MoveClass | undefined): Mood {
  switch (cls) {
    case 'brilliant':
    case 'great':
      return 'excited';
    case 'best':
    case 'excellent':
    case 'good':
    case 'book':
      return 'happy';
    case 'inaccuracy':
      return 'thinking';
    case 'mistake':
    case 'miss':
      return 'worried';
    case 'blunder':
      return 'sad';
    default:
      return 'neutral';
  }
}

const EYES: Record<Mood, string> = {
  neutral: '<circle cx="38" cy="46" r="6" fill="#1d1a16"/><circle cx="62" cy="46" r="6" fill="#1d1a16"/><circle cx="40" cy="44" r="2" fill="#fff"/><circle cx="64" cy="44" r="2" fill="#fff"/>',
  happy: '<path d="M30 48q8-10 16 0" stroke="#1d1a16" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M54 48q8-10 16 0" stroke="#1d1a16" stroke-width="4" fill="none" stroke-linecap="round"/>',
  excited: '<circle cx="38" cy="46" r="8" fill="#1d1a16"/><circle cx="62" cy="46" r="8" fill="#1d1a16"/><circle cx="41" cy="43" r="3" fill="#fff"/><circle cx="65" cy="43" r="3" fill="#fff"/><circle cx="36" cy="49" r="1.3" fill="#fff"/><circle cx="60" cy="49" r="1.3" fill="#fff"/>',
  worried: '<circle cx="38" cy="48" r="5.5" fill="#1d1a16"/><circle cx="62" cy="48" r="5.5" fill="#1d1a16"/><path d="M28 36l16 4M72 36l-16 4" stroke="#5a3d22" stroke-width="3.5" stroke-linecap="round"/>',
  sad: '<path d="M31 47q7 6 14 0" stroke="#1d1a16" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M55 47q7 6 14 0" stroke="#1d1a16" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M29 38l14-4M71 38l-14-4" stroke="#5a3d22" stroke-width="3.5" stroke-linecap="round"/>',
  thinking: '<circle cx="41" cy="43" r="5.5" fill="#1d1a16"/><circle cx="65" cy="43" r="5.5" fill="#1d1a16"/><path d="M29 35l14-2" stroke="#5a3d22" stroke-width="3.5" stroke-linecap="round"/>',
};
const BEAK: Record<Mood, string> = {
  neutral: '<path d="M45 56l5 9 5-9z" fill="#f2a33a"/>',
  happy: '<path d="M44 55l6 10 6-10z" fill="#f2a33a"/>',
  excited: '<path d="M43 55h14l-7 7z" fill="#f2a33a"/><path d="M45 62h10l-5 7z" fill="#d9822b"/>',
  worried: '<path d="M46 57l4 7 4-7z" fill="#f2a33a"/>',
  sad: '<path d="M46 58l4 6 4-6z" fill="#f2a33a"/>',
  thinking: '<path d="M46 56l4 8 4-8z" fill="#f2a33a"/><circle cx="74" cy="76" r="7" fill="#a8723f"/>',
};

/** The owl mascot as an SVG element. */
export function mascot(mood: Mood = 'neutral', cls = ''): SVGSVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 100 100');
  el.setAttribute('class', `mascot mood-${mood} ${cls}`.trim());
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Coach Hoot (${mood})`);
  el.innerHTML =
    // ear tufts + body
    '<path d="M22 22l10 14h-12zM78 22l-10 14h12z" fill="#7a5130"/>' +
    '<ellipse cx="50" cy="60" rx="34" ry="36" fill="#9a6a3e"/>' +
    '<ellipse cx="50" cy="72" rx="20" ry="20" fill="#e9d2a8"/>' +
    '<path d="M38 70q3 3 6 0M50 74q3 3 6 0M44 82q3 3 6 0" stroke="#c9ab7a" stroke-width="2" fill="none"/>' +
    // facial disc
    '<ellipse cx="38" cy="46" rx="14" ry="13" fill="#f6ead2"/><ellipse cx="62" cy="46" rx="14" ry="13" fill="#f6ead2"/>' +
    EYES[mood] +
    BEAK[mood] +
    // wings
    '<path d="M17 58q-4 18 10 28 2-16-10-28zM83 58q4 18-10 28-2-16 10-28z" fill="#7a5130"/>' +
    // little green scarf — the app's accent colour
    '<path d="M30 86q20 8 40 0v6q-20 8-40 0z" fill="#81b64c"/>';
  return el;
}

// ------------------------------------------------------------------ text with tappable moves/squares

const MOVE_SRC = 'O-O-O[+#]?|O-O[+#]?|\\b[KQRBN][a-h]?[1-8]?x?[a-h][1-8][+#]?|\\b[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|\\b[a-h][1-8]=[QRBN][+#]?|\\b[a-h][1-8]\\b[+#]?';
const TOKEN = new RegExp(`(\\*\\*[^*]+\\*\\*|${MOVE_SRC})`);
const IS_MOVE = new RegExp(`^(?:${MOVE_SRC})$`);
const FIG: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' };

/** Render coach text: **bold**, moves as figurine chips, squares as chips. Tapping a chip points at it on the board. */
export function coachText(text: string, board?: BoardView | null, fen?: string): HTMLElement {
  const out = h('div.coach-text');
  for (const para of text.split(/\n{2,}/)) {
    const p = h('p');
    for (const part of para.split(TOKEN)) {
      if (!part) continue;
      if (part.startsWith('**')) p.append(h('strong', ...coachText(part.slice(2, -2), board, fen).firstElementChild!.childNodes));
      else if (/^[a-h][1-8][+#]?$/.test(part)) p.append(h('button.sq-chip', { type: 'button', onclick: () => board?.flash([part.slice(0, 2)], 'yellow', 1200) }, part));
      else if (IS_MOVE.test(part)) {
        const piece = FIG[part[0]];
        const dest = part.match(/([a-h][1-8])(?!.*[a-h][1-8])/)?.[1];
        p.append(
          h(
            'button.move-chip',
            {
              type: 'button',
              onclick: () => {
                if (fen && board) {
                  try {
                    const m = new Chess(fen).move(part);
                    board.arrows([{ orig: m.from, dest: m.to, brush: 'yellow' } as DrawShape]);
                    return;
                  } catch {
                    /* not legal here — just flash the square */
                  }
                }
                if (dest) board?.flash([dest], 'yellow', 1200);
              },
            },
            piece ? h('span.fig', piece) : null,
            piece ? part.slice(1) : part,
          ),
        );
      } else p.append(part);
    }
    out.append(p);
  }
  return out;
}

// ------------------------------------------------------------------ narration

export interface NarrationStep {
  /** Short sentence(s). Supports **bold**; moves/squares become tappable chips. */
  text: string;
  mood?: Mood;
  /** Put the board in this position before the step (defaults to where the previous step ended). */
  fen?: string;
  /** SAN moves to animate from that position, one by one, as the step is shown. */
  moves?: string[];
  /** Shown after the moves finish. */
  arrows?: DrawShape[];
  highlights?: Record<string, string>;
  flash?: { squares: string[]; color?: 'red' | 'green' | 'blue' | 'yellow' };
  badge?: { sq: string; cls: MoveClass };
  /** Last move to mark when the step is shown without animation. */
  lastMove?: [string, string];
}

export interface CoachAction {
  label: string;
  icon?: Parameters<typeof icon>[0];
  primary?: boolean;
  onclick: () => void;
}

/** Coach avatar + speech bubble. `say()` for one-liners; `narrate()` for step-by-step walkthroughs synced to the board. */
export class Coach {
  readonly el: HTMLElement;
  private face: HTMLElement;
  private bubble: HTMLElement;
  private body: HTMLElement;
  private foot: HTMLElement;
  private actionsEl: HTMLElement;
  private ctrl: AbortController | null = null;
  private steps: NarrationStep[] = [];
  private starts: string[] = [];
  private idx = 0;
  private onExit: (() => void) | null = null;

  constructor(private board: BoardView | null = null, opts: { compact?: boolean } = {}) {
    this.face = h('div.coach-face', mascot('neutral'));
    this.body = h('div.coach-body');
    this.foot = h('div.coach-foot');
    this.actionsEl = h('div.coach-actions');
    this.bubble = h('div.coach-bubble', this.body, this.foot);
    this.el = h(`div.coach${opts.compact ? '.compact' : ''}`, this.face, h('div.coach-main', this.bubble, this.actionsEl));
  }

  setMood(m: Mood) {
    this.face.replaceChildren(mascot(m));
    this.face.classList.remove('bob');
    void this.face.offsetWidth;
    this.face.classList.add('bob');
  }

  /** One short message. `title` is shown in bold above it (e.g. "Nf3 is a blunder"). */
  say(text: string, mood: Mood = 'neutral', o: { title?: string | Node; fen?: string; tone?: string } = {}) {
    this.stop();
    this.setMood(mood);
    this.bubble.className = `coach-bubble ${o.tone ?? ''}`.trim();
    this.body.replaceChildren(...[o.title ? h('div.coach-title', o.title) : null, coachText(text, this.board, o.fen)].filter(Boolean) as Node[]);
    this.foot.replaceChildren();
    this.reveal();
  }

  /** Buttons under the bubble (Retry, Best, Next…). */
  setActions(actions: CoachAction[]) {
    this.actionsEl.replaceChildren(
      ...actions.map((a) => h(`button.btn${a.primary ? '.primary' : ''}`, { type: 'button', onclick: a.onclick }, a.icon ? icon(a.icon) : null, a.label)),
    );
  }

  /** Walk through `steps`, one per tap, with each step driving the board. Resolves when the user leaves. */
  narrate(steps: NarrationStep[], o: { startFen: string; onExit?: () => void; title?: string } ): void {
    this.stop();
    this.steps = steps;
    this.onExit = o.onExit ?? null;
    // precompute each step's start position
    this.starts = [];
    let fen = o.startFen;
    for (const s of steps) {
      const start = s.fen ?? fen;
      this.starts.push(start);
      const g = new Chess(start);
      for (const m of s.moves ?? []) {
        try {
          g.move(m);
        } catch {
          break;
        }
      }
      fen = g.fen();
    }
    this.show(0, true);
  }

  private async show(i: number, animate: boolean) {
    this.ctrl?.abort();
    const ctrl = (this.ctrl = new AbortController());
    this.idx = i;
    const s = this.steps[i];
    this.setMood(s.mood ?? 'neutral');
    this.bubble.className = 'coach-bubble narrating';
    const start = this.starts[i];
    this.body.replaceChildren(coachText(s.text, this.board, start));
    this.reveal();
    const last = i === this.steps.length - 1;
    this.foot.replaceChildren(
      h('div.step-dots', this.steps.map((_, k) => h(`span${k === i ? '.on' : k < i ? '.done' : ''}`))),
      h('div.grow'),
      h('button.btn.ghost.sm', { type: 'button', disabled: i === 0, onclick: () => void this.show(i - 1, false), 'aria-label': 'Previous step' }, icon('prev')),
      h('button.btn.ghost.sm', { type: 'button', onclick: () => void this.show(i, true), 'aria-label': 'Replay step' }, icon('replay')),
      last
        ? h('button.btn.primary.sm', { type: 'button', onclick: () => this.exit() }, 'Done')
        : h('button.btn.primary.sm', { type: 'button', onclick: () => void this.show(i + 1, true) }, 'Next', icon('next')),
    );
    const b = this.board;
    if (!b) return;
    b.badge(null);
    b.arrows([]);
    b.highlight({});
    const moves = s.moves ?? [];
    if (animate && moves.length) {
      b.set(start, { lastMove: s.lastMove });
      await new Promise((r) => setTimeout(r, 250));
      if (ctrl.signal.aborted) return;
      const ok = await b.playLine(start, moves, { signal: ctrl.signal, delay: 900 });
      if (!ok) return;
    } else if (moves.length) {
      const g = new Chess(start);
      let lm: [string, string] | undefined;
      for (const m of moves) {
        try {
          const mv = g.move(m);
          lm = [mv.from, mv.to];
        } catch {
          break;
        }
      }
      b.set(g.fen(), { lastMove: lm });
    } else b.set(start, { lastMove: s.lastMove });
    if (ctrl.signal.aborted) return;
    if (s.highlights) b.highlight(s.highlights);
    if (s.arrows) b.arrows(s.arrows);
    if (s.badge) b.badge(s.badge.sq, s.badge.cls);
    if (s.flash) b.flash(s.flash.squares, s.flash.color ?? 'red');
  }

  private exit() {
    this.stop();
    this.onExit?.();
  }

  /** Abort any running animation. */
  stop() {
    this.ctrl?.abort();
    this.ctrl = null;
  }

  get narrating() {
    return this.ctrl !== null;
  }

  get step() {
    return this.idx;
  }

  private reveal() {
    this.bubble.classList.remove('in');
    void this.bubble.offsetWidth;
    this.bubble.classList.add('in');
  }
}
