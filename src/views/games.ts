// Game History: every game played or imported on this device, chess.com style.
import { Chess } from 'chess.js';
import { h, modal } from '../ui/dom';
import { icon } from '../ui/icons';
import { mascot } from '../ui/coach';
import { userAvatar } from '../ui/avatars';
import { BOT_AVATAR } from '../ui/avatars';
import { pageHeader } from '../ui/widgets';
import { BOTS } from '../engine/bots';
import { displayName } from '../chess/coach';
import { ratingInName } from '../chess/performance';
import { listGames, deleteGame, type GameRecord } from '../store/db';
import { removeGameCards, dueCount } from '../store/mistakes';
import { trackStudy } from '../store/tracker';
import { go, type View } from '../router';
import '../styles/review.css';

export function toPgn(g: GameRecord): string {
  const c = new Chess(g.startFen);
  for (const s of g.sans) c.move(s);
  const d = new Date(g.date);
  c.setHeader('Event', 'Chess Seeker game');
  c.setHeader('Date', `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`);
  c.setHeader('White', g.white);
  c.setHeader('Black', g.black);
  c.setHeader('Result', g.result);
  c.setHeader('TimeControl', g.timeControl);
  c.setHeader('Termination', g.termination);
  return c.pgn();
}

/** Save a text file locally (the file stays on the device). */
export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  (a as HTMLAnchorElement).click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download-arrow icon (kept local so the shared icon set stays untouched). */
export function downloadIcon(): SVGSVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('class', 'icon');
  el.innerHTML = '<path d="M11 4v8.2L7.4 8.6 6 10l6 6 6-6-1.4-1.4-3.6 3.6V4zm-6 14h14v2H5z" fill="currentColor"/>';
  return el;
}

function trashIcon(): SVGSVGElement {
  const el = downloadIcon();
  el.innerHTML = '<path d="M9 3h6l1 2h4v2H4V5h4zm-3 5h12l-1 13H7zm4 3v7h1.6v-7zm2.4 0v7H14v-7z" fill="currentColor"/>';
  return el;
}

type Outcome = 'win' | 'loss' | 'draw' | 'none';

function outcome(g: GameRecord): Outcome {
  if (g.result === '*') return 'none';
  if (g.result === '1/2-1/2') return 'draw';
  if (g.userColor === 'both') return 'none';
  const won = (g.result === '1-0' && g.userColor === 'white') || (g.result === '0-1' && g.userColor === 'black');
  return won ? 'win' : 'loss';
}

const RESULT_GLYPH: Record<Outcome, string> = {
  win: '<path d="M6 12.5 10 16.5 18 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  loss: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  draw: '<path d="M7 10h10M7 14h10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  none: '<circle cx="12" cy="12" r="2.5" fill="#fff"/>',
};

function resultSquare(o: Outcome): HTMLElement {
  const el = h(`span.gh-result.${o}`, { 'aria-label': o === 'none' ? 'No result' : o });
  el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${RESULT_GLYPH[o]}</svg>`;
  return el;
}

function avatarFor(name: string): Node {
  const bot = BOTS.find((b) => name.startsWith(b.name));
  if (bot && BOT_AVATAR[bot.avatar]) return BOT_AVATAR[bot.avatar]();
  return h('span.gh-avatar-txt', bot ? bot.avatar : displayName(name).charAt(0).toUpperCase() || '?');
}

function when(ts: number): string {
  const d = new Date(ts);
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 1 && new Date().getDate() === d.getDate()) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function gamesView(): Promise<View> {
  trackStudy(null);
  const [games, due] = await Promise.all([listGames(), dueCount().catch(() => 0)]);

  const row = (g: GameRecord) => {
    const o = outcome(g);
    const both = g.userColor === 'both';
    const oppSide = g.userColor === 'white' ? 'black' : 'white';
    const opp = both ? `${displayName(g.white)} vs ${displayName(g.black)}` : displayName(g[oppSide]);
    const oppRating = both ? null : ratingInName(g[oppSide]);
    const mine = g.accuracy && !both ? g.accuracy[g.userColor as 'white' | 'black'] : null;
    const theirs = g.accuracy && !both ? g.accuracy[oppSide] : null;
    const tc = g.timeControl === 'none' ? 'Untimed' : g.timeControl.replace('+', ' | ');
    return h(
      'div.gh-row',
      { role: 'link', tabindex: 0, onclick: () => go(`/review/${g.id}`), onkeydown: (e: KeyboardEvent) => e.key === 'Enter' && go(`/review/${g.id}`) },
      resultSquare(o),
      h('div.gh-avatar', both ? userAvatar() : avatarFor(g[oppSide])),
      h(
        'div.gh-main',
        h('div.gh-name', h('span.gh-color', { class: both ? '' : g.userColor === 'white' ? 'w' : 'b', title: both ? '' : `You played ${g.userColor}` }), opp, oppRating ? h('span.gh-rating', `(${oppRating})`) : null),
        h('div.gh-meta', `${tc} · ${Math.ceil(g.sans.length / 2)} moves · ${when(g.date)}`, g.source && g.source !== 'Imported PGN' ? ` · ${g.source}` : g.source ? ' · imported' : ''),
      ),
      h(
        'div.gh-acc',
        mine !== null ? [h('strong', `${Math.round(mine)}`), h('span.muted', `${Math.round(theirs ?? 0)}`)] : g.accuracy ? h('strong', `${Math.round(g.accuracy.white)}/${Math.round(g.accuracy.black)}`) : h('span.gh-new', 'New'),
      ),
      h('button.btn.sm.gh-review', { type: 'button', onclick: (e: Event) => (e.stopPropagation(), go(`/review/${g.id}`)) }, g.accuracy ? 'Review' : 'Analyse'),
      h(
        'div.gh-tools',
        h('button.icon-btn', { type: 'button', 'aria-label': 'Download PGN', onclick: (e: Event) => (e.stopPropagation(), download(`chess-seeker-${g.id}.pgn`, toPgn(g))) }, downloadIcon()),
        h(
          'button.icon-btn',
          {
            type: 'button',
            'aria-label': 'Delete game',
            onclick: async (e: Event) => {
              e.stopPropagation();
              if ((await modal('Delete game?', 'This cannot be undone.', [{ label: 'Delete', value: 'y', primary: true }, { label: 'Cancel', value: 'n' }])) === 'y') {
                await deleteGame(g.id!);
                await removeGameCards(g.id!);
                go('/games');
              }
            },
          },
          trashIcon(),
        ),
      ),
    );
  };

  const el = h(
    'div.page.gh',
    pageHeader('Game History', { back: '/more', right: h('a.btn.sm', { href: '#/import' }, icon('upload'), 'Import') }),
    due > 0
      ? h('a.gh-due', { href: '#/mistakes' }, h('span.gh-due-icon', icon('target')), h('div.grow', h('strong', 'Learn from your mistakes'), h('small', `${due} puzzle${due === 1 ? '' : 's'} from your games ${due === 1 ? 'is' : 'are'} due`)), icon('chevron'))
      : null,
    games.length
      ? h('div.gh-list', h('div.gh-head', h('span', 'Result'), h('span.grow', 'Opponent'), h('span', 'Accuracy'), h('span.gh-head-pad')), games.map(row))
      : h(
          'div.gh-empty',
          mascot('thinking'),
          h('h2', 'No games yet'),
          h('p.muted', 'Play a bot, or import a game from chess.com or lichess. Then I can review it with you, move by move.'),
          h('div.row.wrap.center', h('a.btn.primary', { href: '#/play' }, icon('play'), 'Play a game'), h('a.btn', { href: '#/import' }, icon('upload'), 'Import a PGN')),
        ),
  );
  return { el, title: 'Game History' };
}
