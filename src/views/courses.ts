// Course catalog: search, filter chips, a "Start here" beginner path and carousels of course cards.
import '../styles/courses.css';
import { h, setChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import { pageHeader } from '../ui/widgets';
import { COURSES, FILTERS, PATH_OPTIONS, courseById, filterCourses, isPlayable, pathCourses, type CourseFilter, type PathChoice } from '../courses/catalog';
import type { Course } from '../courses/types';
import { courseProgress, dueKeys, loadAllProgress, loadPath, savePath, type CourseProgress } from '../courses/progress';
import { courseCover } from './course-cover';
import { trackStudy } from '../store/tracker';
import type { View } from '../router';

const SECTIONS: { id: Exclude<CourseFilter, 'all'>; title: string }[] = [
  { id: 'white', title: 'White openings' },
  { id: 'black', title: 'Black openings' },
  { id: 'gambit', title: 'Gambits & attacks' },
  { id: 'defense', title: 'Defenses' },
  { id: 'skill', title: 'Skill courses' },
  { id: 'soon', title: 'Coming soon' },
];

const PATH_ROLE = ['As White', 'Vs 1.e4', 'Vs 1.d4', 'Skill', 'Skill'];

let lastFilter: CourseFilter = 'all';
let lastQuery = '';

export async function coursesView(): Promise<View> {
  trackStudy(null);
  const progress = await loadAllProgress(COURSES.filter(isPlayable).map((c) => c.id));
  let path = await loadPath();
  let filter = lastFilter;
  let query = lastQuery;

  const body = h('div.cc-body');
  const pathHost = h('div');
  const search = h('input.cc-search-input', {
    type: 'search',
    placeholder: 'Search courses',
    'aria-label': 'Search courses',
    value: query,
    oninput: (e: Event) => {
      query = lastQuery = (e.target as HTMLInputElement).value;
      render();
    },
  }) as HTMLInputElement;
  const chips = h('div.cc-chips', { role: 'tablist' });

  const renderChips = () =>
    chips.replaceChildren(
      ...FILTERS.map((f) =>
        h(
          `button.cc-chip${f.id === filter ? '.on' : ''}`,
          { type: 'button', role: 'tab', 'aria-selected': String(f.id === filter), onclick: () => setFilter(f.id) },
          f.label,
        ),
      ),
    );

  const setFilter = (f: CourseFilter) => {
    filter = lastFilter = f;
    renderChips();
    render();
    chips.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  const renderPath = () => setChildren(pathHost, pathCard(path, progress, () => void changePath()));

  const changePath = async () => {
    const next = await pickPath(path);
    if (!next) return;
    path = next;
    await savePath(path);
    renderPath();
  };

  const render = () => {
    const browsing = filter === 'all' && !query.trim();
    pathHost.hidden = !browsing;
    if (browsing) {
      body.replaceChildren(
        ...SECTIONS.map((s) => {
          const list = filterCourses(COURSES, s.id);
          return h(
            'section.cc-section',
            h('div.cc-section-head', h('h2', s.title), h('span.cc-count', String(list.length)), h('div.grow'), h('button.cc-see-all', { type: 'button', onclick: () => setFilter(s.id) }, 'See all', icon('chevron'))),
            h('div.cc-rail', { role: 'list' }, list.map((c) => courseCard(c, progress.get(c.id)))),
          );
        }),
      );
    } else {
      const list = filterCourses(COURSES, filter, query);
      body.replaceChildren(
        list.length
          ? h('div.cc-grid', { role: 'list' }, list.map((c) => courseCard(c, progress.get(c.id))))
          : h('div.cc-empty', icon('book'), h('p', 'No courses match that search.'), h('button.btn.sm', { type: 'button', onclick: () => ((search.value = ''), (query = lastQuery = ''), setFilter('all')) }, 'Show all courses')),
      );
    }
  };

  renderChips();
  renderPath();
  render();

  const ready = COURSES.filter(isPlayable).length;
  const el = h(
    'div.page.courses-page',
    pageHeader('Courses', { sub: `${COURSES.filter((c) => c.status !== 'soon').length} courses · ${ready} ready now`, icon: 'book' }),
    h('label.cc-search', icon('search'), search),
    chips,
    pathHost,
    body,
  );
  return { el, title: 'Courses' };
}

// ------------------------------------------------------------------ cards

function status(c: Course, p: CourseProgress | undefined): { pct: number; label: string; kind: 'start' | 'continue' | 'done' | 'production' | 'soon' } {
  if (c.status === 'soon') return { pct: 0, label: 'Coming soon', kind: 'soon' };
  if (!isPlayable(c)) return { pct: 0, label: 'In production', kind: 'production' };
  const pct = p ? courseProgress(c, p) : 0;
  if (pct >= 1) return { pct, label: 'Review', kind: 'done' };
  return pct > 0 ? { pct, label: 'Continue', kind: 'continue' } : { pct, label: 'Start Course', kind: 'start' };
}

export function courseCard(c: Course, p: CourseProgress | undefined): HTMLElement {
  const s = status(c, p);
  const due = p && isPlayable(c) ? dueKeys(c, p).length : 0;
  const href = c.status === 'soon' ? undefined : `#/course/${c.id}`;
  return h(
    `${href ? 'a' : 'div'}.cc-card.k-${s.kind}`,
    { href, role: 'listitem', 'aria-label': `${c.title}: ${s.label}` },
    h('div.cc-cover-wrap', courseCover(c), s.kind === 'soon' ? h('span.cc-badge.soon', 'Soon') : due ? h('span.cc-badge.due', `${due} due`) : null),
    h('div.cc-card-body',
      h('strong.cc-title', c.title),
      h('p.cc-desc', c.description),
      s.kind === 'continue' || s.kind === 'done' ? h('div.cc-progress', h('div.bar', h('span', { style: `width:${Math.round(s.pct * 100)}%` })), h('span', `${Math.round(s.pct * 100)}%`)) : null,
      h(`span.btn.sm.cc-cta${s.kind === 'start' || s.kind === 'continue' ? '.primary' : ''}`, s.label),
    ),
  );
}

// ------------------------------------------------------------------ start-here path

function pathCard(path: PathChoice, progress: Map<string, CourseProgress>, onChange: () => void): HTMLElement {
  const ids = pathCourses(path);
  const courses = ids.map((id) => courseById(id)).filter((c): c is Course => !!c);
  const firstOpen = courses.findIndex((c) => isPlayable(c) && courseProgress(c, progress.get(c.id) ?? { lines: {} }) < 1);
  const done = courses.filter((c) => isPlayable(c) && courseProgress(c, progress.get(c.id) ?? { lines: {} }) >= 1).length;
  return h(
    'section.cc-path',
    h('div.cc-path-head',
      h('div.grow', h('div.eyebrow', 'Start here'), h('h2', 'Your beginner path'), h('p.muted.small', 'One opening for White, one defense for each first move, and the two skills that win the most games.')),
      h('button.btn.sm.ghost.cc-path-change', { type: 'button', onclick: onChange }, 'Change'),
    ),
    h('ol.cc-steps',
      courses.map((c, i) => {
        const s = status(c, progress.get(c.id));
        return h(
          `li.cc-step${i === firstOpen ? '.next' : ''}${s.kind === 'done' ? '.done' : ''}`,
          h(
            'a.cc-step-link',
            { href: `#/course/${c.id}` },
            h('span.cc-step-node', s.kind === 'done' ? icon('check') : String(i + 1)),
            h('div.cc-step-thumb', courseCover(c, { size: 'sm' })),
            h('div.cc-step-text',
              h('small', PATH_ROLE[i]),
              h('strong', c.title),
              s.kind === 'production' ? h('span.cc-step-state', 'In production') : h('div.cc-step-bar', h('div.bar', h('span', { style: `width:${Math.round(s.pct * 100)}%` }))),
            ),
            i === firstOpen ? h('span.btn.sm.primary.cc-step-go', s.kind === 'continue' ? 'Continue' : 'Start') : h('span.tile-chev', icon('chevron')),
          ),
        );
      }),
    ),
    h('div.cc-path-foot.muted.small', `${done} of ${courses.length} done`),
  );
}

/** Modal to choose the repertoire on the path. Resolves null when cancelled. */
function pickPath(cur: PathChoice): Promise<PathChoice | null> {
  return new Promise((resolve) => {
    const next = { ...cur };
    const groups = PATH_OPTIONS.map((g) =>
      h('fieldset.cc-pick',
        h('legend', g.label),
        h('div.cc-pick-row',
          g.options.map((id) => {
            const c = courseById(id)!;
            const btn = h(
              `button.cc-pick-opt${next[g.key] === id ? '.on' : ''}`,
              {
                type: 'button',
                'aria-pressed': String(next[g.key] === id),
                onclick: () => {
                  next[g.key] = id;
                  btn.parentElement!.querySelectorAll('.cc-pick-opt').forEach((b) => (b.classList.remove('on'), b.setAttribute('aria-pressed', 'false')));
                  btn.classList.add('on');
                  btn.setAttribute('aria-pressed', 'true');
                },
              },
              courseCover(c, { size: 'sm' }),
              h('span', c.title.replace(/^The /, '')),
              isPlayable(c) ? null : h('small', 'In production'),
            );
            return btn;
          }),
        ),
      ),
    );
    const close = (v: PathChoice | null) => {
      back.remove();
      resolve(v);
    };
    const back = h('div.modal-back', { onclick: (e: Event) => e.target === back && close(null) },
      h('div.modal.cc-pick-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose your path' },
        h('h3', 'Choose your repertoire'),
        h('p.muted.small', 'Pick one of each. You can change it any time.'),
        groups,
        h('div.modal-actions', h('button.btn', { type: 'button', onclick: () => close(null) }, 'Cancel'), h('button.btn.primary', { type: 'button', onclick: () => close(next) }, 'Save path')),
      ),
    );
    document.body.append(back);
  });
}
