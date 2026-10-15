// "More" hub: everything that isn't one of the four main tabs.
import { h } from '../ui/dom';
import { pageHeader, tile } from '../ui/widgets';
import type { View } from '../router';

export function moreView(): View {
  const el = h(
    'div.more',
    pageHeader('More'),
    h('div.tiles', tile({ href: '/courses', icon: 'book', title: 'Courses', sub: '30 opening & skill courses: learn, then practice from memory', color: '#81b64c' })),
    h('h3', 'Your games'),
    h(
      'div.tiles',
      tile({ href: '/games', icon: 'games', title: 'Game Review', sub: 'Replay your games with the coach', color: '#81b64c' }),
      tile({ href: '/import', icon: 'upload', title: 'Import a game', sub: 'Paste a PGN from chess.com, lichess…', color: '#5aa6e6' }),
      tile({ href: '/insights', icon: 'chart', title: 'Insights', sub: 'Accuracy, openings, mistakes and trends', color: '#a57fe0' }),
    ),
    h('h3', 'Tools'),
    h(
      'div.tiles',
      tile({ href: '/analysis', icon: 'analysis', title: 'Analysis board', sub: 'Explore any position with the engine', color: '#e8964a' }),
      tile({ href: '/openings', icon: 'book', title: 'Openings', sub: 'Explorer and repertoire trainer', color: '#c8a26b' }),
      tile({ href: '/settings', icon: 'settings', title: 'Settings', sub: 'Board, sounds, coach, backup', color: '#8b8987' }),
    ),
  );
  return { el, title: 'More' };
}
