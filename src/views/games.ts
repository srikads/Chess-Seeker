import { Chess } from 'chess.js';
import { h, modal } from '../ui/dom';
import { listGames, deleteGame, type GameRecord } from '../store/db';
import { trackStudy } from '../store/tracker';
import { go, type View } from '../router';

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

export async function gamesView(): Promise<View> {
  trackStudy(null);
  const games = await listGames();
  const outcome = (g: GameRecord) => {
    if (g.result === '1/2-1/2') return ['draw', '½'];
    const won = (g.result === '1-0' && g.userColor === 'white') || (g.result === '0-1' && g.userColor === 'black');
    return won ? ['win', 'W'] : ['loss', 'L'];
  };
  const el = h(
    'div.page',
    h('h1', 'My games'),
    games.length ? null : h('div.card', h('p', 'No games yet.'), h('a.btn.primary', { href: '#/play' }, 'Play your first game')),
    h(
      'div.game-list',
      games.map((g) => {
        const [cls, badge] = outcome(g);
        const acc = g.accuracy ? (g.userColor === 'black' ? g.accuracy.black : g.accuracy.white) : null;
        return h(
          'div.game-item',
          h(`span.result.${cls}`, badge),
          h(
            'div.grow',
            { onclick: () => go(`/review/${g.id}`) },
            h('strong', g.userColor === 'white' ? g.black : g.white),
            h('small', `${new Date(g.date).toLocaleString()} · ${g.timeControl === 'none' ? 'untimed' : g.timeControl} · ${Math.ceil(g.sans.length / 2)} moves · ${g.termination}`),
            acc !== null ? h('small', `Your accuracy ${acc}%`) : h('small.muted', 'Not reviewed yet'),
          ),
          h('button.icon-btn', { 'aria-label': 'Download PGN', onclick: () => download(`chess-seeker-${g.id}.pgn`, toPgn(g)) }, '⤓'),
          h('button.icon-btn', {
            'aria-label': 'Delete game',
            onclick: async () => {
              if ((await modal('Delete game?', 'This cannot be undone.', [{ label: 'Delete', value: 'y', primary: true }, { label: 'Cancel', value: 'n' }])) === 'y') {
                await deleteGame(g.id!);
                go('/games');
              }
            },
          }, '🗑'),
        );
      }),
    ),
  );
  return { el };
}
