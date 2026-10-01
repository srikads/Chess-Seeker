// User preferences — stored in localStorage on this device only.

export type BoardTheme = 'green' | 'brown' | 'blue' | 'grey';
export type Bucket = 'openings' | 'tactics' | 'endgames';

export interface Settings {
  theme: 'dark' | 'light';
  boardTheme: BoardTheme;
  coordinates: boolean;
  animation: boolean;
  sound: boolean;
  autoQueen: boolean;
  /** Coach defaults for play vs bot */
  hints: boolean;
  blunderWarning: boolean;
  /** ✗ marks on pinned pieces and on moves that allow mate in one */
  dangerMarks: boolean;
  /** 20/40/40 split (percent, sums to 100) */
  split: Record<Bucket, number>;
  dailyGoalMin: number;
  weeklyLongGames: number;
  lastBot: number;
  lastTimeControl: string;
  lastColor: 'white' | 'black' | 'random';
}

const KEY = 'cs.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  boardTheme: 'green',
  coordinates: true,
  animation: true,
  sound: true,
  autoQueen: false,
  hints: true,
  blunderWarning: true,
  dangerMarks: true,
  split: { openings: 20, tactics: 40, endgames: 40 },
  dailyGoalMin: 30,
  weeklyLongGames: 3,
  lastBot: 2,
  lastTimeControl: '15+10',
  lastColor: 'white',
};

let current: Settings = load();
const listeners = new Set<(s: Settings) => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* storage blocked — use defaults */
  }
  return { ...DEFAULT_SETTINGS };
}

export function settings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(current));
}

export function replaceSettings(s: Partial<Settings>) {
  updateSettings({ ...DEFAULT_SETTINGS, ...s });
}

export function onSettings(fn: (s: Settings) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyTheme() {
  const s = current;
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.board = s.boardTheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.theme === 'dark' ? '#1b1d22' : '#f3f1ec');
}
