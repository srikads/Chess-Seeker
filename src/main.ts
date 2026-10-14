import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import './styles/app.css';
import { h } from './ui/dom';
import { icon, type IconName } from './ui/icons';
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
import { moreView } from './views/more';
import { analysisView } from './views/analysis';
import { openingsView } from './views/openings';
import { drillsView } from './views/drills';
import { rushView } from './views/rush';
import { visionView } from './views/vision';
import { insightsView } from './views/insights';
import { mistakesView } from './views/mistakes';

applyTheme();

const tabs: { path: string; icon: IconName; label: string; match: RegExp }[] = [
  { path: '/', icon: 'home', label: 'Home', match: /^\/$/ },
  { path: '/play', icon: 'play', label: 'Play', match: /^\/play/ },
  { path: '/puzzles', icon: 'puzzle', label: 'Puzzles', match: /^\/(puzzles|rush|mistakes)/ },
  { path: '/learn', icon: 'learn', label: 'Learn', match: /^\/(learn|lesson|openings|drills|vision)/ },
  { path: '/more', icon: 'more', label: 'More', match: /^\/(more|games|review|import|analysis|insights|settings)/ },
];

const nav = h(
  'nav.tabbar',
  tabs.map((t) => h('a.tab', { href: `#${t.path}`, 'data-path': t.path }, icon(t.icon), h('span.tab-label', t.label))),
);
const themeBtn = h('button.icon-btn', {
  'aria-label': 'Toggle dark mode',
  onclick: () => {
    updateSettings({ theme: settings().theme === 'dark' ? 'light' : 'dark' });
    applyTheme();
    themeBtn.replaceChildren(icon(settings().theme === 'dark' ? 'sun' : 'moon'));
  },
}, icon(settings().theme === 'dark' ? 'sun' : 'moon'));
const topbar = h(
  'header.topbar',
  h('a.brand', { href: '#/' }, h('img', { src: 'icons/icon.svg', alt: '' }), 'Chess Seeker'),
  h('div.grow'),
  h('a.icon-btn', { href: '#/analysis', 'aria-label': 'Analysis board' }, icon('analysis')),
  themeBtn,
  h('a.icon-btn', { href: '#/settings', 'aria-label': 'Settings' }, icon('settings')),
);

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
route('/more', moreView);
route('/analysis', () => analysisView([]));
route('/analysis/:fen', analysisView);
route('/openings', openingsView);
route('/drills', drillsView);
route('/rush', rushView);
route('/vision', visionView);
route('/insights', insightsView);
route('/mistakes', mistakesView);

initTracker();
startRouter();
initPwa();
