import { Chess } from 'chess.js';
import { engine, scoreNum } from './engine';

export type BotGroup = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
export const BOT_GROUPS: BotGroup[] = ['Beginner', 'Intermediate', 'Advanced', 'Master'];

export interface Bot {
  level: number;
  name: string;
  elo: number;
  /** id of the portrait in `BOT_AVATAR` (src/ui/avatars.ts) */
  avatar: string;
  blurb: string;
  group: BotGroup;
  /** weak bots: depth + softmax temperature (cp) + chance of a random legal move */
  depth?: number;
  multipv?: number;
  temp?: number;
  randomP?: number;
  /** strong bots: Stockfish UCI_Elo limit (undefined = full strength) */
  uciElo?: number;
  full?: boolean;
}

export const BOTS: Bot[] = [
  { level: 0, name: 'Pip', elo: 250, avatar: 'pip', group: 'Beginner', blurb: 'Just hatched and just learned how the pieces move. Leaves pieces hanging a lot.', depth: 1, multipv: 10, temp: 400, randomP: 0.35 },
  { level: 1, name: 'Rookie Rae', elo: 400, avatar: 'rae', group: 'Beginner', blurb: 'Knows the rules and loves to play, but still misses simple captures.', depth: 2, multipv: 8, temp: 250, randomP: 0.2 },
  { level: 2, name: 'Knightly Ned', elo: 600, avatar: 'ned', group: 'Beginner', blurb: 'Loves knight jumps and quick attacks. Gets wobbly under pressure.', depth: 4, multipv: 6, temp: 150, randomP: 0.1 },
  { level: 3, name: 'Bishop Bea', elo: 800, avatar: 'bea', group: 'Intermediate', blurb: 'A patient teacher. Develops sensibly and spots one-move tactics.', depth: 5, multipv: 5, temp: 90, randomP: 0.05 },
  { level: 4, name: 'Castle Carl', elo: 1000, avatar: 'carl', group: 'Intermediate', blurb: 'Safety first! Castles early, keeps the king snug and blunders less.', depth: 7, multipv: 4, temp: 55, randomP: 0.02 },
  { level: 5, name: 'Tactician Tia', elo: 1200, avatar: 'tia', group: 'Intermediate', blurb: 'Hunts for forks and pins. Loose pieces never stay loose for long.', depth: 8, multipv: 3, temp: 30, randomP: 0.01 },
  { level: 6, name: 'Clubber Cleo', elo: 1400, avatar: 'cleo', group: 'Advanced', blurb: 'Chess club regular. Plays solid, practical moves every week.', uciElo: 1400 },
  { level: 7, name: 'Expert Eli', elo: 1700, avatar: 'eli', group: 'Advanced', blurb: 'Thinks in plans, not just moves. Calculates sharp lines calmly.', uciElo: 1700 },
  { level: 8, name: 'Candidate Kai', elo: 2000, avatar: 'kai', group: 'Advanced', blurb: 'Training hard to become a master. Makes very few mistakes.', uciElo: 2000 },
  { level: 9, name: 'Master Mira', elo: 2400, avatar: 'mira', group: 'Master', blurb: 'Master-level play with a royal touch. Every move has a purpose.', uciElo: 2400 },
  { level: 10, name: 'Stockfish', elo: 3000, avatar: 'stockfish', group: 'Master', blurb: 'The full-strength engine. Nobody beats it, but you learn a lot by trying!', full: true },
];

export interface BotChoice {
  uci: string;
  /** the bot's own evaluation before its move (cp, from the bot's point of view), when it searched */
  cp: number | null;
}

/** Choose the bot's move (UCI). `thinkMs` is a soft budget from the clock. */
export async function botMove(bot: Bot, fen: string, thinkMs: number): Promise<string> {
  return (await botChoose(bot, fen, thinkMs)).uci;
}

/** Choose the bot's move and report how it judged the position (used for chat reactions). */
export async function botChoose(bot: Bot, fen: string, thinkMs: number): Promise<BotChoice> {
  const g = new Chess(fen);
  const legal = g.moves({ verbose: true });
  if (!legal.length) return { uci: '(none)', cp: null };
  if (bot.depth !== undefined) {
    if (Math.random() < (bot.randomP ?? 0)) {
      const m = legal[Math.floor(Math.random() * legal.length)];
      return { uci: m.from + m.to + (m.promotion ?? ''), cp: null };
    }
    const r = await engine.analyse(fen, { depth: bot.depth, multipv: bot.multipv ?? 1 });
    if (!r.lines.length) return { uci: r.bestmove, cp: null };
    const best = scoreNum(r.lines[0]);
    // Always take a mate in one from level 3 up.
    if (bot.level >= 3 && r.lines[0].mate === 1) return { uci: r.lines[0].pv[0], cp: best };
    const T = bot.temp ?? 50;
    const weights = r.lines.map((l) => Math.exp((Math.max(-2000, scoreNum(l)) - Math.max(-2000, best)) / T));
    const total = weights.reduce((a, b) => a + b, 0);
    let x = Math.random() * total;
    for (let i = 0; i < r.lines.length; i++) {
      x -= weights[i];
      if (x <= 0) return { uci: r.lines[i].pv[0], cp: best };
    }
    return { uci: r.lines[0].pv[0], cp: best };
  }
  const movetime = Math.max(250, Math.min(thinkMs, bot.full ? 5000 : 2500));
  const r = await engine.analyse(fen, { movetime, elo: bot.uciElo });
  return { uci: r.bestmove, cp: r.lines[0] ? scoreNum(r.lines[0]) : null };
}
