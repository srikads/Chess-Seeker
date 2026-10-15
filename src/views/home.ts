import { Chess } from 'chess.js';
import { h, fmtMinutes } from '../ui/dom';
import { icon, type IconName } from '../ui/icons';
import { mascot, type Mood } from '../ui/coach';
import { BOT_AVATAR } from '../ui/avatars';
import { miniBoard } from '../ui/miniboard';
import { ring } from '../ui/charts';
import { ALL_LESSONS, lessonsForTrack } from '../lessons';
import type { Lesson } from '../lessons/types';
import { getLessonProgress, studySince, listGames, kvGet, getPuzzleAttempts, type StudyBucket, type GameRecord } from '../store/db';
import { settings, type Bucket } from '../store/settings';
import { trackStudy } from '../store/tracker';
import { isLongTimeControl } from '../chess/pgn';
import { outcomeOf } from '../chess/insights';
import { BOTS } from '../engine/bots';
import { tcById } from '../chess/clock';
import { loadPuzzles } from '../data/puzzles';
import { canInstall, onInstallChange, promptInstall } from '../pwa';
import { nextLesson, TRACK_ICON } from './learn';
import type { View } from '../router';
import '../styles/home.css';

const BUCKET_INFO: Record<Bucket, { label: string; color: string; track: string; puzzle: string; icon: IconName }> = {
  openings: { label: 'Openings & principles', color: 'var(--c-open)', track: 'foundations', puzzle: 'opening', icon: 'book' },
  tactics: { label: 'Middlegame & tactics', color: 'var(--c-tac)', track: 'tactics', puzzle: 'mixed', icon: 'swords' },
  endgames: { label: 'Endgames', color: 'var(--c-end)', track: 'endgames', puzzle: 'endgame', icon: 'king' },
};

/** The resumable game that the Play screen keeps in kv (read-only here). */
interface SavedGameLite {
  cfg: { bot: number; color: 'white' | 'black'; tc: string };
  sans: string[];
}

export async function homeView(): Promise<View> {
  trackStudy(null);
  const s = settings();
  const [progress, week, todayLog, games, rating, attempts, saved] = await Promise.all([
    getLessonProgress(),
    studySince(7),
    studySince(1),
    listGames(),
    kvGet('puzzleRating', 800),
    getPuzzleAttempts(),
    kvGet<SavedGameLite | null>('currentGame', null).catch(() => null),
  ]);
  const sum = (logs: typeof week, b?: StudyBucket) => logs.filter((l) => !b || l.bucket === b).reduce((a, l) => a + l.seconds, 0);
  const weekTotal = sum(week.filter((l) => l.bucket !== 'play'));
  const todaySec = sum(todayLog);
  const buckets = Object.keys(BUCKET_INFO) as Bucket[];

  // Which bucket is most behind its 20/40/40 target this week?
  const deficit = buckets
    .map((b) => ({ b, actual: sum(week, b), target: (s.split[b] / 100) * Math.max(weekTotal, 1) }))
    .map((x) => ({ ...x, gap: x.target - x.actual }))
    .sort((a, b) => b.gap - a.gap);
  const focus = weekTotal < 60 ? 'tactics' : deficit[0].b;

  const weekAgo = Date.now() - 7 * 86400_000;
  const longGames = games.filter((g) => g.date > weekAgo && isLongTimeControl(g.timeControl) && g.sans.length >= 20).length;
  const unreviewed = games.find((g) => !g.analysis);
  const next = nextLesson(progress);
  const focusLesson = lessonsForTrack(BUCKET_INFO[focus].track).find((l) => !progress.get(l.id)?.completed);
  const solvedToday = attempts.filter((a) => a.solved && a.date > Date.now() - 86400_000).length;
  const lessonsDone = ALL_LESSONS.filter((l) => progress.get(l.id)?.completed).length;
  const resumable = saved && Array.isArray(saved.sans) && saved.cfg && BOTS[saved.cfg.bot] ? saved : null;

  // ---------------------------------------------------------------- greeting
  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Late-night chess?' : hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';
  let line: string;
  let mood: Mood = 'happy';
  if (resumable) line = `Your game vs ${BOTS[resumable.cfg.bot].name} is waiting for you.`;
  else if (unreviewed) (line = 'Let’s look at your last game together.'), (mood = 'thinking');
  else if (solvedToday === 0) line = 'A quick puzzle is a great warm-up.';
  else if (todaySec / 60 >= s.dailyGoalMin) (line = 'Daily goal done. Nice work!'), (mood = 'excited');
  else line = next ? `Up next: ${next.title}.` : 'Keep sharp with puzzles and long games.';

  // ---------------------------------------------------------------- plan
  const plan: HTMLElement[] = [];
  if (next && next.id === 'the-20-40-40-rule') plan.push(planItem('book', 'var(--c-open)', 'Start here: the 20/40/40 rule', 'Learn how to split your study time.', `#/lesson/${next.id}`));
  plan.push(
    focusLesson
      ? planItem('target', BUCKET_INFO[focus].color, `Focus: ${BUCKET_INFO[focus].label}`, `Lesson: ${focusLesson.title}`, `#/lesson/${focusLesson.id}`)
      : planItem('target', BUCKET_INFO[focus].color, `Focus: ${BUCKET_INFO[focus].label}`, 'Solve themed puzzles', `#/puzzles/${BUCKET_INFO[focus].puzzle}`),
  );
  plan.push(planItem('puzzle', '#e8964a', 'Daily puzzles', `${solvedToday} solved today. Aim for 10.`, '#/puzzles', solvedToday >= 10));
  if (unreviewed) plan.push(planItem('analysis', '#5aa6e6', 'Review your last game', 'Find the turning point and one lesson.', `#/review/${unreviewed.id}`));
  if (longGames < s.weeklyLongGames) plan.push(planItem('hourglass', '#a57fe0', 'Play a long game', `${longGames}/${s.weeklyLongGames} long games this week (15|10 or slower)`, '#/play'));

  // ---------------------------------------------------------------- install + offline
  const installCard = h(
    'div.card.home-install',
    h('span.hi-icon', icon('download')),
    h('div.grow', h('strong', 'Install Chess Seeker'), h('small', 'Add it to your home screen. Works fully offline.')),
    h('button.btn.primary.sm', { onclick: () => void promptInstall() }, 'Install'),
  );
  const syncInstall = () => (installCard.hidden = !canInstall());
  syncInstall();
  const stopInstallSync = onInstallChange(syncInstall);
  const offlineReady = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;

  // ---------------------------------------------------------------- daily puzzle preview
  const puzzleBoard = h('div.hc-board', miniBoard('8/8/8/8/8/8/8/8 w - - 0 1', { label: 'Daily puzzle' }));
  void dailyPreview().then((p) => {
    if (p) puzzleBoard.replaceChildren(miniBoard(p.fen, { orientation: p.orientation, label: 'Daily puzzle position' }));
  });

  const el = h(
    'div.page.home2',
    h('section.home-hello', h('div.hh-face', mascot(mood)), h('div.hh-text', h('h1', hello), h('p', line))),
    installCard,
    playCard(resumable, s.lastBot, s.lastTimeControl, s.lastColor),
    h(
      'section.home-stats',
      statRing(Math.min(1, todaySec / 60 / Math.max(1, s.dailyGoalMin)), fmtMinutes(todaySec), `of ${s.dailyGoalMin}m today`, 'var(--accent)'),
      statIcon('puzzle', '#e8964a', `${Math.round(rating)}`, 'Puzzle rating'),
      statRing(lessonsDone / Math.max(1, ALL_LESSONS.length), `${lessonsDone}`, `of ${ALL_LESSONS.length} lessons`, '#5aa6e6'),
      statRing(Math.min(1, longGames / Math.max(1, s.weeklyLongGames)), `${longGames}/${s.weeklyLongGames}`, 'long games (7d)', '#a57fe0'),
    ),
    h(
      'div.home-grid',
      h(
        'a.card.hcard.puzzle-card',
        { href: '#/puzzles' },
        h('div.hc-head', h('span.hc-icon', { style: '--c:#e8964a' }, icon('puzzle')), h('div.grow', h('strong', 'Daily Puzzle'), h('small', new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })))),
        puzzleBoard,
        h('span.btn.primary.hc-cta', 'Solve puzzle'),
      ),
      next ? lessonCard(next, progress.get(next.id)?.step ?? 0) : h('a.card.hcard', { href: '#/learn' }, h('div.hc-head', h('span.hc-icon', icon('trophy')), h('div.grow', h('strong', 'Path complete!'), h('small', 'Keep sharp with puzzles and long games.')))),
      reviewCard(games[0]),
      h(
        'div.home-tiles',
        miniTile('/mistakes', 'replay', '#ee6b55', 'Learn from mistakes', 'Replay positions you got wrong'),
        miniTile('/insights', 'chart', '#a57fe0', 'Insights', games.length ? `Stats from your ${games.length} game${games.length === 1 ? '' : 's'}` : 'Your stats, trends and tips'),
      ),
    ),
    h('section.home-section', h('h2', "Today's plan"), h('div.plan2', plan)),
    h(
      'section.card.balance',
      h('div.row.between', h('h2', '20 / 40 / 40 balance'), h('a.small', { href: '#/settings' }, 'Adjust')),
      h('p.small.muted', 'Study time over the last 7 days vs. your target split. Time counts only while you are active.'),
      buckets.map((b) => {
        const actual = sum(week, b);
        const pct = weekTotal ? Math.round((100 * actual) / weekTotal) : 0;
        return h(
          'div.split2',
          h('span.sp-icon', { style: `--c:${BUCKET_INFO[b].color}` }, icon(BUCKET_INFO[b].icon)),
          h(
            'div.grow',
            h('div.row.between.small', h('strong', BUCKET_INFO[b].label), h('span.muted', `${pct}% of ${s.split[b]}% · ${fmtMinutes(actual)}`)),
            h('div.split-bar', h('span.target', { style: `left:${s.split[b]}%`, title: `Target ${s.split[b]}%` }), h('span.fill', { style: `width:${pct}%;background:${BUCKET_INFO[b].color}` })),
          ),
        );
      }),
      h('p.small.muted', `Plus ${fmtMinutes(sum(week, 'play'))} playing and reviewing games.`),
    ),
    h(
      'footer.home-privacy',
      icon(offlineReady ? 'wifi_off' : 'lock'),
      h('span', offlineReady ? h('strong', 'Offline-ready. ') : null, 'Private and ad-free. Everything stays on this device.'),
    ),
  );
  return { el, destroy: () => void stopInstallSync() };
}

// ------------------------------------------------------------------ cards

function botAvatar(level: number): Node {
  const b = BOTS[level];
  const f = b && BOT_AVATAR[b.avatar];
  return f ? f() : h('span.hp-bot', icon('bot'));
}

function playCard(saved: SavedGameLite | null, lastBot: number, lastTc: string, lastColor: string): HTMLElement {
  if (saved) {
    const g = new Chess();
    let lm: string[] = [];
    for (const san of saved.sans) {
      try {
        const m = g.move(san);
        lm = [m.from, m.to];
      } catch {
        break;
      }
    }
    const bot = BOTS[saved.cfg.bot];
    return h(
      'a.card.play-hero.resume',
      { href: '#/play' },
      h('div.ph-board', miniBoard(g.fen(), { orientation: saved.cfg.color === 'black' ? 'black' : 'white', highlight: lm, label: 'Game in progress' })),
      h(
        'div.ph-body',
        h('div.eyebrow', 'Game in progress'),
        h('div.ph-vs', h('span.ph-av', botAvatar(saved.cfg.bot)), h('div', h('strong', bot.name), h('small', `${bot.elo} · ${tcById(saved.cfg.tc).label} · move ${Math.floor(saved.sans.length / 2) + 1}`))),
        h('span.btn.primary.big.ph-cta', icon('play_arrow'), 'Continue game'),
      ),
    );
  }
  const bot = BOTS[lastBot] ?? BOTS[2];
  return h(
    'a.card.play-hero',
    { href: '#/play' },
    h(
      'div.ph-body',
      h('div.ph-vs', h('span.ph-av.big', botAvatar(bot.level)), h('div', h('div.eyebrow', 'Play'), h('strong.ph-name', `vs ${bot.name}`), h('small', `${bot.elo} · ${tcById(lastTc).label} · ${lastColor === 'random' ? 'random colour' : `as ${lastColor}`}`))),
      h('span.btn.primary.big.ph-cta', icon('play'), 'Play'),
    ),
  );
}

function lessonCard(l: Lesson, step: number): HTMLElement {
  const track = lessonsForTrack(l.track);
  const first = l.steps.find((st) => 'fen' in st && st.fen) as { fen: string; orientation?: 'white' | 'black' } | undefined;
  const pct = step > 0 ? Math.round((100 * step) / l.steps.length) : 0;
  return h(
    'a.card.hcard.lesson-card',
    { href: `#/lesson/${l.id}` },
    h('div.hc-head', h('span.hc-icon', { style: '--c:#5aa6e6' }, icon(TRACK_ICON[l.track] ?? 'learn')), h('div.grow', h('strong', 'Next lesson'), h('small', `Lesson ${track.indexOf(l) + 1} of ${track.length} · ${l.minutes} min`))),
    h('div.hc-split', first ? h('div.hc-board.small', miniBoard(first.fen, { orientation: first.orientation, label: l.title })) : null, h('div.grow', h('h3', l.title), h('p.small.muted', l.summary))),
    h('div.hc-progress', h('div.bar', h('span', { style: `width:${pct}%` })), h('small', pct ? `${pct}%` : 'New')),
    h('span.btn.primary.hc-cta', pct ? 'Continue lesson' : 'Start lesson'),
  );
}

function reviewCard(g: GameRecord | undefined): HTMLElement {
  if (!g) {
    return h(
      'a.card.hcard.review-card',
      { href: '#/play' },
      h('div.hc-head', h('span.hc-icon', { style: '--c:#81b64c' }, icon('analysis')), h('div.grow', h('strong', 'Game Review'), h('small', 'Play a game and the coach will walk you through it.'))),
      h('span.btn.hc-cta', 'Play your first game'),
    );
  }
  const chess = new Chess();
  try {
    chess.load(g.startFen);
    for (const san of g.sans) chess.move(san);
  } catch {
    /* show what we have */
  }
  const side = g.userColor === 'black' ? 'black' : 'white';
  const out = outcomeOf(g);
  const opp = side === 'white' ? g.black : g.white;
  const acc = g.accuracy && g.userColor !== 'both' ? g.accuracy[side] : null;
  return h(
    'a.card.hcard.review-card',
    { href: `#/review/${g.id}` },
    h('div.hc-head', h('span.hc-icon', { style: '--c:#81b64c' }, icon('analysis')), h('div.grow', h('strong', 'Game Review'), h('small', `Latest game · ${new Date(g.date).toLocaleDateString()}`))),
    h(
      'div.hc-split',
      h('div.hc-board.small', miniBoard(chess.fen(), { orientation: side, label: 'Final position' })),
      h(
        'div.grow',
        h('div.rv-line', h(`span.result-chip.${out ?? 'none'}`, out === 'win' ? 'Won' : out === 'loss' ? 'Lost' : out === 'draw' ? 'Draw' : g.result), h('span', `vs ${opp}`)),
        acc !== null && acc !== undefined ? h('div.rv-acc', h('strong', `${Math.round(acc)}`), h('small', 'accuracy')) : h('p.small.muted', 'Not reviewed yet'),
      ),
    ),
    h(`span.btn${g.analysis ? '' : '.primary'}.hc-cta`, g.analysis ? 'Open review' : 'Review this game'),
  );
}

function miniTile(href: string, ic: IconName, color: string, title: string, sub: string) {
  return h('a.card.mtile', { href: `#${href}` }, h('span.hc-icon', { style: `--c:${color}` }, icon(ic)), h('div.grow', h('strong', title), h('small', sub)), h('span.chev2', icon('chevron')));
}

function planItem(ic: IconName, color: string, title: string, sub: string, href: string, done = false) {
  return h(
    `a.plan2-item${done ? '.done' : ''}`,
    { href },
    h('span.hc-icon', { style: `--c:${color}` }, icon(done ? 'check' : ic)),
    h('span.grow', h('strong', title), h('small', sub)),
    h('span.chev2', icon('chevron')),
  );
}

function statRing(p: number, value: string, label: string, color: string) {
  return h('div.hstat', ring(p, { value: '', color }), h('div', h('strong', value), h('small', label)));
}

function statIcon(ic: IconName, color: string, value: string, label: string) {
  return h('div.hstat', h('span.hstat-icon', { style: `--c:${color}` }, icon(ic)), h('div', h('strong', value), h('small', label)));
}

/** Today's puzzle preview: a deterministic pick by date from the bundled set (the Puzzles tab owns the real thing). */
async function dailyPreview(): Promise<{ fen: string; orientation: 'white' | 'black' } | null> {
  try {
    const all = await loadPuzzles();
    if (!all.length) return null;
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86400_000);
    const p = all[(day * 2654435761) % all.length >>> 0] ?? all[0];
    const g = new Chess(p.fen);
    if (p.setup && p.moves[0]) g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4), promotion: p.moves[0][4] });
    return { fen: g.fen(), orientation: g.turn() === 'w' ? 'white' : 'black' };
  } catch {
    return null;
  }
}
