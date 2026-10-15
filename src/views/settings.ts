import { h, modal, toast } from '../ui/dom';
import { icon, type IconName } from '../ui/icons';
import { pageHeader } from '../ui/widgets';
import { miniBoard } from '../ui/miniboard';
import { settings, updateSettings, applyTheme, type BoardTheme, type Bucket, type Settings } from '../store/settings';
import { exportAll, importAll, wipeAll } from '../store/db';
import { trackStudy } from '../store/tracker';
import { download } from './games';
import { go, type View } from '../router';
import '../styles/settings.css';

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

const BOARD_THEMES: { id: BoardTheme; label: string; light: string; dark: string }[] = [
  { id: 'green', label: 'Green', light: '#ebecd0', dark: '#739552' },
  { id: 'brown', label: 'Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'blue', label: 'Blue', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'grey', label: 'Grey', light: '#d9d9d9', dark: '#8f8f8f' },
];

/** A position that shows off pieces of both colours, plus a last-move highlight. */
const PREVIEW_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

export async function settingsView(): Promise<View> {
  trackStudy(null);
  const root = h('div.page.settings2');

  const row = (ic: IconName, color: string, title: string, desc: string | null, control: Node, o: { tag?: string } = {}) =>
    h(`${o.tag ?? 'div'}.srow`, h('span.srow-icon', { style: `--c:${color}` }, icon(ic)), h('span.srow-text', h('strong', title), desc ? h('small', desc) : null), control);

  const toggle = (key: BoolKey, ic: IconName, color: string, title: string, desc: string | null = null) => {
    const input = h('input.switch', {
      type: 'checkbox',
      role: 'switch',
      checked: settings()[key],
      'aria-label': title,
      onchange: (e: Event) => updateSettings({ [key]: (e.target as HTMLInputElement).checked } as Partial<Settings>),
    });
    return row(ic, color, title, desc, input, { tag: 'label' });
  };

  const stepper = (title: string, ic: IconName, color: string, value: number, o: { min: number; max: number; step: number; unit: string; set: (v: number) => void }) => {
    const out = h('output.stp-val', `${value}${o.unit}`);
    let v = value;
    const change = (d: number) => {
      v = Math.max(o.min, Math.min(o.max, v + d));
      out.textContent = `${v}${o.unit}`;
      o.set(v);
    };
    return row(
      ic,
      color,
      title,
      null,
      h('div.stepper', h('button.stp', { type: 'button', 'aria-label': `Less ${title.toLowerCase()}`, onclick: () => change(-o.step) }, '−'), out, h('button.stp', { type: 'button', 'aria-label': `More ${title.toLowerCase()}`, onclick: () => change(o.step) }, '+')),
    );
  };

  const group = (title: string, ...rows: (Node | null)[]) => h('section.sgroup', h('h2.sgroup-title', title), h('div.sgroup-list', rows));

  const render = () => {
    const s = settings();
    const presets: { name: string; split: Record<Bucket, number> }[] = [
      { name: 'Classic 20/40/40', split: { openings: 20, tactics: 40, endgames: 40 } },
      { name: 'Tactics first', split: { openings: 20, tactics: 60, endgames: 20 } },
      { name: 'Even thirds', split: { openings: 34, tactics: 33, endgames: 33 } },
    ];
    const splitTotal = h('small.split-total');
    const showTotal = () => {
      const t = settings().split.openings + settings().split.tactics + settings().split.endgames;
      splitTotal.textContent = t === 100 ? 'Adds up to 100%' : `Adds up to ${t}%. Aim for 100%.`;
      splitTotal.classList.toggle('bad', t !== 100);
    };
    const splitRow = (b: Bucket, label: string, ic: IconName, color: string) =>
      row(
        ic,
        color,
        label,
        null,
        h('label.pct', h('input', {
          type: 'number', min: '0', max: '100', step: '5', value: String(s.split[b]), 'aria-label': `${label} percent`,
          onchange: (e: Event) => {
            const split = { ...settings().split, [b]: Number((e.target as HTMLInputElement).value) };
            updateSettings({ split });
            showTotal();
            const total = split.openings + split.tactics + split.endgames;
            if (total !== 100) toast(`Split adds up to ${total}%. Aim for 100%.`, 'bad');
          },
        }), '%'),
      );
    showTotal();
    const isCurrent = (p: Record<Bucket, number>) => p.openings === s.split.openings && p.tactics === s.split.tactics && p.endgames === s.split.endgames;

    const y = scrollY;
    root.replaceChildren(
      pageHeader('Settings', { back: '/more' }),
      // ---------------------------------------------------------------- board & pieces
      group(
        'Board & pieces',
        h(
          'div.board-picker',
          h('div.bp-preview', miniBoard(PREVIEW_FEN, { highlight: ['f1', 'c4'], label: 'Board preview' })),
          h(
            'div.bp-swatches',
            { role: 'radiogroup', 'aria-label': 'Board colours' },
            BOARD_THEMES.map((t) =>
              h(
                `button.bp-swatch${s.boardTheme === t.id ? '.on' : ''}`,
                { type: 'button', role: 'radio', 'aria-checked': String(s.boardTheme === t.id), onclick: () => (updateSettings({ boardTheme: t.id }), applyTheme(), render()) },
                h('span.bp-chip', { style: `background:conic-gradient(${t.dark} 0 25%, ${t.light} 0 50%, ${t.dark} 0 75%, ${t.light} 0);background-size:50% 50%` }, s.boardTheme === t.id ? icon('check') : null),
                h('span', t.label),
              ),
            ),
          ),
        ),
        row(
          s.theme === 'dark' ? 'moon' : 'sun',
          '#8b8987',
          'App theme',
          null,
          h('div.mini-seg', (['dark', 'light'] as const).map((t) => h(`button${s.theme === t ? '.on' : ''}`, { type: 'button', onclick: () => (updateSettings({ theme: t }), applyTheme(), render()) }, t === 'dark' ? 'Dark' : 'Light'))),
        ),
        toggle('coordinates', 'board', '#739552', 'Coordinates', 'Show a–h and 1–8 on the board edge'),
        toggle('animation', 'bolt', '#e8964a', 'Animations', 'Pieces slide and arrows draw in'),
        toggle('sound', 'volume', '#5aa6e6', 'Sounds'),
        toggle('autoQueen', 'king', '#c8a26b', 'Auto-promote to queen', 'Skip the promotion picker'),
      ),
      // ---------------------------------------------------------------- coach
      group(
        'Coach',
        toggle('hints', 'hint', '#f7c045', 'Hints on demand', 'Ask the coach for a nudge while playing'),
        toggle('blunderWarning', 'shield', '#e2574c', 'Blunder warning', 'Asks “are you sure?” before a big mistake'),
        toggle('dangerMarks', 'eye', '#ee6b55', 'Danger marks', 'Mark pinned pieces and moves that allow mate in one'),
      ),
      // ---------------------------------------------------------------- study goals
      group(
        'Study goals',
        stepper('Daily goal', 'target', '#81b64c', s.dailyGoalMin, { min: 5, max: 240, step: 5, unit: ' min', set: (v) => updateSettings({ dailyGoalMin: v }) }),
        stepper('Long games per week', 'hourglass', '#a57fe0', s.weeklyLongGames, { min: 0, max: 21, step: 1, unit: '', set: (v) => updateSettings({ weeklyLongGames: v }) }),
        h(
          'div.srow.col',
          h('span.srow-text', h('strong', 'Study split (20/40/40)'), h('small', 'How you want to split study time. Home compares it with what you actually did.')),
          h('div.chips', presets.map((p) => h(`button.chip${isCurrent(p.split) ? '.on' : ''}`, { type: 'button', onclick: () => (updateSettings({ split: p.split }), render()) }, p.name))),
        ),
        splitRow('openings', 'Openings', 'book', '#5aa6e6'),
        splitRow('tactics', 'Middlegame & tactics', 'swords', '#e8964a'),
        splitRow('endgames', 'Endgames', 'king', '#a57fe0'),
        h('div.srow.note', splitTotal),
      ),
      // ---------------------------------------------------------------- data
      group(
        'Your data',
        h('div.srow.privacy', h('span.srow-icon', { style: '--c:#81b64c' }, icon('lock')), h('span.srow-text', h('strong', 'Stored only on this device'), h('small', 'Progress, games, ratings and settings never leave this browser. No accounts, no analytics, no ads.'))),
        h(
          'button.srow.action',
          { type: 'button', onclick: async () => download(`chess-seeker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportAll()), 'application/json') },
          h('span.srow-icon', { style: '--c:#5aa6e6' }, icon('download')),
          h('span.srow-text', h('strong', 'Export backup'), h('small', 'Save everything to a JSON file')),
          h('span.chev2', icon('chevron')),
        ),
        h(
          'label.srow.action',
          h('span.srow-icon', { style: '--c:#5aa6e6' }, icon('upload')),
          h('span.srow-text', h('strong', 'Import backup'), h('small', 'Replace this device’s data with a backup file')),
          h('span.chev2', icon('chevron')),
          h('input', {
            type: 'file', accept: 'application/json,.json', hidden: true,
            onchange: async (e: Event) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (!f) return;
              try {
                await importAll(JSON.parse(await f.text()));
                toast('Backup restored', 'good');
                setTimeout(() => location.reload(), 600);
              } catch (err) {
                toast(`Import failed: ${(err as Error).message}`, 'bad');
              }
            },
          }),
        ),
        h(
          'button.srow.action.danger',
          {
            type: 'button',
            onclick: async () => {
              if ((await modal('Erase everything?', 'All progress, games and settings on this device will be deleted. Export a backup first if you want to keep them.', [{ label: 'Erase', value: 'y', primary: true }, { label: 'Cancel', value: 'n' }])) === 'y') {
                await wipeAll();
                toast('All data erased');
                setTimeout(() => (go('/'), location.reload()), 500);
              }
            },
          },
          h('span.srow-icon', { style: '--c:#e2574c' }, icon('trash')),
          h('span.srow-text', h('strong', 'Erase all data'), h('small', 'Delete progress, games and settings')),
        ),
      ),
      // ---------------------------------------------------------------- about
      group(
        'About',
        h(
          'div.srow.col.about',
          h('p.small', 'Chess Seeker is free software (GPL-3.0). Engine: Stockfish 19 (GPL-3.0) compiled to WebAssembly by the stockfish.js project, running entirely on your phone. Board: chessground by Lichess (GPL-3.0). Rules: chess.js (BSD-2). Puzzles: Lichess puzzle database (CC0).'),
          h('p.small.muted', 'Version ', __APP_VERSION__),
        ),
      ),
    );
    scrollTo(0, y);
  };
  render();
  return { el: root, title: 'Settings' };
}
