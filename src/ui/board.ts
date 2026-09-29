import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Key } from '@lichess-org/chessground/types';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { Chess, type Square } from 'chess.js';
import { destsOf, isPromotion, turnColor } from '../chess/util';
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

/** A chessground board bound to legal-move generation from chess.js. */
export class BoardView {
  readonly el: HTMLElement;
  readonly cg: Api;
  private fen = '';
  private onMove?: (m: UserMove) => void;
  private shapes: DrawShape[] = [];
  private highlights = new Map<Key, string>();

  constructor(opts: BoardOptions = {}) {
    this.onMove = opts.onMove;
    const inner = h('div.cg-wrap');
    this.el = h('div.board-wrap', inner);
    const s = settings();
    this.cg = Chessground(inner, {
      orientation: opts.orientation ?? 'white',
      coordinates: s.coordinates,
      animation: { enabled: s.animation, duration: 200 },
      highlight: { lastMove: true, check: true },
      movable: { free: false, showDests: true, color: undefined, events: { after: (o, d) => this.handleMove(o as Square, d as Square) } },
      premovable: { enabled: false },
      draggable: { enabled: true, showGhost: true },
      drawable: { enabled: true, visible: true },
    });
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
    this.cg.setAutoShapes([...this.shapes, ...extra]);
  }

  arrows(shapes: DrawShape[]) {
    this.cg.setAutoShapes([...this.shapes, ...shapes]);
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
          'div.promo-box',
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
