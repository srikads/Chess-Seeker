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

// ------------------------------------------------------------------ bot portraits
// Each portrait is a little bust drawn on a 100×100 grid: shoulders, neck, head, then hair/props on top.

const shoulders = (shirt: string, trim = '') => `<path d="M14 100c3-17 17-25 36-25s33 8 36 25z" fill="${shirt}"/>${trim}`;
const neck = (skin: string) => `<path d="M43 64h14v14q-7 4-14 0z" fill="${skin}"/>`;
const head = (skin: string) =>
  `<circle cx="30" cy="49" r="4.5" fill="${skin}"/><circle cx="70" cy="49" r="4.5" fill="${skin}"/>` +
  `<ellipse cx="50" cy="46" rx="21" ry="23" fill="${skin}"/>`;
const eyes = (y = 47, dx = 8, ink = '#2a211b') =>
  `<circle cx="${50 - dx}" cy="${y}" r="2.8" fill="${ink}"/><circle cx="${50 + dx}" cy="${y}" r="2.8" fill="${ink}"/>` +
  `<circle cx="${51 - dx}" cy="${y - 1}" r="0.9" fill="#fff"/><circle cx="${51 + dx}" cy="${y - 1}" r="0.9" fill="#fff"/>`;
const cheeks = (c = '#f19a8e') => `<circle cx="38" cy="55" r="3.6" fill="${c}" opacity="0.55"/><circle cx="62" cy="55" r="3.6" fill="${c}" opacity="0.55"/>`;
const smile = (w = 7, y = 56) => `<path d="M${50 - w} ${y}q${w} ${w * 0.9} ${w * 2} 0" stroke="#5a2f22" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const grin = (y = 55) => `<path d="M42 ${y}h16q-1 8-8 8t-8-8z" fill="#5a2f22"/><path d="M44 ${y}h12v2.5h-12z" fill="#fff"/>`;
const brows = (y = 40, c = '#3b2a20', tilt = 0) =>
  `<path d="M37 ${y + tilt}l9 ${-tilt * 2}M63 ${y + tilt}l-9 ${-tilt * 2}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;

interface Portrait {
  bg: string;
  label: string;
  svg: string;
}

const PORTRAITS: Record<string, Portrait> = {
  // A chick still sitting in half of its eggshell.
  pip: {
    bg: '#8fd3f4',
    label: 'Pip, a baby chick',
    svg:
      '<ellipse cx="50" cy="94" rx="40" ry="10" fill="#7cc4e6"/>' +
      '<ellipse cx="50" cy="56" rx="27" ry="28" fill="#ffd43b"/>' +
      '<path d="M44 30q3-9 7-2 4-7 6 2" stroke="#f2b705" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M26 62q-8 4-6 11 7 1 10-6z" fill="#f2b705"/><path d="M74 62q8 4 6 11-7 1-10-6z" fill="#f2b705"/>' +
      eyes(50, 9) +
      '<path d="M44 56l6 7 6-7z" fill="#f08c00"/>' +
      cheeks('#ff8a65') +
      '<path d="M18 72l7-6 7 6 7-6 7 6 7-6 7 6 7-6 7 6 7-6 3 3v18q-32 12-64 0z" fill="#fffaf0" stroke="#e8dcc4" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M30 86l3-4M64 84l4 3" stroke="#e8dcc4" stroke-width="1.5"/>',
  },
  // Cheerful beginner in a backwards cap.
  rae: {
    bg: '#ffb4a2',
    label: 'Rookie Rae, a cheerful kid in a cap',
    svg:
      shoulders('#4dabf7', '<path d="M42 77l8 8 8-8" stroke="#fff" stroke-width="3" fill="none"/>') +
      neck('#f2c19e') +
      '<path d="M27 46q-4 22 6 30 4-12 2-24zM73 46q4 22-6 30-4-12-2-24z" fill="#8b4a2b"/>' +
      head('#f2c19e') +
      '<path d="M28 42q2-20 22-20t22 20q-10-6-22-6t-22 6z" fill="#e8590c"/>' +
      '<path d="M70 37q12-1 14 6-8 2-15-1z" fill="#d9480f"/>' +
      '<circle cx="50" cy="23" r="2.5" fill="#d9480f"/>' +
      '<path d="M34 40q8-5 14-2" stroke="#8b4a2b" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      eyes(48) +
      cheeks() +
      grin(55),
  },
  // A knight's horse head with a plumed helmet.
  ned: {
    bg: '#63c5b8',
    label: 'Knightly Ned, a horse in a knight helmet',
    svg:
      shoulders('#495057', '<path d="M30 88h40" stroke="#868e96" stroke-width="3"/>') +
      '<path d="M34 84q-6-22 2-42 6-14 20-16 14 2 20 16l6 24q1 7-6 7l-10-2q-4 6-6 13z" fill="#c08552"/>' +
      '<path d="M40 32q-8 12-6 30" stroke="#5c3d2e" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="74" cy="62" rx="10" ry="8" fill="#d9a066"/>' +
      '<circle cx="72" cy="60" r="1.6" fill="#5c3d2e"/><circle cx="78" cy="61" r="1.6" fill="#5c3d2e"/>' +
      '<path d="M44 28q14-12 28 0l2 14H42z" fill="#adb5bd"/><path d="M43 37h31" stroke="#868e96" stroke-width="3"/>' +
      '<path d="M57 17q-8-10 4-13 12 4 4 14" fill="#e03131"/><path d="M58 26v-9" stroke="#adb5bd" stroke-width="3"/>' +
      '<circle cx="62" cy="48" r="3.4" fill="#2a211b"/><circle cx="63" cy="47" r="1" fill="#fff"/>' +
      '<path d="M67 69q4 2 8 0" stroke="#5c3d2e" stroke-width="2" fill="none" stroke-linecap="round"/>',
  },
  // Kind teacher with a tall split hat (shaped like a bishop) and round glasses.
  bea: {
    bg: '#b197fc',
    label: 'Bishop Bea, a teacher in a tall hat',
    svg:
      shoulders('#5f3dc4', '<path d="M50 77v23" stroke="#d0bfff" stroke-width="4"/>') +
      neck('#e0a47a') +
      '<path d="M27 46q-3 26 10 32l4-28zM73 46q3 26-10 32l-4-28z" fill="#f1f3f5"/>' +
      head('#e0a47a') +
      '<path d="M30 34q20-6 40 0q-6-28-20-30-14 2-20 30z" fill="#f8f9fa"/><path d="M54 10l-6 12" stroke="#ced4da" stroke-width="2.5"/>' +
      '<circle cx="50" cy="5" r="3.5" fill="#7048e8"/>' +
      '<path d="M30 34q20-6 40 0v4q-20-6-40 0z" fill="#7048e8"/>' +
      '<circle cx="42" cy="48" r="6" fill="#fff" fill-opacity="0.25" stroke="#343a40" stroke-width="2"/><circle cx="58" cy="48" r="6" fill="#fff" fill-opacity="0.25" stroke="#343a40" stroke-width="2"/><path d="M48 48h4" stroke="#343a40" stroke-width="2"/>' +
      '<circle cx="42" cy="48" r="2.2" fill="#2a211b"/><circle cx="58" cy="48" r="2.2" fill="#2a211b"/>' +
      cheeks() +
      smile(6, 57),
  },
  // A friendly castle tower with a face.
  carl: {
    bg: '#74c0fc',
    label: 'Castle Carl, a friendly castle tower',
    svg:
      '<path d="M0 86q25-8 50-2t50-2v18H0z" fill="#69db7c"/>' +
      '<path d="M26 92V34h48v58z" fill="#ced4da"/>' +
      '<path d="M22 22h12v8h8v-8h16v8h8v-8h12v16H22z" fill="#adb5bd"/>' +
      '<path d="M26 66h48M38 66v26M62 66v26" stroke="#adb5bd" stroke-width="1.5"/>' +
      '<path d="M42 92v-12q8-8 16 0v12z" fill="#7c4a2d"/>' +
      '<rect x="29" y="40" width="42" height="24" rx="8" fill="#e9ecef"/>' +
      eyes(49, 9) +
      smile(6, 55) +
      '<path d="M50 22V6" stroke="#495057" stroke-width="2.5"/><path d="M51 6h14l-4 5 4 5H51z" fill="#fa5252"/>',
  },
  // Sharp-eyed tactician with a headband.
  tia: {
    bg: '#ff8787',
    label: 'Tactician Tia, wearing a headband',
    svg:
      shoulders('#212529', '<path d="M36 80l14 10 14-10" stroke="#fa5252" stroke-width="3" fill="none"/>') +
      neck('#c68b5e') +
      '<path d="M28 44q-4 30 10 36l2-30zM72 44q6 28-4 40l-6-34z" fill="#1c1c1c"/>' +
      head('#c68b5e') +
      '<path d="M28 44q0-24 22-24t22 24q-12-4-18-12-10 10-26 12z" fill="#1c1c1c"/>' +
      '<path d="M28 37q22-8 44 0v6q-22-8-44 0z" fill="#e03131"/>' +
      '<path d="M71 39l12-4-4 8 6 4-14-2z" fill="#e03131"/>' +
      brows(42, '#1c1c1c', 1) +
      eyes(49) +
      '<path d="M44 58q6 3 12-1" stroke="#5a2f22" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  },
  // Chess-club regular with a beret and a scarf.
  cleo: {
    bg: '#8ce99a',
    label: 'Clubber Cleo, in a beret and scarf',
    svg:
      shoulders('#2b8a3e') +
      '<path d="M26 48q-6 18 4 30h40q10-12 4-30z" fill="#3b2314"/>' +
      neck('#8d5524') +
      '<path d="M32 76q18 10 36 0l2 8q-20 10-40 0z" fill="#fcc419"/><path d="M60 82l4 16h-8z" fill="#fab005"/>' +
      head('#8d5524') +
      '<path d="M29 44q0-22 21-22t21 22q-4-10-21-12-17 2-21 12z" fill="#3b2314"/>' +
      '<ellipse cx="46" cy="27" rx="25" ry="9" fill="#c92a2a" transform="rotate(-8 46 27)"/><circle cx="44" cy="17" r="3" fill="#c92a2a"/>' +
      eyes(48, 8, '#1a1a1a') +
      cheeks('#d9480f') +
      smile(7, 56),
  },
  // Thoughtful expert with a beard, glasses and a bow tie.
  eli: {
    bg: '#748ffc',
    label: 'Expert Eli, with glasses and a beard',
    svg:
      shoulders('#364fc7', '<path d="M42 79l8 5 8-5v10l-8-5-8 5z" fill="#fab005"/>') +
      neck('#f1c27d') +
      head('#f1c27d') +
      '<path d="M29 50q2 22 21 24 19-2 21-24-4 6-10 6-5 4-11 4t-11-4q-6 0-10-6z" fill="#868e96"/>' +
      '<path d="M43 59q7 4 14 0" stroke="#5a2f22" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M29 42q2-20 21-20t21 20q-4-8-8-9-6 4-13 4t-13-4q-4 1-8 9z" fill="#adb5bd"/>' +
      '<rect x="35" y="42" width="12" height="10" rx="3" fill="#fff" fill-opacity="0.25" stroke="#212529" stroke-width="2"/><rect x="53" y="42" width="12" height="10" rx="3" fill="#fff" fill-opacity="0.25" stroke="#212529" stroke-width="2"/><path d="M47 46h6" stroke="#212529" stroke-width="2"/>' +
      '<circle cx="41" cy="47" r="2.2" fill="#2a211b"/><circle cx="59" cy="47" r="2.2" fill="#2a211b"/>' +
      brows(38, '#868e96'),
  },
  // Focused young contender with headphones and spiky hair.
  kai: {
    bg: '#ffd43b',
    label: 'Candidate Kai, wearing headphones',
    svg:
      shoulders('#e8590c', '<path d="M50 77v23" stroke="#ffa94d" stroke-width="3"/>') +
      neck('#e8b48a') +
      head('#e8b48a') +
      '<path d="M28 44l-2-14 8 4 2-12 8 8 6-12 6 12 8-8 2 12 8-4-2 14q-10-10-22-10t-22 10z" fill="#343a40"/>' +
      '<path d="M25 48q0-31 25-31t25 31" stroke="#212529" stroke-width="4" fill="none"/>' +
      '<rect x="20" y="42" width="10" height="16" rx="4" fill="#1971c2"/><rect x="70" y="42" width="10" height="16" rx="4" fill="#1971c2"/>' +
      brows(41, '#343a40') +
      eyes(48) +
      '<path d="M45 57h10" stroke="#5a2f22" stroke-width="2.4" stroke-linecap="round"/>',
  },
  // A master with a small crown and long dark hair.
  mira: {
    bg: '#9c36b5',
    label: 'Master Mira, wearing a crown',
    svg:
      '<path d="M24 46q-8 34 4 54h44q12-20 4-54z" fill="#2b1b17"/>' +
      shoulders('#f8f0fc', '<path d="M38 79q12 8 24 0" stroke="#be4bdb" stroke-width="3" fill="none"/>') +
      neck('#c98f65') +
      head('#c98f65') +
      '<path d="M29 46q-1-24 21-24t21 24q-6-12-21-13-15 1-21 13z" fill="#2b1b17"/>' +
      '<path d="M36 28l-2-14 8 6 8-10 8 10 8-6-2 14z" fill="#fcc419" stroke="#f08c00" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="20" r="2.5" fill="#e64980"/>' +
      eyes(48) +
      '<path d="M38 44l-3-2M62 44l3-2" stroke="#2b1b17" stroke-width="1.6" stroke-linecap="round"/>' +
      cheeks('#e64980') +
      smile(6, 57),
  },
  // A robot fish: the full-strength engine.
  stockfish: {
    bg: '#1c3d5a',
    label: 'Stockfish, a robot fish',
    svg:
      '<circle cx="22" cy="24" r="3" fill="#74c0fc" opacity="0.6"/><circle cx="15" cy="36" r="2" fill="#74c0fc" opacity="0.5"/><circle cx="84" cy="18" r="2.5" fill="#74c0fc" opacity="0.5"/>' +
      '<path d="M76 52l18-16v32z" fill="#4dabf7"/>' +
      '<path d="M42 32q8-16 20-6-6 2-8 8z" fill="#4dabf7"/>' +
      '<ellipse cx="48" cy="52" rx="34" ry="24" fill="#a5d8ff"/>' +
      '<path d="M46 74q4 12 13 9-2-7-6-11z" fill="#4dabf7"/>' +
      '<path d="M56 34v36M66 38v28" stroke="#74c0fc" stroke-width="2"/>' +
      '<rect x="20" y="40" width="24" height="13" rx="6" fill="#212529"/><rect x="24" y="44" width="16" height="5" rx="2.5" fill="#20c997"/>' +
      '<path d="M22 62q6 4 12 0" stroke="#1c3d5a" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  },
};

/** Registry of bot avatars, keyed by `Bot.avatar` id. */
export const BOT_AVATAR: Record<string, () => SVGSVGElement> = Object.fromEntries(
  Object.entries(PORTRAITS).map(([id, p]) => [id, () => tileAvatar(p.bg, p.svg, p.label)]),
);

/** Avatar for a bot id (plain tile if unknown). */
export function botAvatar(id: string): SVGSVGElement {
  return BOT_AVATAR[id]?.() ?? tileAvatar('#4b4845', '', id);
}

/** The player's own avatar: a pawn silhouette on the accent colour. */
export function userAvatar(): HTMLElement {
  return h(
    'div.avatar-user',
    tileAvatar('#5d9948', '<circle cx="50" cy="34" r="13" fill="#e8f3dc"/><path d="M36 54h28l-5 9h-18zM32 82c2-10 8-17 18-17s16 7 18 17z" fill="#e8f3dc"/>', 'You'),
  );
}
