// Insights: personal stats computed on this device (chess.com Diamond "Insights"-style), plus a coach's top 3.
import { h } from '../ui/dom';
import { icon, classBadge, CLASS_STYLE, type IconName } from '../ui/icons';
import { mascot } from '../ui/coach';
import { pageHeader } from '../ui/widgets';
import { donut, lineChart, barList, stackBar, columns } from '../ui/charts';
import { listGames, getPuzzleAttempts, kvGet, getLessonProgress } from '../store/db';
import { trackStudy } from '../store/tracker';
import { computeInsights, topAdvice, wdlScore, wdlTotal, ERROR_CLASSES, PHASES, ENDGAME_MATERIAL, OPENING_PLIES, type Insights, type WDL, type Advice } from '../chess/insights';
import { BOTS } from '../engine/bots';
import { loadPuzzles } from '../data/puzzles';
import { PUZZLE_THEMES } from '../data/themes';
import { TRACKS, lessonsForTrack } from '../lessons';
import type { View } from '../router';
import '../styles/insights.css';

const themeLabel = (t: string) => PUZZLE_THEMES[t] ?? t.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const fmtDate = (d: number) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const PHASE_LABEL = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' } as const;

export async function insightsView(): Promise<View> {
  trackStudy(null);
  const [games, attempts, rating, progress, puzzles] = await Promise.all([
    listGames(),
    getPuzzleAttempts(),
    kvGet('puzzleRating', 800),
    getLessonProgress(),
    loadPuzzles().catch(() => []),
  ]);
  const themes = new Map(puzzles.map((p) => [p.id, p.themes]));
  const ins = computeInsights(games, attempts, { themesOf: (id) => themes.get(id), puzzleRating: Math.round(rating) });
  const advice = topAdvice(ins, themeLabel);

  const head = pageHeader('Insights', { back: '/more', sub: `Computed on this device from ${ins.games} game${ins.games === 1 ? '' : 's'} and ${attempts.length} puzzle${attempts.length === 1 ? '' : 's'}` });
  if (ins.games === 0 && attempts.length === 0) {
    return {
      title: 'Insights',
      el: h(
        'div.page.insights',
        head,
        h(
          'div.card.ins-empty',
          mascot('thinking', 'ins-empty-face'),
          h('h2', 'Nothing to show yet'),
          h('p.muted', 'Play a game or solve a few puzzles. Your accuracy, openings, mistakes and tips will appear here.'),
          h('div.row.wrap.center', h('a.btn.primary', { href: '#/play' }, icon('play'), 'Play a game'), h('a.btn', { href: '#/puzzles' }, icon('puzzle'), 'Solve puzzles')),
        ),
      ),
    };
  }

  const lessonsDone = [...progress.values()].filter((p) => p.completed).length;
  const el = h(
    'div.page.insights',
    head,
    coachCard(advice),
    h(
      'div.kpis',
      kpi('games', 'Games', String(ins.games), ins.analysed ? `${ins.analysed} reviewed` : 'none reviewed yet'),
      kpi('target', 'Avg accuracy', ins.avgAccuracy !== null ? `${Math.round(ins.avgAccuracy)}%` : '—', ins.accuracy.length ? `${ins.accuracy.length} games` : 'review a game'),
      kpi('trophy', 'Score', wdlTotal(ins.wdl) ? `${wdlScore(ins.wdl)}%` : '—', `${ins.wdl.win}W ${ins.wdl.draw}D ${ins.wdl.loss}L`),
      kpi('puzzle', 'Puzzle rating', String(Math.round(rating)), `${attempts.length} solved/tried`),
    ),
    h(
      'div.ins-grid',
      section('Results', 'Wins, draws and losses in your games.', wdlTotal(ins.wdl) ? donut(wdlSlices(ins.wdl), { value: `${wdlScore(ins.wdl)}%`, label: 'score' }) : emptyNote('Finish a game to see your results.')),
      section(
        'Accuracy over time',
        'Your accuracy in each reviewed game (0–100).',
        ins.accuracy.length >= 2
          ? h('div', lineChart(ins.accuracy.map((a) => ({ x: a.date, y: a.value, label: fmtDate(a.date) })), { yMin: 0, yMax: 100, ticks: [0, 50, 100], unit: '%', name: 'Accuracy' }), dataTable(['Date', 'Accuracy'], ins.accuracy.map((a) => [fmtDate(a.date), `${a.value}%`])))
          : emptyNote('Review at least two games to see a trend.', '/games'),
      ),
      section(
        'Accuracy by phase',
        `Opening = your first ${OPENING_PLIES / 2} moves. Endgame = ${ENDGAME_MATERIAL} or fewer points of pieces left (pawns not counted). Middlegame = the rest.`,
        PHASES.some((p) => ins.phaseAccuracy[p] !== null)
          ? barList(
              PHASES.map((p) => ({ label: PHASE_LABEL[p], value: ins.phaseAccuracy[p] ?? 0, text: ins.phaseAccuracy[p] !== null ? `${Math.round(ins.phaseAccuracy[p]!)}%` : 'not enough moves', sub: `${ins.phaseMoves[p]} moves` })),
              { max: 100, name: 'Accuracy by phase' },
            )
          : emptyNote('Review a game to see where you play best.', '/games'),
      ),
      mistakesSection(ins),
      section(
        'Tactics you missed',
        'Winning ideas the engine found when you made a mistake. Tap one to learn it.',
        ins.missed.length ? barList(ins.missed.slice(0, 6).map((m) => ({ label: m.label, value: m.count, text: `${m.count}×`, href: `/lesson/${m.lesson}` })), { name: 'Tactics you missed', color: 'var(--viz-2)' }) : emptyNote(ins.analysed ? 'No missed tactics found. Nice!' : 'Review a game to find them.'),
      ),
      section(
        'Tactics you allowed',
        'What your opponent could do after your mistakes.',
        ins.allowed.length ? barList(ins.allowed.slice(0, 6).map((m) => ({ label: m.label, value: m.count, text: `${m.count}×`, href: `/lesson/${m.lesson}` })), { name: 'Tactics you allowed', color: 'var(--viz-loss)' }) : emptyNote(ins.analysed ? 'Nothing found. Solid!' : 'Review a game to find them.'),
      ),
      openingsSection(ins),
      section(
        'Results vs bots',
        'How you score against each bot.',
        ins.byBot.length
          ? h('div.bot-rows', ins.byBot.map((b) => h('div.bot-row', h('div.bot-row-label', h('strong', BOTS[b.level]?.name ?? `Level ${b.level}`), h('small', `${BOTS[b.level]?.elo ?? ''} · ${wdlTotal(b)} game${wdlTotal(b) === 1 ? '' : 's'} · ${wdlScore(b)}%`)), stackBar(wdlParts(b), { title: BOTS[b.level]?.name ?? `Level ${b.level}` }))), legendWdl())
          : emptyNote('Play a bot to see this.', '/play'),
      ),
      timeSection(ins),
      section(
        'Puzzle rating',
        'Rebuilt from your puzzle attempts.',
        ins.puzzleRating.length >= 2
          ? h('div', lineChart(ins.puzzleRating.map((p) => ({ x: p.date, y: p.rating, label: fmtDate(p.date) })), { name: 'Puzzle rating', color: 'var(--c-tac)' }), dataTable(['Date', 'Rating'], ins.puzzleRating.slice(-20).map((p) => [fmtDate(p.date), String(p.rating)])))
          : emptyNote('Solve a few puzzles to see your rating move.', '/puzzles'),
      ),
      themesSection(ins),
      section(
        'Lessons',
        `${lessonsDone} lesson${lessonsDone === 1 ? '' : 's'} completed.`,
        barList(
          TRACKS.map((t) => {
            const ls = lessonsForTrack(t.id);
            const d = ls.filter((l) => progress.get(l.id)?.completed).length;
            return { label: t.title, value: ls.length ? Math.round((100 * d) / ls.length) : 0, text: `${d}/${ls.length}`, href: '/learn' };
          }),
          { max: 100, name: 'Lessons completed per track' },
        ),
      ),
    ),
  );
  return { el, title: 'Insights' };
}

// ------------------------------------------------------------------ pieces

function section(title: string, desc: string, body: Node, cls = ''): HTMLElement {
  return h(`section.card.ins-card${cls}`, h('h2', title), h('p.ins-desc', desc), body);
}

function emptyNote(text: string, href?: string): HTMLElement {
  return h('div.ins-note', mascot('neutral', 'ins-note-face'), h('span', text), href ? h('a.small', { href: `#${href}` }, 'Go') : null);
}

function kpi(ic: IconName, label: string, value: string, sub: string) {
  return h('div.kpi', h('span.kpi-label', icon(ic), label), h('strong.kpi-value', value), h('small', sub));
}

function wdlSlices(w: WDL) {
  return [
    { label: 'Won', value: w.win, color: 'var(--viz-win)' },
    { label: 'Drawn', value: w.draw, color: 'var(--viz-draw)' },
    { label: 'Lost', value: w.loss, color: 'var(--viz-loss)' },
  ];
}
const wdlParts = (w: WDL) => wdlSlices(w);

function legendWdl() {
  return h('div.viz-legend', wdlSlices({ win: 0, draw: 0, loss: 0 }).map((s) => h('div.viz-legend-item', h('i.viz-key.box', { style: `background:${s.color}` }), h('span', s.label))));
}

function dataTable(head: string[], rows: string[][]): HTMLElement {
  return h('details.ins-table', h('summary', 'Show data'), h('table', h('thead', h('tr', head.map((c) => h('th', c)))), h('tbody', rows.map((r) => h('tr', r.map((c) => h('td', c)))))));
}

function coachCard(advice: Advice[]): HTMLElement {
  const KIND_ICON: Record<Advice['kind'], IconName> = { lesson: 'learn', puzzles: 'puzzle', play: 'play', review: 'analysis' };
  return h(
    'section.card.ins-coach',
    h('div.ins-coach-head', mascot('thinking', 'ins-coach-face'), h('div', h('h2', 'Top 3 things to work on'), h('p.ins-desc', 'Picked from your games and puzzles.'))),
    h(
      'ol.advice',
      advice.map((a, i) =>
        h(
          'li',
          h('a.advice-row', { href: `#${a.href}` }, h('span.advice-no', String(i + 1)), h('span.grow', h('strong', a.title), h('small', a.text), h('span.advice-cta', icon(KIND_ICON[a.kind]), a.cta)), h('span.chev2', icon('chevron'))),
        ),
      ),
    ),
  );
}

function mistakesSection(ins: Insights): HTMLElement {
  if (!ins.analysed) return section('Mistakes per game', 'How often each kind of error happens.', emptyNote('Review a game to count your mistakes.', '/games'));
  const recent = ins.errorsPerGame.slice(-12);
  return section(
    'Mistakes per game',
    'Average per reviewed game, and serious errors (mistakes, misses, blunders) in your recent games.',
    h(
      'div',
      h(
        'div.err-tiles',
        [...ERROR_CLASSES].reverse().map((c) => h('div.err-tile', classBadge(c), h('strong', String(ins.avgErrors[c])), h('small', `${CLASS_STYLE[c].label.toLowerCase()}s`))),
      ),
      recent.length >= 2
        ? columns(
            recent.map((g, i) => ({ label: String(ins.errorsPerGame.length - recent.length + i + 1), title: `Game ${ins.errorsPerGame.length - recent.length + i + 1} · ${fmtDate(g.date)}`, value: g.errors.mistake + g.errors.miss + g.errors.blunder })),
            { name: 'Serious errors', color: 'var(--viz-loss)' },
          )
        : null,
    ),
  );
}

function openingsSection(ins: Insights): HTMLElement {
  if (!ins.openings.length) return section('Your openings', 'Openings you play and how they go.', emptyNote('Play a game to see your openings.', '/play'));
  return section(
    'Your openings',
    'Named from the first moves. Score counts a draw as half a win.',
    h(
      'div.open-list',
      ins.openings.slice(0, 8).map((o) =>
        h(
          'div.open-row',
          h('div.open-name', h(`span.side-dot.${o.color}`, { title: `as ${o.color}` }), h('div', h('strong', o.name), h('small', `${o.games} game${o.games === 1 ? '' : 's'} as ${o.color}${o.accuracy !== null ? ` · ${Math.round(o.accuracy)}% accuracy` : ''}`))),
          h('div.open-bar', wdlTotal(o) ? stackBar(wdlParts(o), { title: o.name }) : h('small.muted', 'unfinished'), h('span.open-score', wdlTotal(o) ? `${wdlScore(o)}%` : '')),
        ),
      ),
      legendWdl(),
    ),
  );
}

function timeSection(ins: Insights): HTMLElement {
  const has = PHASES.some((p) => ins.secondsPerMove[p] !== null);
  if (!has) return section('Time use', 'How long you think per move.', emptyNote('Play a timed game to see this.', '/play'));
  const per = ins.timedGames ? ins.timeTroubleMoves / ins.timedGames : 0;
  return section(
    'Time use',
    'Average seconds per move in each phase. Time trouble = moving with under 30 s (or 10% of the clock) left.',
    h(
      'div',
      barList(
        PHASES.map((p) => ({ label: PHASE_LABEL[p], value: ins.secondsPerMove[p] ?? 0, text: ins.secondsPerMove[p] !== null ? `${ins.secondsPerMove[p]} s` : '—' })),
        { name: 'Seconds per move', color: 'var(--viz-2)' },
      ),
      ins.timedGames
        ? h('div.time-trouble', icon('clock'), h('span', h('strong', `${ins.timeTroubleMoves}`), ` move${ins.timeTroubleMoves === 1 ? '' : 's'} in time trouble across ${ins.timedGames} timed game${ins.timedGames === 1 ? '' : 's'}`, per >= 3 ? h('small', 'Try to move faster in the opening to save time.') : null))
        : null,
    ),
  );
}

function themesSection(ins: Insights): HTMLElement {
  if (!ins.themes.length) return section('Puzzle themes', 'Which puzzle themes you solve best.', emptyNote('Solve at least 3 puzzles of a theme to see it here.', '/puzzles'));
  const strong = ins.themes.slice(0, 4);
  const weak = ins.themes.length > 4 ? ins.themes.slice(-4).reverse().filter((t) => !strong.includes(t)) : [];
  const rows = (list: typeof ins.themes) => list.map((t) => ({ label: themeLabel(t.theme), value: t.rate, text: `${t.rate}%`, sub: `${t.solved}/${t.total}`, href: `/puzzles/${t.theme}` }));
  return section(
    'Puzzle themes',
    'Solve rate by theme (at least 3 tries). Tap a theme to practise it.',
    h('div.theme-cols', h('div', h('h3', 'Strengths'), barList(rows(strong), { max: 100, name: 'Strongest themes' })), weak.length ? h('div', h('h3', 'Work on'), barList(rows(weak), { max: 100, name: 'Weakest themes', color: 'var(--c-tac)' })) : null),
  );
}
