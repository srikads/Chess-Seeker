import { h } from '../ui/dom';
import { TRACKS, lessonsForTrack, ALL_LESSONS } from '../lessons';
import { getLessonProgress, type LessonProgress } from '../store/db';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';

/** First lesson (curriculum order) not yet completed. */
export function nextLesson(progress: Map<string, LessonProgress>) {
  return ALL_LESSONS.find((l) => !progress.get(l.id)?.completed);
}

export async function learnView(): Promise<View> {
  trackStudy(null);
  const progress = await getLessonProgress();
  const next = nextLesson(progress);
  const done = ALL_LESSONS.filter((l) => progress.get(l.id)?.completed).length;
  const el = h(
    'div.page',
    h('h1', 'Learn'),
    h('p.muted', 'A guided path from first principles to advanced technique. Every lesson explains an idea step by step, shows it on the board, then lets you try it yourself.'),
    h('div.progress-line', h('div.bar', h('span', { style: `width:${(100 * done) / Math.max(1, ALL_LESSONS.length)}%` })), h('span.small', `${done} / ${ALL_LESSONS.length} lessons`)),
    next
      ? h('a.card.next-up', { href: `#/lesson/${next.id}` }, h('div.eyebrow', 'Up next on your path'), h('h3', next.title), h('p', next.summary), h('span.btn.primary', progress.get(next.id) ? 'Continue ›' : 'Start ›'))
      : h('div.card.next-up', h('h3', '🎓 Path complete!'), h('p', 'Keep sharp with puzzles and long games.')),
    TRACKS.map((t) => {
      const lessons = lessonsForTrack(t.id);
      const tDone = lessons.filter((l) => progress.get(l.id)?.completed).length;
      return h(
        'section.track',
        h('div.track-head', h('span.track-icon', t.icon), h('div.grow', h('h2', t.title), h('p.muted.small', t.blurb)), h('span.pill', `${tDone}/${lessons.length}`)),
        lessons.length
          ? h(
              'ol.lesson-list',
              lessons.map((l) => {
                const p = progress.get(l.id);
                const state = p?.completed ? 'done' : p ? 'started' : l === next ? 'next' : '';
                return h(
                  `li.lesson-item${state ? '.' + state : ''}`,
                  h(
                    'a',
                    { href: `#/lesson/${l.id}` },
                    h('span.lesson-state', p?.completed ? '✓' : l === next ? '▶' : String(ALL_LESSONS.indexOf(l) + 1)),
                    h('span.grow', h('strong', l.title), h('small', l.summary)),
                    h('span.lvl', '●'.repeat(l.level) + '○'.repeat(5 - l.level)),
                  ),
                );
              }),
            )
          : h('p.muted', 'Lessons coming soon.'),
      );
    }),
  );
  return { el };
}
