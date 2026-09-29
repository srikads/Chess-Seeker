import { h, modal, toast } from '../ui/dom';
import { settings, updateSettings, applyTheme, type BoardTheme, type Bucket } from '../store/settings';
import { exportAll, importAll, wipeAll } from '../store/db';
import { trackStudy } from '../store/tracker';
import { download } from './games';
import { go, type View } from '../router';

export async function settingsView(): Promise<View> {
  trackStudy(null);
  const root = h('div.page.settings');
  const render = () => {
    const s = settings();
    const check = (label: string, key: 'coordinates' | 'animation' | 'sound' | 'autoQueen' | 'hints' | 'blunderWarning', desc = '') =>
      h('label.toggle', h('input', { type: 'checkbox', checked: s[key], onchange: (e: Event) => updateSettings({ [key]: (e.target as HTMLInputElement).checked }) }), h('span', h('strong', label), desc ? h('small', desc) : null));
    const presets: { name: string; split: Record<Bucket, number> }[] = [
      { name: 'Classic 20/40/40', split: { openings: 20, tactics: 40, endgames: 40 } },
      { name: 'Tactics first (beginner)', split: { openings: 20, tactics: 60, endgames: 20 } },
      { name: 'Even thirds', split: { openings: 34, tactics: 33, endgames: 33 } },
    ];
    const splitInputs = (['openings', 'tactics', 'endgames'] as Bucket[]).map((b) =>
      h('label.num', h('span', { openings: 'Openings', tactics: 'Middlegame/tactics', endgames: 'Endgames' }[b]), h('input', {
        type: 'number', min: '0', max: '100', step: '5', value: String(s.split[b]),
        onchange: (e: Event) => {
          const split = { ...settings().split, [b]: Number((e.target as HTMLInputElement).value) };
          const total = split.openings + split.tactics + split.endgames;
          if (total !== 100) toast(`Split adds up to ${total}% — aim for 100%.`, 'bad');
          updateSettings({ split });
        },
      }), '%'),
    );
    root.replaceChildren(
      h('h1', 'Settings'),
      h('section.card',
        h('h3', 'Appearance'),
        h('div.chips', (['dark', 'light'] as const).map((t) => h(`button.chip${s.theme === t ? '.on' : ''}`, { onclick: () => (updateSettings({ theme: t }), applyTheme(), render()) }, t === 'dark' ? '🌙 Dark' : '☀️ Light'))),
        h('p.small.muted', 'Board colours'),
        h('div.chips', (['green', 'brown', 'blue', 'grey'] as BoardTheme[]).map((t) => h(`button.chip.swatch-chip.b-${t}${s.boardTheme === t ? '.on' : ''}`, { onclick: () => (updateSettings({ boardTheme: t }), applyTheme(), render()) }, t))),
        check('Coordinates', 'coordinates'),
        check('Animations', 'animation'),
        check('Sounds', 'sound'),
        check('Auto-promote to queen', 'autoQueen'),
      ),
      h('section.card',
        h('h3', 'Coach defaults'),
        check('Hints on demand', 'hints'),
        check('Blunder warning', 'blunderWarning', 'Asks "are you sure?" before a big mistake.'),
      ),
      h('section.card',
        h('h3', 'Study plan (20/40/40)'),
        h('p.small.muted', 'How you want to split study time. The home screen compares this with what you actually did.'),
        h('div.chips', presets.map((p) => h('button.chip', { onclick: () => (updateSettings({ split: p.split }), render()) }, p.name))),
        h('div.split-inputs', splitInputs),
        h('label.num', h('span', 'Daily goal'), h('input', { type: 'number', min: '5', max: '240', step: '5', value: String(s.dailyGoalMin), onchange: (e: Event) => updateSettings({ dailyGoalMin: Number((e.target as HTMLInputElement).value) }) }), 'min'),
        h('label.num', h('span', 'Long games per week'), h('input', { type: 'number', min: '0', max: '21', value: String(s.weeklyLongGames), onchange: (e: Event) => updateSettings({ weeklyLongGames: Number((e.target as HTMLInputElement).value) }) }), ''),
      ),
      h('section.card',
        h('h3', 'Your data'),
        h('p.small', '🔒 Everything — progress, games, ratings, settings — is stored only in this browser on this device. The app makes no network requests except loading its own files, has no analytics, no accounts and no ads.'),
        h('div.row.wrap',
          h('button.btn', { onclick: async () => download(`chess-seeker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportAll()), 'application/json') }, '⤓ Export backup'),
          h('label.btn', 'Import backup', h('input', {
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
          })),
          h('button.btn.ghost.danger', {
            onclick: async () => {
              if ((await modal('Erase everything?', 'All progress, games and settings on this device will be deleted. Export a backup first if you want to keep them.', [{ label: 'Erase', value: 'y', primary: true }, { label: 'Cancel', value: 'n' }])) === 'y') {
                await wipeAll();
                toast('All data erased');
                setTimeout(() => (go('/'), location.reload()), 500);
              }
            },
          }, 'Erase all data'),
        ),
      ),
      h('section.card.about',
        h('h3', 'About'),
        h('p.small', 'Chess Seeker is free software (GPL-3.0). Engine: Stockfish 19 (GPL-3.0) compiled to WebAssembly by the stockfish.js project, running entirely on your phone. Board: chessground by Lichess (GPL-3.0). Rules: chess.js (BSD-2). Puzzles: Lichess puzzle database (CC0).'),
        h('p.small', 'Version ', __APP_VERSION__),
      ),
    );
  };
  render();
  return { el: root };
}
