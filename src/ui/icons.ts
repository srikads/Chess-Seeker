// Inline SVG icons (original artwork) — replaces emoji so the UI looks consistent on every phone.
import type { MoveClass } from '../chess/classify';

const NS = 'http://www.w3.org/2000/svg';

function svg(viewBox: string, inner: string, cls: string): SVGSVGElement {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('class', cls);
  el.innerHTML = inner;
  return el;
}

/** Filled glyphs on a 24×24 grid. `currentColor` follows the text colour. */
const PATHS = {
  home: '<path d="M12 3 2.5 11h2.8v9.5h5.2v-6h3v6h5.2V11h2.8z" fill="currentColor"/>',
  play: '<path d="M5 21.5h14v-2.6H5zM6.6 17.6h11.2c.2-3.6-.8-6.3-2.4-8.6.9-.9 1.3-2 1.2-3.2L14 6.4 12.3 3l-1.6 3C7.8 6.6 5.5 8.7 4.6 11.6l2.3 1.6 3.6-1.6c.4 1-.1 2-1.1 2.9-1.3 1-2.3 1.9-2.8 3.1M10.2 7.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" fill="currentColor" fill-rule="evenodd"/>',
  puzzle: '<path d="M10 3.5a2 2 0 0 1 4 0V5h4a1 1 0 0 1 1 1v4h-1.5a2 2 0 0 0 0 4H19v5a1 1 0 0 1-1 1h-4.5v-1.5a2 2 0 0 0-4 0V20H5a1 1 0 0 1-1-1v-5h1.5a2 2 0 0 0 0-4H4V6a1 1 0 0 1 1-1h5z" fill="currentColor"/>',
  learn: '<path d="M12 3 1.5 8.5 12 14l8.5-4.5V16h2V8.5zM5.5 12.6v4.2C7.2 18.8 9.5 20 12 20s4.8-1.2 6.5-3.2v-4.2L12 16z" fill="currentColor"/>',
  more: '<circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/>',
  games: '<path d="M4 3h12l4 4v14H4zm11 1.5V8h3.5zM7 12h10v1.6H7zm0 3.4h10V17H7zm0-6.8h6v1.6H7z" fill="currentColor"/>',
  analysis: '<path d="M10.5 3a7.5 7.5 0 0 1 6 12l4.8 4.8-1.6 1.6-4.8-4.8A7.5 7.5 0 1 1 10.5 3m0 2.2a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6M8 13.5l1.7-3 1.6 1.6L13.4 8l1 .6-2.8 5-1.6-1.6-1.2 2z" fill="currentColor"/>',
  book: '<path d="M4 4.5C6.5 3.5 9.5 3.6 12 5c2.5-1.4 5.5-1.5 8-.5V20c-2.5-1-5.5-.9-8 .5-2.5-1.4-5.5-1.5-8-.5zm2 1.4v11.3c1.7-.3 3.5-.1 5 .6V6.5c-1.5-.7-3.3-.9-5-.6" fill="currentColor"/>',
  target: '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6m0 3a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6m0 2.4a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8" fill="currentColor"/>',
  chart: '<path d="M3 20h18v1.8H3zm1.5-8H8v6.5H4.5zm5.75-6h3.5v12.5h-3.5zM16 9.5h3.5v9H16z" fill="currentColor"/>',
  bolt: '<path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6z" fill="currentColor"/>',
  eye: '<path d="M12 5c5 0 8.7 3.6 10 7-1.3 3.4-5 7-10 7S3.3 15.4 2 12c1.3-3.4 5-7 10-7m0 2.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8m0 2.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4" fill="currentColor"/>',
  shield: '<path d="M12 2 4 5v6.2c0 5 3.4 9.4 8 10.8 4.6-1.4 8-5.8 8-10.8V5zm-1.2 13.6-3.6-3.6 1.5-1.5 2.1 2.1 4.8-4.8 1.5 1.5z" fill="currentColor"/>',
  settings: '<path d="m19.4 13 .1-1-.1-1 2.1-1.7-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6c-.6.3-1.2.6-1.7 1l-2.5-1-2 3.4L6.5 11l-.1 1 .1 1-2.1 1.7 2 3.4 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7" fill="currentColor"/>',
  flip: '<path d="M7 3 3 7l4 4V8h9v3h2V6H7zm10 10v3H8v-3H6v5h11v3l4-4z" fill="currentColor"/>',
  first: '<path d="M5 5h2.4v14H5zm3.6 7L19 5v14z" fill="currentColor"/>',
  prev: '<path d="M16.5 5v14L6 12z" fill="currentColor"/>',
  next: '<path d="M7.5 5v14L18 12z" fill="currentColor"/>',
  last: '<path d="M19 5h-2.4v14H19zM15.4 12 5 5v14z" fill="currentColor"/>',
  hint: '<path d="M12 2a7 7 0 0 1 4 12.7V17H8v-2.3A7 7 0 0 1 12 2m-3 16.5h6V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" fill="currentColor"/>',
  undo: '<path d="M8 5 2.5 10.5 8 16v-4h6.5a3.5 3.5 0 0 1 0 7H11v2.2h3.5a5.7 5.7 0 0 0 0-11.4H8z" fill="currentColor"/>',
  flag: '<path d="M5 2h2v20H5zm3 1h11l-2.5 4.5L19 12H8z" fill="currentColor"/>',
  close: '<path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z" fill="currentColor"/>',
  check: '<path d="m9.5 16.2-4.2-4.2-1.5 1.5 5.7 5.7L20.7 8l-1.5-1.5z" fill="currentColor"/>',
  chevron: '<path d="m9 5.5 1.4-1.4L18.3 12l-7.9 7.9L9 18.5l6.5-6.5z" fill="currentColor"/>',
  back: '<path d="m15 5.5-1.4-1.4L5.7 12l7.9 7.9 1.4-1.4L8.5 12z" fill="currentColor"/>',
  sun: '<path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10M11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z" fill="currentColor"/>',
  moon: '<path d="M14.5 2.5A9.5 9.5 0 1 0 21.5 15 7.5 7.5 0 0 1 14.5 2.5" fill="currentColor"/>',
  play_arrow: '<path d="M7 4.5v15L19.5 12z" fill="currentColor"/>',
  pause: '<path d="M6 4.5h4v15H6zm8 0h4v15h-4z" fill="currentColor"/>',
  replay: '<path d="M12 4V1L7 5.5 12 10V6.2a5.8 5.8 0 1 1-5.8 5.8H4a8 8 0 1 0 8-8" fill="currentColor"/>',
  trophy: '<path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.8V18h3v3H8v-3h3v-3.2A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 1 1.7zm10 0v2.7A2 2 0 0 0 18 8V7z" fill="currentColor"/>',
  fire: '<path d="M12 2s5.5 4.6 5.5 10.2A5.5 5.5 0 0 1 12 22a5.5 5.5 0 0 1-5.5-5.6c0-2.6 1.5-4.4 2.5-5.4 0 1.6.8 2.9 2 3.5C10 11 12 6.5 12 2" fill="currentColor"/>',
  heart: '<path d="M12 21 3.6 12.8A5 5 0 0 1 12 6a5 5 0 0 1 8.4 6.8z" fill="currentColor"/>',
  clock: '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6M11 6h2v5.6l4 2.4-1 1.7-5-3z" fill="currentColor"/>',
  upload: '<path d="M11 16V7.8L7.4 11.4 6 10l6-6 6 6-1.4 1.4L13 7.8V16zm-6 2h14v2H5z" fill="currentColor"/>',
  bot: '<path d="M11 2h2v2.1A7 7 0 0 1 19 11v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6a7 7 0 0 1 6-6.9zm-2 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2 12h2v4H2zm18 0h2v4h-2z" fill="currentColor"/>',
  chat: '<path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2" fill="currentColor"/>',
  volume: '<path d="M3 9h4l5-4.5v15L7 15H3zm12.5-1.6a6 6 0 0 1 0 9.2l-1.4-1.4a4 4 0 0 0 0-6.4z" fill="currentColor"/>',
  move: '<path d="M12 2 8.5 5.5H11V11H5.5V8.5L2 12l3.5 3.5V13H11v5.5H8.5L12 22l3.5-3.5H13V13h5.5v2.5L22 12l-3.5-3.5V11H13V5.5h2.5z" fill="currentColor"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, cls = ''): SVGSVGElement {
  return svg('0 0 24 24', PATHS[name], `icon ${cls}`.trim());
}

/** Chess.com-style move classification: colour + glyph. */
export const CLASS_STYLE: Record<MoveClass, { color: string; glyph: string; label: string }> = {
  brilliant: { color: '#26c2a3', glyph: '!!', label: 'Brilliant' },
  great: { color: '#5c8bb0', glyph: '!', label: 'Great' },
  best: { color: '#81b64c', glyph: '★', label: 'Best' },
  excellent: { color: '#96bc4b', glyph: '👍', label: 'Excellent' },
  good: { color: '#95b776', glyph: '✓', label: 'Good' },
  book: { color: '#a88865', glyph: 'book', label: 'Book' },
  inaccuracy: { color: '#f7c045', glyph: '?!', label: 'Inaccuracy' },
  mistake: { color: '#e58f2a', glyph: '?', label: 'Mistake' },
  miss: { color: '#ee6b55', glyph: '✗', label: 'Miss' },
  blunder: { color: '#ca3431', glyph: '??', label: 'Blunder' },
};

/** Round badge with a white glyph, as drawn on the destination square and in move lists. */
export function classBadge(cls: MoveClass, cls2 = ''): SVGSVGElement {
  const { color, glyph } = CLASS_STYLE[cls];
  let inner: string;
  if (glyph === '★') inner = '<path d="m12 5 2 4.3 4.7.5-3.5 3.2 1 4.6L12 15.3 7.8 17.6l1-4.6-3.5-3.2 4.7-.5z" fill="#fff"/>';
  else if (glyph === '👍') inner = '<path d="M6 11h2.5v7H6zm3.5 0 3-5.2c.9 0 1.5.7 1.4 1.6L13.5 10H17c.9 0 1.5.8 1.3 1.7l-1.1 5c-.2.8-.8 1.3-1.6 1.3H9.5z" fill="#fff"/>';
  else if (glyph === '✓') inner = '<path d="m10.2 15.6-3.4-3.4 1.4-1.4 2 2 5.6-5.6 1.4 1.4z" fill="#fff"/>';
  else if (glyph === '✗') inner = '<path d="m8.5 7.1 3.5 3.5 3.5-3.5 1.4 1.4-3.5 3.5 3.5 3.5-1.4 1.4-3.5-3.5-3.5 3.5-1.4-1.4 3.5-3.5-3.5-3.5z" fill="#fff"/>';
  else if (glyph === 'book') inner = '<path d="M6.5 7.5c1.9-.7 3.8-.5 5.5.6 1.7-1.1 3.6-1.3 5.5-.6v9.3c-1.9-.6-3.8-.4-5.5.6-1.7-1-3.6-1.2-5.5-.6z" fill="#fff"/>';
  else
    inner = `<text x="12" y="16.4" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="${glyph.length > 1 ? 10.5 : 12.5}" fill="#fff" letter-spacing="-0.5">${glyph}</text>`;
  return svg('0 0 24 24', `<circle cx="12" cy="12" r="11" fill="${color}"/><circle cx="12" cy="12" r="11" fill="none" stroke="rgb(0 0 0 / .18)" stroke-width="1"/>${inner}`, `cls-badge ${cls2}`.trim());
}
