// Game modes for play vs bots (chess.com-style Challenge / Friendly / Assisted) mapped onto fine-grained aids.

export interface Assist {
  /** eval bar next to the board */
  evalBar: boolean;
  /** red arrows: what the opponent threatens */
  threatArrows: boolean;
  /** green arrow on the board when you ask for a hint */
  suggestArrows: boolean;
  /** coach line + class badge after each of your moves */
  moveFeedback: boolean;
  /** hints on demand */
  hints: boolean;
  takebacks: boolean;
  /** engine "Are you sure?" before a move that drops a lot */
  blunderCheck: boolean;
  /** "Is it safe?" check (no engine) + the Checks/Captures/Threats chips */
  safetyCheck: boolean;
  /** ✗ marks on pinned pieces and on moves that allow mate in one */
  dangerMarks: boolean;
}

export type PlayMode = 'challenge' | 'friendly' | 'assisted' | 'custom';
export type PresetMode = Exclude<PlayMode, 'custom'>;

const NONE: Assist = {
  evalBar: false,
  threatArrows: false,
  suggestArrows: false,
  moveFeedback: false,
  hints: false,
  takebacks: false,
  blunderCheck: false,
  safetyCheck: false,
  dangerMarks: false,
};

export const MODE_ASSIST: Record<PresetMode, Assist> = {
  challenge: NONE,
  friendly: { ...NONE, hints: true, takebacks: true, suggestArrows: true, moveFeedback: true, dangerMarks: true },
  assisted: { evalBar: true, threatArrows: true, suggestArrows: true, moveFeedback: true, hints: true, takebacks: true, blunderCheck: true, safetyCheck: true, dangerMarks: true },
};

export const MODE_INFO: Record<PresetMode, { title: string; sub: string }> = {
  challenge: { title: 'Challenge', sub: 'No help at all. A real game.' },
  friendly: { title: 'Friendly', sub: 'Hints, takebacks and move feedback.' },
  assisted: { title: 'Assisted', sub: 'Every aid on, including safety checks.' },
};

export const ASSIST_KEYS = Object.keys(NONE) as (keyof Assist)[];

/** Which preset (if any) these aids match. */
export function modeOf(a: Assist): PlayMode {
  for (const m of ['challenge', 'friendly', 'assisted'] as PresetMode[]) if (ASSIST_KEYS.every((k) => a[k] === MODE_ASSIST[m][k])) return m;
  return 'custom';
}

/** Fill in missing keys (older saved games / settings) with "off". */
export function normalizeAssist(a: Partial<Assist> | undefined): Assist {
  return { ...NONE, ...(a ?? {}) };
}

/** Does this game count as "pure" (no help at all)? */
export const isPure = (a: Assist) => ASSIST_KEYS.every((k) => !a[k]);
