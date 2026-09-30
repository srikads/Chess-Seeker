import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Key } from '@lichess-org/chessground/types';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { Chess, type Square } from 'chess.js';
import { destsOf, isPromotion, turnColor } from '../chess/util';
import type { Dangers } from '../chess/guards';
import { settings } from '../store/settings';
import type { Annotations } from '../lessons/types';
import { h } from './dom';
import { playSound } from './sound';

export interface UserMove {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface BoardOptions {
  orientation?: 'white' | 'black';
  onMove?: (m: UserMove) => void;
}

/** Red ✗ badge in the corner of a pinned piece's square. */
const PIN_SVG =
  '<g><circle cx="80" cy="20" r="15" fill="#e2463c" stroke="#fff" stroke-width="3"/><path d="M73 13 L87 27 M87 13 L73 27" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>';
/** Big ✗ on a destination square that walks into mate. */
const BAD_DEST_SVG =
  '<g opacity="0.85"><circle cx="50" cy="50" r="22" fill="#e2463c"/><path d="M40 40 L60 60 M60 40 L40 60" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>';

/** A chessground board bound to legal-move generation from chess.js. */
export class BoardView {
  readonly el: HTMLElement;
  readonly cg: Api;
  private fen = '';
  private onMove?: (m: UserMove) => void;
  private shapes: DrawShape[] = [];
  /** engine/hint arrows on top of the lesson annotations */
  private extra: DrawShape[] = [];
  private danger: Dangers | null = null;
  private highlights = new Map<Key, string>();

  constructor(opts: BoardOptions = {}) {
    this.onMove = opts.onMove;
    const inner = h('div.cg-wrap');
    this.el = h('div.board-wrap', inner);
    const s = settings();
    this.cg = Chessground(inner, {
      orientation: opts.orientation ?? 'white',
      coordinates: s.coordinates,
      animation: { enabled: s.animation, duration: 260 },
      highlight: { lastMove: true, check: true },
      movable: { free: false, showDests: true, color: undefined, events: { after: (o, d) => this.handleMove(o as Square, d as Square) } },
      premovable: { enabled: false },
      draggable: { enabled: true, showGhost: true },
      drawable: { enabled: true, visible: true },
      events: { select: () => this.render() },
    });
    // chessground has no "deselect" event: re-check the selection after every tap
    this.el.addEventListener('pointerup', () => requestAnimationFrame(() => this.render()));
  }

  /** Show ✗ marks for pinned pieces and for moves that allow mate in one (null = off). */
  setDangers(d: Dangers | null) {
    this.danger = d;
    this.render();
  }

  private dangerShapes(): DrawShape[] {
    const d = this.danger;
    // custom SVG shapes need a laid-out board (zero size → NaN coordinates)
    if (!d || !this.el.isConnected || !this.el.clientWidth) return [];
    const out: DrawShape[] = d.pinned.map((sq) => ({ orig: sq as Key, customSvg: { html: PIN_SVG } }));
    const sel = this.cg.state.selected;
    if (sel) for (const to of d.mateIn1.get(sel as Square) ?? []) out.push({ orig: to as Key, customSvg: { html: BAD_DEST_SVG } });
    return out;
  }

  private render() {
    this.cg.setAutoShapes([...this.shapes, ...this.extra, ...this.dangerShapes()]);
  }

  /** Set the position. `movable` = which colour the user may move (null = view only). */
  set(fen: string, o: { lastMove?: [string, string]; movable?: 'white' | 'black' | 'both' | null; orientation?: 'white' | 'black' } = {}) {
    this.fen = fen;
    const g = new Chess(fen);
    const movable = o.movable ?? null;
    this.cg.set({
      fen,
      turnColor: turnColor(fen),
      check: g.inCheck(),
      lastMove: o.lastMove as Key[] | undefined,
      orientation: o.orientation ?? this.cg.state.orientation,
      movable: {
        color: movable === null ? undefined : movable,
        dests: movable === null ? new Map() : (destsOf(g) as Map<Key, Key[]>),
      },
    });
    if (!o.lastMove) this.cg.set({ lastMove: undefined });
  }

  get currentFen() {
    return this.fen;
  }

  setOrientation(o: 'white' | 'black') {
    this.cg.set({ orientation: o });
  }

  flip() {
    this.cg.toggleOrientation();
  }

  /** Show lesson-style annotations (square highlights + arrows). */
  annotate(a?: Annotations, extra: DrawShape[] = []) {
    this.highlights = new Map();
    for (const hl of a?.highlights ?? []) this.highlights.set(hl.sq as Key, `hl-${hl.mark}`);
    this.shapes = (a?.arrows ?? []).map((ar) => ({ orig: ar.from as Key, dest: ar.to as Key, brush: ar.mark }));
    this.cg.set({ highlight: { custom: this.highlights } });
    this.extra = extra;
    this.render();
  }

  arrows(shapes: DrawShape[]) {
    this.extra = shapes;
    this.render();
  }

  clearAnnotations() {
    this.annotate(undefined);
  }

  private async handleMove(from: Square, to: Square) {
    const g = new Chess(this.fen);
    let promotion: UserMove['promotion'];
    if (isPromotion(g, from, to)) {
      promotion = settings().autoQueen ? 'q' : await this.pickPromotion(g.turn() === 'w' ? 'white' : 'black');
      if (!promotion) {
        this.set(this.fen, { movable: turnColor(this.fen) });
        return;
      }
    }
    this.onMove?.({ from, to, promotion });
  }

  private pickPromotion(color: 'white' | 'black'): Promise<UserMove['promotion'] | undefined> {
    return new Promise((resolve) => {
      const roles = [['q', 'queen'], ['r', 'rook'], ['b', 'bishop'], ['n', 'knight']] as const;
      const overlay = h(
        'div.promo',
        { onclick: () => done(undefined) },
        h(
          // .cg-wrap scopes chessground's piece-image CSS to the picker too
          'div.promo-box.cg-wrap',
          roles.map(([k, role]) =>
            h(
              'button.promo-piece',
              { 'aria-label': role, onclick: (e: Event) => (e.stopPropagation(), done(k)) },
              h(`piece.${role}.${color}`),
            ),
          ),
        ),
      );
      const done = (v: UserMove['promotion'] | undefined) => {
        overlay.remove();
        resolve(v);
      };
      this.el.append(overlay);
    });
  }

  /** Animate a move programmatically (e.g. opponent reply) and set resulting position. */
  playMove(fenAfter: string, from: string, to: string, captured: boolean, movable: 'white' | 'black' | 'both' | null = null) {
    this.set(fenAfter, { lastMove: [from, to], movable });
    playSound(captured ? 'capture' : 'move');
  }

  destroy() {
    this.cg.destroy();
    this.el.remove();
  }
}

/** Arrow/circle helper for engine hints. */
export function arrow(uci: string, brush = 'green'): DrawShape {
  return { orig: uci.slice(0, 2) as Key, dest: uci.slice(2, 4) as Key, brush };
}
