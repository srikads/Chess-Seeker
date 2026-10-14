// Original SVG avatars for bots and the player. Keyed by `Bot.avatar` id.
import { h } from './dom';

const NS = 'http://www.w3.org/2000/svg';

/** Simple face-on-a-tile avatar generator: background colour + optional inner SVG markup (100×100 grid). */
export function tileAvatar(bg: string, inner: string, label: string): SVGSVGElement {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', '0 0 100 100');
  el.setAttribute('class', 'avatar-svg');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
  el.innerHTML = `<rect width="100" height="100" rx="14" fill="${bg}"/>${inner}`;
  return el;
}

/** Registry of bot avatars. Filled in by the bot roster (src/engine/bots.ts). */
export const BOT_AVATAR: Record<string, () => SVGSVGElement> = {};

/** The player's own avatar: a pawn silhouette on the accent colour. */
export function userAvatar(): HTMLElement {
  return h(
    'div.avatar-user',
    tileAvatar('#5d9948', '<circle cx="50" cy="34" r="13" fill="#e8f3dc"/><path d="M36 54h28l-5 9h-18zM32 82c2-10 8-17 18-17s16 7 18 17z" fill="#e8f3dc"/>', 'You'),
  );
}
