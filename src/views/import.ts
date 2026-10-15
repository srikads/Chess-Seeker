import { Chess } from 'chess.js';
import { h, toast, setChildren } from '../ui/dom';
import { BoardView } from '../ui/board';
import { icon } from '../ui/icons';
import { PlayerCard, materialFromFen, pageHeader } from '../ui/widgets';
import { parsePgn, type ParsedGame } from '../chess/pgn';
import { saveGame, kvGet, kvSet, type GameRecord } from '../store/db';
import { trackStudy } from '../store/tracker';
import { go, type View } from '../router';
import '../styles/review.css';

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
  let cards: { white: PlayerCard; black: PlayerCard } | null = null;

  const textarea = h('textarea.pgn-input', {
    rows: 7,
    placeholder: '[Event "Live Chess"]\n[White "you"]\n[Black "opponent"]\n...\n1. e4 e5 2. Nf3 ...',
    spellcheck: false,
    autocapitalize: 'off',
    autocomplete: 'off',
    'aria-label': 'PGN',
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
  const plyLabel = h('span.ply-label', '');
  const slider = h('input.ply-slider', { type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'Move', oninput: (e: Event) => setPly(Number((e.target as HTMLInputElement).value)) }) as HTMLInputElement;

  function setPly(p: number) {
    ply = Math.max(0, Math.min(p, fens.length - 1));
    board.set(fens[ply], { lastMove: lastMoves[ply] });
    slider.value = String(ply);
    if (parsed) plyLabel.textContent = ply === 0 ? 'Start' : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${parsed.sans[ply - 1]}`;
    if (cards) {
      const m = materialFromFen(fens[ply]);
      cards.white.setCaptured(m.whiteTook, 'black', m.lead);
      cards.black.setCaptured(m.blackTook, 'white', -m.lead);
    }
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
    cards = {
      white: new PlayerCard({ name: baseName(parsed.white), rating: parsed.white.match(/\((\d+)\)$/)?.[1], color: 'white' }),
      black: new PlayerCard({ name: baseName(parsed.black), rating: parsed.black.match(/\((\d+)\)$/)?.[1], color: 'black' }),
    };
    slider.max = String(fens.length - 1);
    renderPreview();
    setPly(fens.length - 1);
  }

  function renderPreview() {
    if (!parsed || !cards) return;
    const p = parsed;
    board.setOrientation(side === 'black' ? 'black' : 'white');
    const flipped = side === 'black';
    const sideBtn = (s: typeof side, label: string, wide = false) =>
      h(`button.btn${side === s ? '.on' : ''}${wide ? '.wide' : ''}`, { type: 'button', 'aria-pressed': String(side === s), onclick: () => ((side = s), renderPreview(), setPly(ply)) }, label);
    const tcLabel = p.timeControl === 'none' ? 'untimed' : p.timeControl.replace('+', ' | ');
    setChildren(
      preview,
      h(
        'div.import-grid',
        h(
          'div',
          cards[flipped ? 'white' : 'black'].el,
          board.el,
          cards[flipped ? 'black' : 'white'].el,
          h(
            'div.rv-ctrl',
            h('button.rv-ctl', { type: 'button', 'aria-label': 'Start', onclick: () => setPly(0) }, icon('first')),
            h('button.rv-ctl', { type: 'button', 'aria-label': 'Previous move', onclick: () => setPly(ply - 1) }, icon('prev')),
            h('button.rv-ctl', { type: 'button', 'aria-label': 'Next move', onclick: () => setPly(ply + 1) }, icon('next')),
            h('button.rv-ctl', { type: 'button', 'aria-label': 'End', onclick: () => setPly(fens.length - 1) }, icon('last')),
          ),
          h('div.row', plyLabel, h('div.grow', slider)),
        ),
        h(
          'div',
          h('div.import-meta', `${p.result} · ${Math.ceil(p.sans.length / 2)} moves · ${tcLabel} · ${p.termination}`, p.headers.Site ? ` · ${p.headers.Site}` : '', p.headers.Date ? ` · ${p.headers.Date}` : ''),
          h('h3', 'Which side were you?'),
          h('div.import-side', sideBtn('white', baseName(p.white)), sideBtn('black', baseName(p.black)), sideBtn('both', 'Neither — just analyse', true)),
          h('button.btn.primary.big', { type: 'button', onclick: () => void doImport() }, 'Import & review'),
          h('p.small.muted', 'The game is saved only on this device. The engine analyses it on your phone.'),
        ),
      ),
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
    toast('Game imported. Analysing…', 'good');
    go(`/review/${id}`);
  }

  const el = h(
    'div.page.import',
    pageHeader('Import a game', { back: '/games' }),
    h('div.import-help', icon('upload'), h('div', 'On chess.com open the game, tap Share, then PGN, then Copy, and paste it here. Lichess and other PGNs work too. The PGN is read on this device; nothing is sent anywhere.')),
    textarea,
    h(
      'div.import-tools',
      h('button.btn.primary', { type: 'button', onclick: doPreview }, 'Preview game'),
      h('label.btn', icon('games'), 'Open .pgn file', fileInput),
      h(
        'button.btn.ghost',
        {
          type: 'button',
          onclick: async () => {
            try {
              textarea.value = await navigator.clipboard.readText();
              doPreview();
            } catch {
              toast('Paste with long-press → Paste instead', 'info');
            }
          },
        },
        'Paste',
      ),
    ),
    error,
    preview,
  );
  textarea.addEventListener('paste', () => setTimeout(doPreview, 0));
  return { el, title: 'Import a game', destroy: () => board.destroy() };
}
