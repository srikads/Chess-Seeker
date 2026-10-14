import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Key } from '@lichess-org/chessground/types';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { Chess, type Move, type Square } from 'chess.js';
import { destsOf, isPromotion, turnColor } from '../chess/util';
import type { Dangers } from '../chess/guards';
import { settings } from '../store/settings';
import type { Annotations } from '../lessons/types';
import type { MoveClass } from '../chess/classify';
import { h } from './dom';
import { classBadge } from './icons';
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

/** Arrow/circle colours. Chess.com-like: green = good/best, red = threat/bad, blue = alternative, yellow = idea. */
export const BRUSH: Record<string, string> = {
  green: 'rgb(130 190 70 / 0.85)',
  red: 'rgb(235 80 60 / 0.85)',
  blue: 'rgb(70 165 240 / 0.85)',
  yellow: 'rgb(255 170 0 / 0.85)',
  paleGreen: 'rgb(130 190 70 / 0.45)',
  paleBlue: 'rgb(70 165 240 / 0.45)',
  paleRed: 'rgb(235 80 60 / 0.45)',
  paleGrey: 'rgb(140 140 140 / 0.5)',
};

/** Red ✗ badge in the corner of a pinned piece's square. */
const PIN_SVG =
  '<g><circle cx="80" cy="20" r="15" fill="#e2463c" stroke="#fff" stroke-width="3"/><path d="M73 13 L87 27 M87 13 L73 27" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>';
/** Big ✗ on a destination square that walks into mate. */
const BAD_DEST_SVG =
  '<g opacity="0.85"><circle cx="50" cy="50" r="22" fill="#e2463c"/><path d="M40 40 L60 60 M60 40 L40 60" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>';

const NS = 'http://www.w3.org/2000/svg';
const shapeKey = (s: DrawShape) => `${s.orig}${s.dest ?? ''}${s.brush ?? ''}`;
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), res()), { once: true });
  });

export interface PlayLineOptions {
  /** ms between moves (default from settings / 900) */
  delay?: number;
  /** draw the move's arrow briefly before the piece moves */
  arrows?: boolean;
  brush?: string;
  /** called after each move is on the board */
  onStep?: (i: number, move: Move, fenAfter: string) => void;
  signal?: AbortSignal;
}

/** A chessground board bound to legal-move generation from chess.js, with an animated overlay layer
 *  for arrows, circles, move-class badges and square flashes. */
export class BoardView {
  readonly el: HTMLElement;
  readonly cg: Api;
  private fen = '';
  private onMove?: (m: UserMove) => void;
  private shapes: DrawShape[] = [];
  private extra: DrawShape[] = [];
  private shown = new Set<string>();
  private danger: Dangers | null = null;
  private highlights = new Map<Key, string>();
  private fx: SVGSVGElement;
  private badgeEl: HTMLElement | null = null;
  private badgeAt: { sq: string; cls: MoveClass } | null = null;
  private flashEls: HTMLElement[] = [];

  constructor(opts: BoardOptions = {}) {
    this.onMove = opts.onMove;
    const inner = h('div.cg-wrap');
    this.fx = document.createElementNS(NS, 'svg');
    this.fx.setAttribute('viewBox', '0 0 8 8');
    this.fx.setAttribute('class', 'fx-layer');
    this.fx.setAttribute('aria-hidden', 'true');
    this.el = h('div.board-wrap', inner, this.fx);
    const s = settings();
    this.cg = Chessground(inner, {
      orientation: opts.orientation ?? 'white',
      coordinates: s.coordinates,
      animation: { enabled: s.animation, duration: 220 },
      highlight: { lastMove: true, check: true },
      movable: { free: false, showDests: true, color: undefined, events: { after: (o, d) => this.handleMove(o as Square, d as Square) } },
      premovable: { enabled: false },
      draggable: { enabled: true, showGhost: true },
      drawable: { enabled: true, visible: true },
      events: { select: () => this.renderDangers() },
    });
    // chessground has no "deselect" event: re-check the selection after every tap
    this.el.addEventListener('pointerup', () => requestAnimationFrame(() => this.renderDangers()));
  }

  /** Show ✗ marks for pinned pieces and for moves that allow mate in one (null = off). */
  setDangers(d: Dangers | null) {
    this.danger = d;
    this.renderDangers();
  }

  private renderDangers() {
    const d = this.danger;
    // custom SVG shapes need a laid-out board (zero size → NaN coordinates)
    if (!d || !this.el.isConnected || !this.el.clientWidth) {
      this.cg.setAutoShapes([]);
      return;
    }
    const out: DrawShape[] = d.pinned.map((sq) => ({ orig: sq as Key, customSvg: { html: PIN_SVG } }));
    const sel = this.cg.state.selected;
    if (sel) for (const to of d.mateIn1.get(sel as Square) ?? []) out.push({ orig: to as Key, customSvg: { html: BAD_DEST_SVG } });
    this.cg.setAutoShapes(out);
  }

  /** Set the position. `movable` = which colour the user may move (null = view only). */
  set(fen: string, o: { lastMove?: [string, string]; movable?: 'white' | 'black' | 'both' | null; orientation?: 'white' | 'black' } = {}) {
    this.fen = fen;
    const g = new Chess(fen);
    const movable = o.movable ?? null;
    const flipped = o.orientation && o.orientation !== this.cg.state.orientation;
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
    if (flipped) this.redrawOverlay(false);
  }

  get currentFen() {
    return this.fen;
  }

  get orientation(): 'white' | 'black' {
    return this.cg.state.orientation;
  }

  setOrientation(o: 'white' | 'black') {
    this.cg.set({ orientation: o });
    this.redrawOverlay(false);
  }

  flip() {
    this.cg.toggleOrientation();
    this.redrawOverlay(false);
  }

  /** Show lesson-style annotations (square highlights + arrows). */
  annotate(a?: Annotations, extra: DrawShape[] = []) {
    this.highlights = new Map();
    for (const hl of a?.highlights ?? []) this.highlights.set(hl.sq as Key, `hl-${hl.mark}`);
    this.shapes = (a?.arrows ?? []).map((ar) => ({ orig: ar.from as Key, dest: ar.to as Key, brush: ar.mark }));
    this.cg.set({ highlight: { custom: this.highlights } });
    this.extra = extra;
    this.redrawOverlay(true);
  }

  /** Replace the transient arrows (kept on top of any lesson annotations). New arrows animate in. */
  arrows(shapes: DrawShape[]) {
    this.extra = shapes;
    this.redrawOverlay(true);
  }

  /** Square highlights by CSS class suffix, e.g. { e4: 'green' } → `hl-green`. */
  highlight(map: Record<string, string>) {
    this.highlights = new Map(Object.entries(map).map(([k, v]) => [k as Key, `hl-${v}`]));
    this.cg.set({ highlight: { custom: this.highlights } });
  }

  clearAnnotations() {
    this.annotate(undefined);
  }

  /** Chess.com-style classification badge on the top-right corner of a square (null clears it). */
  badge(sq: string | null, cls?: MoveClass) {
    this.badgeEl?.remove();
    this.badgeEl = null;
    this.badgeAt = sq && cls ? { sq, cls } : null;
    if (!this.badgeAt) return;
    const { x, y } = this.xy(this.badgeAt.sq);
    this.badgeEl = h('div.sq-badge', { style: `left:${((x + 1) / 8) * 100}%;top:${(y / 8) * 100}%` }, classBadge(this.badgeAt.cls));
    this.el.append(this.badgeEl);
  }

  /** Briefly pulse squares (e.g. a hanging piece, or the squares a knight attacks). */
  flash(squares: string[], color: 'red' | 'green' | 'blue' | 'yellow' = 'yellow', ms = 1600) {
    for (const sq of squares) {
      const { x, y } = this.xy(sq);
      const el = h(`div.sq-flash.${color}`, { style: `left:${(x / 8) * 100}%;top:${(y / 8) * 100}%;animation-duration:${ms}ms` });
      this.el.append(el);
      this.flashEls.push(el);
      setTimeout(() => {
        el.remove();
        this.flashEls = this.flashEls.filter((e) => e !== el);
      }, ms);
    }
  }

  /** Animate a sequence of SAN moves from `startFen`, one by one, optionally drawing each move's arrow first.
   *  Resolves true when finished, false when aborted. The board is view-only while playing. */
  async playLine(startFen: string, sans: string[], o: PlayLineOptions = {}): Promise<boolean> {
    const delay = o.delay ?? 950;
    const g = new Chess(startFen);
    if (this.fen !== startFen) this.set(startFen);
    for (let i = 0; i < sans.length; i++) {
      if (o.signal?.aborted) return false;
      let m: Move;
      try {
        m = g.move(sans[i]);
      } catch {
        return false;
      }
      if (o.arrows !== false) {
        this.arrows([{ orig: m.from as Key, dest: m.to as Key, brush: o.brush ?? (i % 2 === 0 ? 'green' : 'paleBlue') }]);
        await sleep(Math.min(420, delay / 2), o.signal);
        if (o.signal?.aborted) return false;
      }
      this.arrows([]);
      this.set(g.fen(), { lastMove: [m.from, m.to] });
      playSound(g.inCheck() ? 'check' : m.captured ? 'capture' : 'move');
      o.onStep?.(i, m, g.fen());
      if (i < sans.length - 1) await sleep(delay, o.signal);
    }
    return !o.signal?.aborted;
  }

  private xy(sq: string): { x: number; y: number } {
    const f = sq.charCodeAt(0) - 97;
    const r = Number(sq[1]) - 1;
    return this.cg.state.orientation === 'white' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
  }

  private redrawOverlay(animate: boolean) {
    const all = [...this.shapes, ...this.extra];
    const keys = new Set(all.map(shapeKey));
    this.fx.replaceChildren();
    for (const s of all) {
      const fresh = animate && !this.shown.has(shapeKey(s)) && settings().animation;
      this.fx.append(s.dest && s.dest !== s.orig ? this.arrowEl(s.orig, s.dest, s.brush ?? 'green', fresh) : this.circleEl(s.orig, s.brush ?? 'green', fresh));
    }
    this.shown = keys;
    if (this.badgeAt) this.badge(this.badgeAt.sq, this.badgeAt.cls);
  }

  private circleEl(sq: string, brush: string, fresh: boolean): SVGElement {
    const { x, y } = this.xy(sq);
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(x + 0.5));
    c.setAttribute('cy', String(y + 0.5));
    c.setAttribute('r', '0.44');
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', BRUSH[brush] ?? brush);
    c.setAttribute('stroke-width', '0.08');
    c.setAttribute('pathLength', '1');
    if (fresh) c.setAttribute('class', 'draw');
    return c;
  }

  /** Thick chess.com-style arrow; knight moves are drawn as an "L" (long leg first). */
  private arrowEl(from: string, to: string, brush: string, fresh: boolean): SVGElement {
    const a = this.xy(from);
    const b = this.xy(to);
    const ax = a.x + 0.5, ay = a.y + 0.5, bx = b.x + 0.5, by = b.y + 0.5;
    const dx = bx - ax, dy = by - ay;
    const knight = (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
    const pts: [number, number][] = [[ax, ay]];
    if (knight) pts.push(Math.abs(dx) > Math.abs(dy) ? [bx, ay] : [ax, by]);
    // last segment ends at the base of the head
    const [px, py] = pts[pts.length - 1];
    const len = Math.hypot(bx - px, by - py);
    const ux = (bx - px) / len, uy = (by - py) / len;
    const head = 0.36, half = 0.27, tip = 0.08;
    const tx = bx - ux * tip, ty = by - uy * tip;
    const baseX = tx - ux * head, baseY = ty - uy * head;
    pts.push([baseX, baseY]);
    const color = BRUSH[brush] ?? brush;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', fresh ? 'arrow draw' : 'arrow');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M' + pts.map((p) => p.map((n) => n.toFixed(3)).join(' ')).join(' L'));
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '0.2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linejoin', 'miter');
    path.setAttribute('pathLength', '1');
    const tri = document.createElementNS(NS, 'polygon');
    tri.setAttribute('points', [[tx, ty], [baseX - uy * half, baseY + ux * half], [baseX + uy * half, baseY - ux * half]].map((p) => p.map((n) => n.toFixed(3)).join(',')).join(' '));
    tri.setAttribute('fill', color);
    g.append(path, tri);
    return g;
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
    playSound(new Chess(fenAfter).inCheck() ? 'check' : captured ? 'capture' : 'move');
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
