import { Chess } from 'chess.js';
import { h, toast, setChildren } from '../ui/dom';
import { BoardView } from '../ui/board';
import { parsePgn, type ParsedGame } from '../chess/pgn';
import { saveGame, kvGet, kvSet, type GameRecord } from '../store/db';
import { trackStudy } from '../store/tracker';
import { go, type View } from '../router';

const NAMES_KEY = 'myUsernames';

/** Paste (or pick a file with) a PGN from chess.com, lichess or anywhere; preview it; import it for review. */
export async function importView(): Promise<View> {
  trackStudy('play');
  const myNames = await kvGet<string[]>(NAMES_KEY, []);
  const board = new BoardView();
  let parsed: ParsedGame | null = null;
  let fens: string[] = [];
  let lastMoves: ([string, string] | undefined)[] = [];
  let ply = 0;
  let side: 'white' | 'black' | 'both' = 'white';

  const textarea = h('textarea.pgn-input', {
    rows: 8,
    placeholder: '[Event "Live Chess"]\n[White "you"]\n[Black "opponent"]\n...\n1. e4 e5 2. Nf3 ...',
    spellcheck: false,
    autocapitalize: 'off',
    autocomplete: 'off',
  }) as HTMLTextAreaElement;
  const error = h('div');
  const preview = h('div.import-preview');
  const fileInput = h('input', {
    type: 'file',
    accept: '.pgn,text/plain,application/x-chess-pgn',
    hidden: true,
    onchange: async (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      textarea.value = await f.text();
      doPreview();
    },
  });

  const baseName = (s: string) => s.replace(/\s*\(\d+\)$/, '');

  function setPly(p: number) {
    ply = Math.max(0, Math.min(p, fens.length - 1));
    board.set(fens[ply], { lastMove: lastMoves[ply] });
    const slider = preview.querySelector('input[type=range]') as HTMLInputElement | null;
    if (slider) slider.value = String(ply);
    const label = preview.querySelector('.ply-label');
    if (label && parsed) label.textContent = ply === 0 ? 'Start' : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${parsed.sans[ply - 1]}`;
  }

  function doPreview() {
    error.replaceChildren();
    try {
      parsed = parsePgn(textarea.value);
    } catch (e) {
      parsed = null;
      preview.replaceChildren();
      error.replaceChildren(h('div.banner.bad', (e as Error).message));
      return;
    }
    const g = new Chess(parsed.startFen);
    fens = [g.fen()];
    lastMoves = [undefined];
    for (const s of parsed.sans) {
      const m = g.move(s);
      fens.push(g.fen());
      lastMoves.push([m.from, m.to]);
    }
    // Guess which side the user played from usernames remembered on this device.
    const w = baseName(parsed.white).toLowerCase();
    const b = baseName(parsed.black).toLowerCase();
    const known = myNames.map((n) => n.toLowerCase());
    side = known.includes(b) && !known.includes(w) ? 'black' : known.includes(w) ? 'white' : side;
    renderPreview();
    setPly(fens.length - 1);
  }

  function renderPreview() {
    if (!parsed) return;
    const p = parsed;
    board.setOrientation(side === 'black' ? 'black' : 'white');
    const sideChip = (s: typeof side, label: string) =>
      h(`button.chip${side === s ? '.on' : ''}`, { onclick: () => ((side = s), renderPreview(), setPly(ply)) }, label);
    const tcLabel = p.timeControl === 'none' ? 'untimed' : p.timeControl.replace('+', ' | ');
    setChildren(
      preview,
      h('div.card.game-summary',
        h('div.row.between', h('strong', `⚪ ${p.white}`), h('span.pill', p.result)),
        h('div.row.between', h('strong', `⚫ ${p.black}`), h('span.small.muted', `${Math.ceil(p.sans.length / 2)} moves · ${tcLabel} · ${p.termination}`)),
        p.headers.Site ? h('small', `${p.headers.Site}${p.headers.Date ? ' · ' + p.headers.Date : ''}`) : null,
      ),
      board.el,
      h('div.demo-ctrl',
        h('button.btn', { 'aria-label': 'Start', onclick: () => setPly(0) }, '⏮'),
        h('button.btn', { 'aria-label': 'Previous move', onclick: () => setPly(ply - 1) }, '◀'),
        h('span.ply-label.counter.grow', ''),
        h('button.btn', { 'aria-label': 'Next move', onclick: () => setPly(ply + 1) }, '▶'),
        h('button.btn', { 'aria-label': 'End', onclick: () => setPly(fens.length - 1) }, '⏭'),
      ),
      h('input.ply-slider', { type: 'range', min: '0', max: String(fens.length - 1), value: String(ply), 'aria-label': 'Move', oninput: (e: Event) => setPly(Number((e.target as HTMLInputElement).value)) }),
      h('h3', 'Which side were you?'),
      h('div.chips', sideChip('white', `⚪ ${baseName(p.white)}`), sideChip('black', `⚫ ${baseName(p.black)}`), sideChip('both', 'Neither — just analyse')),
      h('button.btn.primary.big', { onclick: () => void doImport() }, '🔍 Import & review'),
      h('p.small.muted', 'The game is saved only on this device. Stockfish analyses it on your phone.'),
    );
  }

  async function doImport() {
    if (!parsed) return;
    const p = parsed;
    const rec: GameRecord = {
      date: p.date,
      white: p.white,
      black: p.black,
      userColor: side,
      timeControl: p.timeControl,
      result: p.result,
      termination: p.termination,
      startFen: p.startFen,
      sans: p.sans,
      times: [],
      pure: true,
      hintsUsed: 0,
      source: p.headers.Site || 'Imported PGN',
    };
    if (side !== 'both') {
      const me = baseName(side === 'white' ? p.white : p.black);
      if (me && !myNames.includes(me)) await kvSet(NAMES_KEY, [...myNames, me].slice(-5));
    }
    const id = await saveGame(rec);
    toast('Game imported — analysing…', 'good');
    go(`/review/${id}`);
  }

  const el = h(
    'div.page.import',
    h('header.lesson-head', h('a.icon-btn', { href: '#/games', 'aria-label': 'Back' }, '‹'), h('div.grow', h('h2', 'Import a game'))),
    h('p.muted.small', 'On chess.com open the game → Share (⤴) → PGN → Copy, then paste it here. Lichess and other PGNs work too. Nothing is sent anywhere — the PGN is read on this device.'),
    textarea,
    h('div.row.wrap', h('button.btn.primary', { onclick: doPreview }, 'Preview game'), h('label.btn', '📄 Open .pgn file', fileInput), h('button.btn.ghost', { onclick: async () => { try { textarea.value = await navigator.clipboard.readText(); doPreview(); } catch { toast('Paste with long-press → Paste instead', 'info'); } } }, '📋 Paste')),
    error,
    preview,
  );
  textarea.addEventListener('paste', () => setTimeout(doPreview, 0));
  return { el, destroy: () => board.destroy() };
}
