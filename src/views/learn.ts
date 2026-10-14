import { h } from '../ui/dom';
import { icon, type IconName } from '../ui/icons';
import { pageHeader } from '../ui/widgets';
import { miniBoard } from '../ui/miniboard';
import { ring } from '../ui/charts';
import { TRACKS, lessonsForTrack, ALL_LESSONS } from '../lessons';
import type { Lesson, Track } from '../lessons/types';
import { getLessonProgress, type LessonProgress } from '../store/db';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';
import '../styles/learn.css';

/** SVG icon + colour for each learning track (replaces the emoji in the lesson data). */
export const TRACK_ICON: Record<Track, IconName> = { foundations: 'pawn', tactics: 'swords', endgames: 'king', longgame: 'hourglass' };
export const TRACK_COLOR: Record<Track, string> = { foundations: '#5aa6e6', tactics: '#e8964a', endgames: '#a57fe0', longgame: '#81b64c' };

/** First lesson (curriculum order) not yet completed. */
export function nextLesson(progress: Map<string, LessonProgress>) {
  return ALL_LESSONS.find((l) => !progress.get(l.id)?.completed);
}

/** Position to preview a lesson with (its first step that has one). */
export function lessonPreviewFen(l: Lesson): { fen: string; orientation?: 'white' | 'black' } | null {
  for (const s of l.steps) if ('fen' in s && s.fen) return { fen: s.fen, orientation: s.orientation };
  return null;
}

export async function learnView(): Promise<View> {
  trackStudy(null);
  const progress = await getLessonProgress();
  const next = nextLesson(progress);
  const done = ALL_LESSONS.filter((l) => progress.get(l.id)?.completed).length;
  const pv = next && lessonPreviewFen(next);
  // Page = header, then a list of sections. To add a "Courses" catalog, insert its section at the top of
  // `sections` (before the "Up next" card); each section is a self-contained block styled by learn.css.
  const header = pageHeader('Lessons', { icon: 'learn', sub: `${done} of ${ALL_LESSONS.length} complete`, right: h('div.learn-ring', ring(done / Math.max(1, ALL_LESSONS.length), { value: `${Math.round((100 * done) / Math.max(1, ALL_LESSONS.length))}%`, color: 'var(--accent)' })) });
  const upNext = next
      ? h(
          'a.card.learn-next',
          { href: `#/lesson/${next.id}`, style: `--c:${TRACK_COLOR[next.track]}` },
          pv ? h('div.ln-board', miniBoard(pv.fen, { orientation: pv.orientation, label: next.title })) : null,
          h(
            'div.ln-body',
            h('div.eyebrow', progress.get(next.id) ? 'Continue where you left off' : 'Up next on your path'),
            h('h2', next.title),
            h('p.small', next.summary),
            h('div.ln-meta', h('span', icon(TRACK_ICON[next.track])), TRACKS.find((t) => t.id === next.track)?.title, h('span.dot-sep'), `${next.minutes} min`),
            h('span.btn.primary.ln-cta', icon('play_arrow'), progress.get(next.id) ? 'Continue' : 'Start lesson'),
          ),
        )
      : h('div.card.learn-next.done', h('div.ln-body', h('div.ln-trophy', icon('trophy')), h('h2', 'Path complete!'), h('p', 'Every lesson done. Keep sharp with puzzles and long games.')));
  const tracks = h(
      'div.track-grid',
      TRACKS.map((t) => {
        const lessons = lessonsForTrack(t.id);
        const tDone = lessons.filter((l) => progress.get(l.id)?.completed).length;
        const pct = lessons.length ? Math.round((100 * tDone) / lessons.length) : 0;
        return h(
          'section.track2',
          { style: `--c:${TRACK_COLOR[t.id]}` },
          h(
            'header.track2-head',
            h('span.track2-icon', icon(TRACK_ICON[t.id])),
            h('div.grow', h('h2', t.title), h('p.small.muted', t.blurb), h('div.track2-bar', h('div.bar', h('span', { style: `width:${pct}%;background:var(--c)` })), h('small', `${tDone}/${lessons.length}`))),
          ),
          lessons.length
            ? h(
                'ol.lesson-rows',
                lessons.map((l, k) => {
                  const p = progress.get(l.id);
                  const state = p?.completed ? 'done' : l === next ? 'next' : p ? 'started' : '';
                  const stepPct = p && !p.completed ? Math.round((100 * p.step) / l.steps.length) : 0;
                  return h(
                    `li.lrow${state ? '.' + state : ''}`,
                    h(
                      'a',
                      { href: `#/lesson/${l.id}` },
                      h('span.lstate', { style: stepPct ? `--p:${stepPct}` : undefined }, p?.completed ? icon('check') : l === next ? icon('play_arrow') : String(k + 1)),
                      h('span.grow', h('strong', l.title), h('small', l.summary)),
                      h('span.lmeta', h('span.lvl2', { 'aria-label': `Level ${l.level} of 5` }, [1, 2, 3, 4, 5].map((n) => h(`i${n <= l.level ? '.on' : ''}`))), h('small', `${l.minutes} min`)),
                    ),
                  );
                }),
              )
            : h('p.muted', 'Lessons coming soon.'),
        );
      }),
    );
  const sections: HTMLElement[] = [upNext, tracks];
  const el = h('div.page.learn2', header, sections);
  return { el, title: 'Lessons' };
}
