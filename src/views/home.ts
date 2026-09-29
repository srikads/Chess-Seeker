import { h, fmtMinutes } from '../ui/dom';
import { ALL_LESSONS, lessonsForTrack } from '../lessons';
import { getLessonProgress, studySince, listGames, kvGet, getPuzzleAttempts, type StudyBucket } from '../store/db';
import { settings, type Bucket } from '../store/settings';
import { trackStudy } from '../store/tracker';
import { isLongTimeControl } from '../chess/pgn';
import { canInstall, onInstallable, promptInstall } from '../pwa';
import { nextLesson } from './learn';
import type { View } from '../router';

const BUCKET_INFO: Record<Bucket, { label: string; color: string; track: string; puzzle: string }> = {
  openings: { label: 'Openings & principles', color: 'var(--c-open)', track: 'foundations', puzzle: 'opening' },
  tactics: { label: 'Middlegame & tactics', color: 'var(--c-tac)', track: 'tactics', puzzle: 'mixed' },
  endgames: { label: 'Endgames', color: 'var(--c-end)', track: 'endgames', puzzle: 'endgame' },
};

export async function homeView(): Promise<View> {
  trackStudy(null);
  const s = settings();
  const [progress, week, todayLog, games, rating, attempts] = await Promise.all([
    getLessonProgress(),
    studySince(7),
    studySince(1),
    listGames(),
    kvGet('puzzleRating', 800),
    getPuzzleAttempts(),
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

  const plan: HTMLElement[] = [];
  if (next && next.id === 'the-20-40-40-rule') plan.push(planItem('📖', 'Start here: the 20/40/40 rule', 'Learn how to split your study time.', `#/lesson/${next.id}`));
  plan.push(
    focusLesson
      ? planItem('🎯', `Focus: ${BUCKET_INFO[focus].label}`, `Lesson — ${focusLesson.title}`, `#/lesson/${focusLesson.id}`)
      : planItem('🎯', `Focus: ${BUCKET_INFO[focus].label}`, 'Solve themed puzzles', `#/puzzles/${BUCKET_INFO[focus].puzzle}`),
  );
  plan.push(planItem('🧩', 'Daily puzzles', `${solvedToday} solved today — aim for 10`, '#/puzzles'));
  if (unreviewed) plan.push(planItem('🔍', 'Review your last game', 'Find the turning point and one lesson.', `#/review/${unreviewed.id}`));
  if (longGames < s.weeklyLongGames) plan.push(planItem('⏳', 'Play a long game', `${longGames}/${s.weeklyLongGames} long games this week (15|10 or slower)`, '#/play'));

  const installBtn = h('button.btn.primary', { onclick: () => void promptInstall() }, '⬇ Install app');
  const installCard = h('div.card.install', h('div.grow', h('strong', 'Install Chess Seeker'), h('small', 'Add to your home screen — works fully offline.')), installBtn);
  installCard.hidden = !canInstall();
  onInstallable(() => (installCard.hidden = false));

  const lessonsDone = ALL_LESSONS.filter((l) => progress.get(l.id)?.completed).length;
  const el = h(
    'div.page.home',
    h('div.hero', h('div', h('h1', 'Chess Seeker'), h('p.muted', 'Private, offline, ad-free. Everything stays on this phone.'))),
    installCard,
    h(
      'div.stats',
      stat(`${fmtMinutes(todaySec)}`, `of ${s.dailyGoalMin}m today`, Math.min(1, todaySec / 60 / s.dailyGoalMin)),
      stat(`${Math.round(rating)}`, 'puzzle rating'),
      stat(`${lessonsDone}/${ALL_LESSONS.length}`, 'lessons'),
      stat(`${longGames}/${s.weeklyLongGames}`, 'long games (7d)'),
    ),
    h('section', h('h2', "Today's plan"), h('div.plan', plan)),
    h(
      'section.card',
      h('div.row.between', h('h2', '20 / 40 / 40 balance'), h('a.small', { href: '#/settings' }, 'Adjust')),
      h('p.small.muted', 'Study time over the last 7 days vs. your target split. Time is counted only while you are active.'),
      buckets.map((b) => {
        const actual = sum(week, b);
        const pct = weekTotal ? Math.round((100 * actual) / weekTotal) : 0;
        return h(
          'div.split-row',
          h('div.row.between.small', h('span', h('span.swatch', { style: `background:${BUCKET_INFO[b].color}` }), BUCKET_INFO[b].label), h('span', `${pct}% / ${s.split[b]}% · ${fmtMinutes(actual)}`)),
          h('div.split-bar', h('span.target', { style: `left:${s.split[b]}%` }), h('span.fill', { style: `width:${pct}%;background:${BUCKET_INFO[b].color}` })),
        );
      }),
      h('p.small.muted', `Plus ${fmtMinutes(sum(week, 'play'))} playing & reviewing games.`),
    ),
    next ? h('a.card.next-up', { href: `#/lesson/${next.id}` }, h('div.eyebrow', 'Continue learning'), h('h3', next.title), h('p.small', next.summary)) : null,
  );
  return { el };
}

function planItem(icon: string, title: string, sub: string, href: string) {
  return h('a.plan-item', { href }, h('span.plan-icon', icon), h('span.grow', h('strong', title), h('small', sub)), h('span.chev', '›'));
}

function stat(value: string, label: string, ring?: number) {
  return h('div.stat', ring !== undefined ? h('div.ring', { style: `--p:${Math.round(ring * 100)}` }) : null, h('strong', value), h('small', label));
}
