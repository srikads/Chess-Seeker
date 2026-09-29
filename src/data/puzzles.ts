import { Chess } from 'chess.js';
import { ALL_LESSONS } from '../lessons';

export interface Puzzle {
  id: string;
  fen: string;
  /** UCI moves. If `setup` is true, moves[0] is the opponent's move played automatically. */
  moves: string[];
  rating: number;
  themes: string[];
  setup: boolean;
}

let cache: Promise<Puzzle[]> | null = null;

/** Loads the bundled puzzle pack (same-origin file, cached offline by the service worker). */
export function loadPuzzles(): Promise<Puzzle[]> {
  cache ??= (async () => {
    let list: Puzzle[] = [];
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}puzzles/puzzles.json`);
      if (res.ok) {
        const data = await res.json();
        list = (data.puzzles as [string, string, string, number, string][]).map(([id, fen, moves, rating, themes]) => ({
          id,
          fen,
          moves: moves.split(' '),
          rating,
          themes: themes.split(' '),
          setup: true,
        }));
      }
    } catch {
      /* no pack bundled — fall back to lesson exercises */
    }
    return [...list, ...lessonPuzzles()];
  })();
  return cache;
}

/** Turn every tactics "try it" exercise from the lessons into a puzzle too. */
function lessonPuzzles(): Puzzle[] {
  const out: Puzzle[] = [];
  for (const l of ALL_LESSONS) {
    l.steps.forEach((s, i) => {
      if (s.kind !== 'try') return;
      try {
        const g = new Chess(s.fen);
        const moves = s.solution.map((san) => {
          const m = g.move(san);
          return m.from + m.to + (m.promotion ?? '');
        });
        const themes = [l.category === 'endgames' ? 'endgame' : l.category === 'openings' ? 'opening' : 'lesson', `lesson:${l.id}`];
        if (g.isCheckmate()) themes.push(`mateIn${Math.ceil(moves.length / 2)}`);
        out.push({ id: `L-${l.id}-${i}`, fen: s.fen, moves, rating: 400 + l.level * 250, themes, setup: false });
      } catch {
        /* skip invalid */
      }
    });
  }
  return out;
}
