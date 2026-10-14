// Practice drills: short positions played against Stockfish until a goal is reached.
// Every FEN is checked for legality in tests/drills.test.ts and was checked with Stockfish for the expected result.
import { Chess, type Color, type Square } from 'chess.js';
import { VALUE } from '../chess/util';

export type DrillGoal = 'mate' | 'promote' | 'draw' | 'win-material';

export interface Drill {
  id: string;
  group: 'Checkmates' | 'Pawn endgames' | 'Rook endgames' | 'Tactics';
  title: string;
  /** what the learner must do, shown as the goal pill */
  goalText: string;
  goal: DrillGoal;
  fen: string;
  /** learner moves allowed (draw: moves to survive) */
  maxMoves: number;
  /** win-material: net material (pawns) the learner must be up compared with the start */
  material?: number;
  level: 1 | 2 | 3;
  /** coach one-liners, shown in order as tips */
  tips: string[];
  /** first coach line when the drill starts */
  intro: string;
}

export const DRILLS: Drill[] = [
  {
    id: 'queen-corner',
    group: 'Checkmates',
    title: 'Queen mate: finish it',
    goalText: 'Checkmate in 3 moves',
    goal: 'mate',
    fen: '7k/8/5K2/8/8/8/8/3Q4 w - - 0 1',
    maxMoves: 3,
    level: 1,
    intro: 'The black king is already in the corner. Finish the job — but watch out for stalemate!',
    tips: ['Use the queen to take away squares, and bring your king close.', 'Stalemate happens when the king has no moves but is NOT in check. Always leave it one square until the final blow.'],
  },
  {
    id: 'queen-mate',
    group: 'Checkmates',
    title: 'Queen + king vs king',
    goalText: 'Checkmate in 15 moves',
    goal: 'mate',
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    maxMoves: 15,
    level: 1,
    intro: 'Push the king to the edge with your queen, then bring your own king to help.',
    tips: ['Move the queen a knight\'s jump away from the king — it shrinks the box without giving check.', 'Once the king is on the edge, walk your king over. The queen alone cannot mate.', 'Careful: if the enemy king has no moves and is not in check, it is stalemate.'],
  },
  {
    id: 'two-rooks',
    group: 'Checkmates',
    title: 'Two-rook ladder',
    goalText: 'Checkmate in 10 moves',
    goal: 'mate',
    fen: '8/8/8/3k4/8/8/8/R3K2R w - - 0 1',
    maxMoves: 10,
    level: 1,
    intro: 'Two rooks can climb a ladder: one cuts off a rank, the other gives check on the next.',
    tips: ['Put one rook on a rank to fence the king in, then check with the other one rank further.', 'If the king walks up to a rook, slide that rook to the far side of the board.'],
  },
  {
    id: 'rook-mate',
    group: 'Checkmates',
    title: 'Rook + king vs king',
    goalText: 'Checkmate in 30 moves',
    goal: 'mate',
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    maxMoves: 30,
    level: 2,
    intro: 'The rook builds a box around the king. Make the box smaller step by step.',
    tips: ['Cut the king off with the rook, then bring your king up.', 'When the kings stand face to face, a rook check on the side pushes the enemy king back.', 'If you have nothing to do, make a waiting move with the rook along its line.'],
  },
  {
    id: 'kp-opposition',
    group: 'Pawn endgames',
    title: 'King and pawn: win with opposition',
    goalText: 'Promote the pawn safely',
    goal: 'promote',
    fen: '4k3/8/8/8/8/4K3/4P3/8 w - - 0 1',
    maxMoves: 20,
    level: 2,
    intro: 'Your king must walk in front of the pawn. Pawn pushes come later.',
    tips: ['Lead with the king, not the pawn.', 'Take the opposition: kings facing each other with one square between, and the OTHER side to move.', 'Get your king to the 6th rank in front of the pawn — then it always wins.'],
  },
  {
    id: 'kp-hold',
    group: 'Pawn endgames',
    title: 'Hold the draw: king vs king and pawn',
    goalText: 'Draw — survive 15 moves',
    goal: 'draw',
    fen: '8/8/8/8/4k3/4p3/8/4K3 w - - 0 1',
    maxMoves: 15,
    level: 2,
    intro: 'Black wants to queen the pawn. Stay in front of it and keep the opposition.',
    tips: ['Keep your king right in front of the pawn.', 'When the pawn reaches the 2nd rank with check, go straight back — not to the side.', 'Face the enemy king (opposition) whenever you can.'],
  },
  {
    id: 'pawn-race',
    group: 'Pawn endgames',
    title: 'Win the pawn race',
    goalText: 'Promote first and win',
    goal: 'promote',
    fen: 'k7/8/8/6P1/1p6/8/8/7K w - - 0 1',
    maxMoves: 10,
    level: 1,
    intro: 'Both pawns are racing to the other side. Count the moves before you play.',
    tips: ['Count the moves: you move first, so you can queen first.', 'Do not waste time with the king. Push the pawn!', 'If your new queen can stop the black pawn (or gives check), the race is won.'],
  },
  {
    id: 'lucena',
    group: 'Rook endgames',
    title: 'Lucena: build a bridge',
    goalText: 'Promote the pawn',
    goal: 'promote',
    fen: '3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1',
    maxMoves: 20,
    level: 3,
    intro: 'Your king is stuck in front of its pawn. First cut off the black king, then build a bridge with your rook.',
    tips: ['First push the black king further away with a rook check.', 'Bring your rook to the 4th rank. It will block the checks later — that is the bridge.', 'Walk the king out, and when the checks come, put your rook in between.'],
  },
  {
    id: 'back-rank',
    group: 'Tactics',
    title: 'Back-rank finish',
    goalText: 'Checkmate in 2 moves',
    goal: 'mate',
    fen: 'r3r1k1/1q3ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
    maxMoves: 2,
    level: 1,
    intro: 'The black king has no air: its pawns block f7, g7 and h7. Use the open e-file.',
    tips: ['The rook on e8 is the only defender of the back rank.', 'Sacrifice the queen to drag the defender away.'],
  },
  {
    id: 'knight-fork',
    group: 'Tactics',
    title: 'Royal fork',
    goalText: 'Win the queen',
    goal: 'win-material',
    material: 5,
    fen: '3r2k1/5ppp/2q5/3N4/8/8/5PPP/4R1K1 w - - 0 1',
    maxMoves: 3,
    level: 1,
    intro: 'Knights love forks. Find a check that also hits the queen.',
    tips: ['Look at every square your knight can reach with check.', 'From e7 the knight attacks g8 and c6 at the same time.'],
  },
  {
    id: 'knight-fork-rook',
    group: 'Tactics',
    title: 'Fork the king and rook',
    goalText: 'Win the rook',
    goal: 'win-material',
    material: 4,
    fen: '3r3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1',
    maxMoves: 3,
    level: 1,
    intro: 'The king in the corner and the rook on d8 are both a knight jump from the same square.',
    tips: ['Look at f7: what would a knight there attack?', 'Check first, then grab the rook.'],
  },
];

export const drillById = (id: string) => DRILLS.find((d) => d.id === id);

function materialOf(g: Chess, c: Color): number {
  let s = 0;
  for (const row of g.board()) for (const p of row) if (p && p.color === c) s += VALUE[p.type];
  return s;
}

export type DrillOutcome = { done: true; success: boolean; reason: string } | { done: false };

/**
 * Decide whether the drill is over. Call after every half-move with the game so far.
 * `learner` is the side the user plays; `learnerMoves` counts the user's moves played.
 */
export function drillOutcome(d: Drill, g: Chess, learner: Color, learnerMoves: number): DrillOutcome {
  const opp: Color = learner === 'w' ? 'b' : 'w';
  const toMove = g.turn();
  if (g.isCheckmate()) {
    return toMove === opp
      ? d.goal === 'mate' || d.goal === 'win-material' || d.goal === 'promote'
        ? { done: true, success: true, reason: 'Checkmate — goal reached!' }
        : { done: true, success: true, reason: 'Checkmate!' }
      : { done: true, success: false, reason: 'You were checkmated.' };
  }
  if (g.isStalemate()) return { done: true, success: d.goal === 'draw', reason: d.goal === 'draw' ? 'Stalemate — that is a draw. Well held!' : 'Stalemate! The king had no moves but was not in check, so it is only a draw.' };
  if (g.isDraw()) return { done: true, success: d.goal === 'draw', reason: d.goal === 'draw' ? 'Draw — you held it!' : 'The game is a draw.' };

  const history = g.history({ verbose: true });
  // the opponent queened: promote / draw goals fail
  if (history.some((m) => m.promotion && m.color === opp)) return { done: true, success: false, reason: 'The other side made a new queen.' };

  if (d.goal === 'promote') {
    const promo = history.find((m) => m.promotion && m.color === learner);
    if (promo) {
      const sq = promo.to as Square;
      const ours = g.get(sq)?.color === learner;
      if (toMove === opp) {
        // just promoted: a safe new piece wins at once, otherwise wait for the reply
        if (g.attackers(sq, opp).length === 0 || g.attackers(sq, learner).length > 0) return { done: true, success: true, reason: 'Pawn promoted — goal reached!' };
      } else {
        return ours ? { done: true, success: true, reason: 'Pawn promoted — goal reached!' } : { done: true, success: false, reason: 'The new queen was captured right away.' };
      }
    }
  }

  if (d.goal === 'win-material' && toMove === learner) {
    const start = new Chess(d.fen);
    const gain = materialOf(g, learner) - materialOf(g, opp) - (materialOf(start, learner) - materialOf(start, opp));
    if (gain >= (d.material ?? 3)) return { done: true, success: true, reason: 'Material won — goal reached!' };
  }

  if (learnerMoves >= d.maxMoves && toMove === learner) {
    if (d.goal === 'draw') return { done: true, success: true, reason: `You held for ${d.maxMoves} moves — that's a draw!` };
    return { done: true, success: false, reason: `Out of moves: the goal was ${d.goalText.toLowerCase()}.` };
  }
  return { done: false };
}
