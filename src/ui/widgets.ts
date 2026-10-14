// Shared chess.com-style building blocks: player cards, move list, eval bar, page header, segmented tabs.
import type { MoveClass } from '../chess/classify';
import { h, fmtClock } from './dom';
import { classBadge, icon, type IconName } from './icons';
import { BOT_AVATAR } from './avatars';

const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'] as const;
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ROLE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** Player strip above/below the board: avatar, name, rating, captured pieces + material lead, clock. */
export class PlayerCard {
  readonly el: HTMLElement;
  private nameEl: HTMLElement;
  private capsEl: HTMLElement;
  private clockEl: HTMLElement;
  private avatarEl: HTMLElement;

  constructor(o: { name: string; rating?: number | string; avatar?: string | Node; color: 'white' | 'black'; clock?: boolean }) {
    this.avatarEl = h('div.pc-avatar');
    this.setAvatar(o.avatar, o.color);
    this.nameEl = h('div.pc-name', o.name, o.rating !== undefined ? h('span.pc-rating', `(${o.rating})`) : null);
    this.capsEl = h('div.pc-caps.cg-wrap');
    this.clockEl = h(`div.pc-clock.${o.color}`, o.clock ? '' : null);
    if (!o.clock) this.clockEl.hidden = true;
    this.el = h('div.player-card', this.avatarEl, h('div.pc-info', this.nameEl, this.capsEl), this.clockEl);
  }

  setAvatar(a: string | Node | undefined, color: 'white' | 'black') {
    if (a instanceof Node) this.avatarEl.replaceChildren(a);
    else if (a && BOT_AVATAR[a]) this.avatarEl.replaceChildren(BOT_AVATAR[a]());
    else this.avatarEl.replaceChildren(h(`div.pc-default.${color}`, a ?? ''));
  }

  setName(name: string, rating?: number | string) {
    this.nameEl.replaceChildren(name, rating !== undefined ? h('span.pc-rating', `(${rating})`) : '');
  }

  /** `captured` = pieces this player has taken (lowercase letters), `lead` = material advantage (>0 shows +N). */
  setCaptured(captured: string[], capturedColor: 'white' | 'black', lead: number) {
    const sorted = [...captured].sort((a, b) => PIECE_ORDER.indexOf(a as never) - PIECE_ORDER.indexOf(b as never));
    const groups: HTMLElement[] = [];
    let i = 0;
    while (i < sorted.length) {
      const t = sorted[i];
      const grp = h('span.cap-group');
      while (sorted[i] === t) grp.append(h(`piece.${ROLE[t]}.${capturedColor}`)), i++;
      groups.push(grp);
    }
    this.capsEl.replaceChildren(...groups, lead > 0 ? h('span.cap-lead', `+${lead}`) : '');
  }

  setClock(ms: number | null, active = false) {
    if (ms === null) {
      this.clockEl.hidden = true;
      return;
    }
    this.clockEl.hidden = false;
    this.clockEl.textContent = fmtClock(ms);
    this.clockEl.classList.toggle('active', active);
    this.clockEl.classList.toggle('low', active && ms < 20000);
  }

  setTurn(on: boolean) {
    this.el.classList.toggle('turn', on);
  }
}

/** Material balance helper: captured lists from a FEN-like piece count. */
export function materialFromFen(fen: string): { whiteTook: string[]; blackTook: string[]; lead: number } {
  const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const board = fen.split(' ')[0];
  const cnt = (ch: string) => [...board].filter((c) => c === ch).length;
  const whiteTook: string[] = [];
  const blackTook: string[] = [];
  let lead = 0;
  for (const t of Object.keys(start)) {
    const w = cnt(t.toUpperCase());
    const b = cnt(t);
    for (let k = 0; k < Math.max(0, start[t] - b); k++) whiteTook.push(t);
    for (let k = 0; k < Math.max(0, start[t] - w); k++) blackTook.push(t);
    lead += (w - b) * VALUE[t];
  }
  return { whiteTook, blackTook, lead };
}

export interface MoveListItem {
  san: string;
  cls?: MoveClass;
}

/** Two-column move list (chess.com mobile style is a horizontal strip; we show a strip on phones and a table on desktop). */
export class MoveList {
  readonly el: HTMLElement;
  private items: MoveListItem[] = [];
  private cur = -1;

  constructor(private onPick: (ply: number) => void, private o: { startPly?: number; strip?: boolean } = {}) {
    this.el = h(`div.mlist${o.strip === false ? '' : '.strip'}`);
  }

  /** ply index i = the (i)th move (0-based). `cur` = index of the highlighted move, −1 = start. */
  render(items: MoveListItem[], cur: number) {
    this.items = items;
    this.cur = cur;
    const start = this.o.startPly ?? 0;
    const frag: Node[] = [];
    for (let i = 0; i < items.length; i++) {
      const plyNo = start + i;
      if (plyNo % 2 === 0 || i === 0) frag.push(h('span.ml-no', `${Math.floor(plyNo / 2) + 1}.${plyNo % 2 ? '..' : ''}`));
      const it = items[i];
      frag.push(
        h(
          `button.ml-mv${i === cur ? '.on' : ''}${it.cls ? `.c-${it.cls}` : ''}`,
          { type: 'button', onclick: () => this.onPick(i) },
          it.cls && it.cls !== 'good' && it.cls !== 'excellent' && it.cls !== 'best' ? classBadge(it.cls) : null,
          it.san,
        ),
      );
    }
    this.el.replaceChildren(...frag);
    this.el.querySelector('.ml-mv.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  select(cur: number) {
    this.render(this.items, cur);
  }

  get current() {
    return this.cur;
  }
}

/** Vertical eval bar (White at the bottom unless flipped). `cp` White POV; mate folded to ±10000. */
export class EvalBar {
  readonly el: HTMLElement;
  private fill: HTMLElement;
  private label: HTMLElement;

  constructor() {
    this.fill = h('div.eb-fill');
    this.label = h('div.eb-label');
    this.el = h('div.evalbar2', this.fill, this.label);
  }

  set(cp: number, mate: number | null, flipped = false) {
    const pct = mate !== null ? (mate > 0 || (mate === 0 && cp > 0) ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
    this.fill.style.height = `${Math.max(0, Math.min(100, pct))}%`;
    this.el.classList.toggle('flipped', flipped);
    const white = pct >= 50;
    this.label.textContent = mate !== null && mate !== 0 ? `M${Math.abs(mate)}` : Math.abs(cp) >= 10000 ? '#' : (Math.abs(cp) / 100).toFixed(1);
    this.label.classList.toggle('on-white', white);
  }
}

/** Page header with optional back button. */
export function pageHeader(title: string, o: { back?: string; sub?: string; icon?: IconName; right?: Node } = {}): HTMLElement {
  return h(
    'header.page-head',
    o.back ? h('a.icon-btn.back', { href: `#${o.back}`, 'aria-label': 'Back' }, icon('back')) : null,
    o.icon ? h('span.ph-icon', icon(o.icon)) : null,
    h('div.grow', h('h1', title), o.sub ? h('div.ph-sub', o.sub) : null),
    o.right ?? null,
  );
}

/** Segmented control (tabs). */
export function segmented<T extends string>(opts: { value: T; label: string }[], value: T, onChange: (v: T) => void): HTMLElement {
  const el = h('div.segmented', { role: 'tablist' });
  const render = (v: T) =>
    el.replaceChildren(
      ...opts.map((o) =>
        h(`button${o.value === v ? '.on' : ''}`, { type: 'button', role: 'tab', 'aria-selected': String(o.value === v), onclick: () => (render(o.value), onChange(o.value)) }, o.label),
      ),
    );
  render(value);
  return el;
}

/** Big tappable tile used on hub pages (Home / More / Puzzles). */
export function tile(o: { href?: string; onclick?: () => void; icon: IconName; title: string; sub?: string; color?: string; badge?: string }): HTMLElement {
  return h(
    o.href ? 'a.tile' : 'button.tile',
    { href: o.href ? `#${o.href}` : undefined, type: o.href ? undefined : 'button', onclick: o.onclick, style: o.color ? `--tile:${o.color}` : undefined },
    h('span.tile-icon', icon(o.icon)),
    h('span.tile-text', h('strong', o.title), o.sub ? h('small', o.sub) : null),
    o.badge ? h('span.tile-badge', o.badge) : null,
    h('span.tile-chev', icon('chevron')),
  );
}
