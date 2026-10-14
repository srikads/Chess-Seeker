// Original generated course cover art: coloured tile, faded checker corner, small caps title, big label, piece.
import { h } from '../ui/dom';
import type { Course } from '../courses/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Deterministic 0..n-1 from a string, so each course gets its own pattern variant. */
function hash(s: string, n: number): number {
  let x = 0;
  for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return x % n;
}

function checker(variant: number, fg: string): string {
  const sq: string[] = [];
  const n = 5;
  const size = 13;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if ((r + c) % 2) continue;
      // fade towards the inside of the tile
      const o = (0.05 + 0.13 * ((r + c) / (2 * n))).toFixed(3);
      sq.push(`<rect x="${c * size}" y="${r * size}" width="${size}" height="${size}" fill="${fg}" fill-opacity="${o}"/>`);
    }
  const place = [
    'translate(44 44) rotate(-14 32 32)',
    'translate(48 52) rotate(10 32 32)',
    'translate(40 48) rotate(-28 32 32)',
  ][variant];
  return `<g transform="${place}">${sq.join('')}</g>`;
}

/** Cover tile (square). `size` only picks the typography tier; the element scales with its container. */
export function courseCover(c: Course, o: { size?: 'sm' | 'md' | 'lg' } = {}): HTMLElement {
  const { bg, fg, label, sub, piece, pieceColor } = c.cover;
  const v = hash(c.id, 3);
  const fs = label.length <= 2 ? 40 : label.length <= 4 ? 30 : label.length <= 6 ? 23 : 18.5;
  const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="g-${c.id}" cx="20%" cy="10%" r="95%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient></defs>
    <rect width="100" height="100" fill="${bg}"/>
    ${checker(v, fg)}
    <rect width="100" height="100" fill="url(#g-${c.id})"/>
    <text x="8" y="17" font-size="7.4" font-weight="800" letter-spacing=".9" fill="${fg}" fill-opacity=".85" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">${esc(sub.toUpperCase())}</text>
    <text x="7" y="${label.length <= 4 ? 88 : 86}" font-size="${fs}" font-weight="900" letter-spacing="-.5" fill="${fg}" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">${esc(label)}</text>
  </svg>`;
  return h(
    `div.cover.cover-${o.size ?? 'md'}${c.status === 'soon' ? '.is-soon' : ''}`,
    { html: svg },
    piece ? h('span.cover-piece.cg-wrap', h(`piece.${piece}.${pieceColor ?? 'white'}`)) : null,
  );
}
