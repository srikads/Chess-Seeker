import { Chess } from 'chess.js';
import { engine, scoreNum } from './engine';

export interface Bot {
  level: number;
  name: string;
  elo: number;
  avatar: string;
  blurb: string;
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
  { level: 0, name: 'Pip', elo: 250, avatar: '🐣', blurb: 'Just learned how the pieces move. Leaves pieces hanging a lot.', depth: 1, multipv: 10, temp: 400, randomP: 0.35 },
  { level: 1, name: 'Rookie Rae', elo: 400, avatar: '🙂', blurb: 'Knows the rules, still misses simple captures.', depth: 2, multipv: 8, temp: 250, randomP: 0.2 },
  { level: 2, name: 'Knightly Ned', elo: 600, avatar: '🐴', blurb: 'Likes knight jumps and quick attacks. Blunders under pressure.', depth: 4, multipv: 6, temp: 150, randomP: 0.1 },
  { level: 3, name: 'Bishop Bea', elo: 800, avatar: '🧙', blurb: 'Develops sensibly and spots one-move tactics.', depth: 5, multipv: 5, temp: 90, randomP: 0.05 },
  { level: 4, name: 'Castle Carl', elo: 1000, avatar: '🏰', blurb: 'Solid club beginner: safe king, fewer blunders.', depth: 7, multipv: 4, temp: 55, randomP: 0.02 },
  { level: 5, name: 'Tactician Tia', elo: 1200, avatar: '⚔️', blurb: 'Finds forks and pins. Punishes loose pieces.', depth: 8, multipv: 3, temp: 30, randomP: 0.01 },
  { level: 6, name: 'Clubber Cleo', elo: 1400, avatar: '🎯', blurb: 'Plays like a strong club player.', uciElo: 1400 },
  { level: 7, name: 'Expert Eli', elo: 1700, avatar: '🦉', blurb: 'Positional understanding, sharp calculation.', uciElo: 1700 },
  { level: 8, name: 'Candidate Kai', elo: 2000, avatar: '🦅', blurb: 'Near-master strength. Few mistakes.', uciElo: 2000 },
  { level: 9, name: 'Master Mira', elo: 2400, avatar: '👑', blurb: 'International-master level play.', uciElo: 2400 },
  { level: 10, name: 'Stockfish', elo: 3000, avatar: '🐟', blurb: 'Full-strength engine. Good luck!', full: true },
];

/** Choose the bot's move (UCI). `thinkMs` is a soft budget from the clock. */
export async function botMove(bot: Bot, fen: string, thinkMs: number): Promise<string> {
  const g = new Chess(fen);
  const legal = g.moves({ verbose: true });
  if (!legal.length) return '(none)';
  if (bot.depth !== undefined) {
    if (Math.random() < (bot.randomP ?? 0)) {
      // Prefer "natural-looking" random moves: captures and developing moves slightly more often.
      const m = legal[Math.floor(Math.random() * legal.length)];
      return m.from + m.to + (m.promotion ?? '');
    }
    const r = await engine.analyse(fen, { depth: bot.depth, multipv: bot.multipv ?? 1 });
    if (!r.lines.length) return r.bestmove;
    const best = scoreNum(r.lines[0]);
    // Always take a mate in one from level 3 up.
    if (bot.level >= 3 && r.lines[0].mate === 1) return r.lines[0].pv[0];
    const T = bot.temp ?? 50;
    const weights = r.lines.map((l) => Math.exp((Math.max(-2000, scoreNum(l)) - Math.max(-2000, best)) / T));
    const total = weights.reduce((a, b) => a + b, 0);
    let x = Math.random() * total;
    for (let i = 0; i < r.lines.length; i++) {
      x -= weights[i];
      if (x <= 0) return r.lines[i].pv[0];
    }
    return r.lines[0].pv[0];
  }
  const movetime = Math.max(250, Math.min(thinkMs, bot.full ? 5000 : 2500));
  const r = await engine.analyse(fen, { movetime, elo: bot.uciElo });
  return r.bestmove;
}
