import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import './styles/app.css';
import { h } from './ui/dom';
import { route, startRouter, onRoute } from './router';
import { applyTheme, settings, updateSettings } from './store/settings';
import { initTracker } from './store/tracker';
import { initPwa } from './pwa';
import { homeView } from './views/home';
import { learnView } from './views/learn';
import { lessonView } from './views/lesson';
import { puzzlesView } from './views/puzzles';
import { playView } from './views/play';
import { gamesView } from './views/games';
import { reviewView } from './views/review';
import { settingsView } from './views/settings';
import { importView } from './views/import';

applyTheme();

const tabs = [
  { path: '/', icon: '⌂', label: 'Home', match: /^\/$/ },
  { path: '/learn', icon: '🎓', label: 'Learn', match: /^\/(learn|lesson)/ },
  { path: '/puzzles', icon: '🧩', label: 'Puzzles', match: /^\/puzzles/ },
  { path: '/play', icon: '♞', label: 'Play', match: /^\/play/ },
  { path: '/games', icon: '📊', label: 'Games', match: /^\/(games|review|import)/ },
];

const nav = h(
  'nav.tabbar',
  tabs.map((t) => h('a.tab', { href: `#${t.path}`, 'data-path': t.path }, h('span.tab-icon', t.icon), h('span.tab-label', t.label))),
);
const themeBtn = h('button.icon-btn', {
  'aria-label': 'Toggle dark mode',
  onclick: () => {
    updateSettings({ theme: settings().theme === 'dark' ? 'light' : 'dark' });
    applyTheme();
    themeBtn.textContent = settings().theme === 'dark' ? '☀️' : '🌙';
  },
}, settings().theme === 'dark' ? '☀️' : '🌙');
const topbar = h('header.topbar', h('a.brand', { href: '#/' }, h('img', { src: 'icons/icon.svg', alt: '' }), 'Chess Seeker'), h('div.grow'), themeBtn, h('a.icon-btn', { href: '#/settings', 'aria-label': 'Settings' }, '⚙'));

document.getElementById('app')!.replaceChildren(topbar, h('main#main'), nav);

onRoute((path) => {
  nav.querySelectorAll('.tab').forEach((el, i) => el.classList.toggle('on', tabs[i].match.test(path)));
});

route('/', homeView);
route('/learn', learnView);
route('/lesson/:id', lessonView);
route('/puzzles', () => puzzlesView([]));
route('/puzzles/:theme', puzzlesView);
route('/play', playView);
route('/games', gamesView);
route('/review/:id', reviewView);
route('/import', importView);
route('/settings', settingsView);

initTracker();
startRouter();
initPwa();
