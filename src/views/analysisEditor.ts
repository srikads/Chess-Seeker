// "Set up position": a simple board editor (piece palette, clear, start position, side to move, FEN box).
// Castling rights are derived from where the kings and rooks stand.
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Color, Key, Piece, Role } from '@lichess-org/chessground/types';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { segmented } from '../ui/widgets';
import { buildFen, deriveCastling, positionError } from '../chess/setup';
import { settings } from '../store/settings';

const ROLES: Role[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const EMPTY = '4k3/8/8/8/8/8/8/4K3';

type Brush = Piece | 'trash' | null;

export function openEditor(fen: string, onDone: (fen: string) => void): void {
  let turn: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  let brush: Brush = null;
  const boardEl = h('div.cg-wrap');
  const wrap = h('div.board-wrap.an-ed-board', boardEl);
  const fenInput = h('input.an-ed-fen', { type: 'text', spellcheck: false, autocomplete: 'off', 'aria-label': 'FEN' }) as HTMLInputElement;
  const status = h('div.an-ed-status');
  const castleEl = h('span.an-ed-castle');
  const go = h('button.btn.primary', { type: 'button', onclick: () => finish() }, icon('analysis'), 'Analyse') as HTMLButtonElement;

  const cg: Api = Chessground(boardEl, {
    fen: fen.split(' ')[0],
    orientation: 'white',
    coordinates: settings().coordinates,
    animation: { enabled: false },
    movable: { free: true, color: 'both', showDests: false },
    draggable: { enabled: true, deleteOnDropOff: true, showGhost: true },
    premovable: { enabled: false },
    highlight: { lastMove: false, check: false },
    events: {
      change: () => sync(),
      select: (key: Key) => paint(key),
    },
  });

  function paint(key: Key) {
    if (!brush) return;
    const current = cg.state.pieces.get(key);
    if (brush === 'trash') cg.setPieces(new Map([[key, undefined]]));
    else if (current && current.role === brush.role && current.color === brush.color) cg.setPieces(new Map([[key, undefined]]));
    else cg.setPieces(new Map([[key, { ...brush }]]));
    cg.selectSquare(null);
    sync();
  }

  function placement() {
    return cg.getFen();
  }

  function sync(fromInput = false) {
    const f = buildFen(placement(), turn);
    if (!fromInput) fenInput.value = f;
    castleEl.textContent = `Castling: ${deriveCastling(placement())}`;
    const err = positionError(f);
    status.textContent = err ?? 'Ready to analyse.';
    status.classList.toggle('bad', !!err);
    go.disabled = !!err;
  }

  function setBrush(b: Brush) {
    brush = b;
    const painting = b !== null;
    cg.set({ movable: { color: painting ? undefined : 'both' }, draggable: { enabled: !painting }, selectable: { enabled: !painting } });
    for (const btn of overlay.querySelectorAll('.an-ed-pal button')) btn.classList.toggle('on', btn.getAttribute('data-b') === key(b));
  }

  const key = (b: Brush) => (b === null ? 'hand' : b === 'trash' ? 'trash' : `${b.color}-${b.role}`);

  const palette = (color: Color) =>
    h(
      'div.an-ed-pal.cg-wrap',
      ROLES.map((role) =>
        h(
          'button',
          { type: 'button', 'data-b': `${color}-${role}`, 'aria-label': `${color} ${role}`, onclick: () => setBrush(brush && brush !== 'trash' && brush.role === role && brush.color === color ? null : { role, color }) },
          h(`piece.${role}.${color}`),
        ),
      ),
      color === 'black'
        ? h('button.tool', { type: 'button', 'data-b': 'hand', 'aria-label': 'Move pieces', title: 'Move pieces', onclick: () => setBrush(null) }, icon('play'))
        : h('button.tool', { type: 'button', 'data-b': 'trash', 'aria-label': 'Remove pieces', title: 'Remove pieces', onclick: () => setBrush('trash') }, icon('close')),
    );

  const turnSeg = segmented(
    [
      { value: 'w', label: 'White to move' },
      { value: 'b', label: 'Black to move' },
    ],
    turn,
    (v) => {
      turn = v as 'w' | 'b';
      sync();
    },
  );

  fenInput.addEventListener('input', () => {
    const v = fenInput.value.trim();
    const parts = v.split(/\s+/);
    if (!/^[1-8pnbrqkPNBRQK/]+$/.test(parts[0] ?? '') || parts[0].split('/').length !== 8) {
      status.textContent = 'Keep typing… that FEN isn\'t complete yet.';
      status.classList.add('bad');
      go.disabled = true;
      return;
    }
    cg.set({ fen: parts[0] });
    if (parts[1] === 'w' || parts[1] === 'b') turn = parts[1];
    sync(true);
  });

  function close() {
    cg.destroy();
    overlay.remove();
    removeEventListener('keydown', onKey);
  }

  function finish() {
    const f = buildFen(placement(), turn);
    if (positionError(f)) return;
    close();
    onDone(f);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  addEventListener('keydown', onKey);

  const overlay = h(
    'div.an-editor',
    { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Set up position' },
    h(
      'div.an-ed-inner',
      h('header.an-ed-head', h('h2', 'Set up position'), h('div.grow'), h('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: () => close() }, icon('close'))),
      h('p.an-ed-tip.muted.small', 'Tap a piece below, then tap squares to place it. Drag pieces to move them, or off the board to remove them.'),
      palette('black'),
      wrap,
      palette('white'),
      turnSeg,
      h(
        'div.an-ed-row',
        h('button.btn.sm', { type: 'button', onclick: () => (cg.set({ fen: START }), sync()) }, icon('replay'), 'Start position'),
        h('button.btn.sm', { type: 'button', onclick: () => (cg.set({ fen: EMPTY }), sync()) }, icon('close'), 'Clear'),
        h('button.btn.sm', { type: 'button', onclick: () => cg.toggleOrientation() }, icon('flip'), 'Flip'),
      ),
      h('label.an-ed-label', 'FEN', castleEl),
      fenInput,
      status,
      h('div.an-ed-row.end', h('button.btn', { type: 'button', onclick: () => close() }, 'Cancel'), go),
    ),
  );
  document.body.append(overlay);
  setBrush(null);
  sync();
  // chessground measures its container: redraw once the overlay is laid out
  requestAnimationFrame(() => cg.redrawAll());
}
