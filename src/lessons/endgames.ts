import type { Highlight, Lesson, Mark } from './types';

// ---------------------------------------------------------------------------
// Small helpers for building highlight lists (the result is still plain data).
// ---------------------------------------------------------------------------
const FILES = 'abcdefgh';

/** Every square in the rectangle spanned by two corner squares, e.g. box('e6', 'h8'). */
function box(a: string, b: string, mark: Mark): Highlight[] {
  const f1 = FILES.indexOf(a[0]);
  const f2 = FILES.indexOf(b[0]);
  const r1 = Number(a[1]);
  const r2 = Number(b[1]);
  const out: Highlight[] = [];
  for (let f = Math.min(f1, f2); f <= Math.max(f1, f2); f++) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) out.push({ sq: `${FILES[f]}${r}`, mark });
  }
  return out;
}

/** Highlight a list of squares with one colour. */
function hl(mark: Mark, ...sqs: string[]): Highlight[] {
  return sqs.map((sq) => ({ sq, mark }));
}

export const ENDGAMES: Lesson[] = [
  // =========================================================================
  // 1. Queen + King vs King
  // =========================================================================
  {
    id: 'queen-mate',
    track: 'endgames',
    category: 'endgames',
    title: 'Checkmate with King and Queen',
    level: 1,
    summary: 'Use the queen to build a shrinking box, then bring your king — and never stalemate.',
    minutes: 10,
    keyPoints: [
      'Put the queen a knight\'s jump away from the enemy king: it builds a "box" the king cannot leave.',
      'Shrink the box step by step until the king is stuck on the edge — you do not need to give check.',
      'When the king has only two squares left, STOP squeezing and walk your own king over to help.',
      'Before every queen move ask: "Does Black still have a legal move?" If not and it is not check, it is stalemate — a draw.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The queen builds a box',
        fen: '8/8/5k2/3Q4/8/4K3/8/8 w - - 0 1',
        text:
          'The queen on d5 is a knight\'s jump away from the black king on f6. From there it controls the whole d-file and the whole 5th rank, like two walls. ' +
          'The black king is locked inside the yellow box (e6–h8) and can never cross those walls. ' +
          'The winning method is simple: keep making the box smaller, then bring your king to help deliver mate.',
        highlights: [...box('e6', 'h8', 'yellow'), { sq: 'd5', mark: 'blue' }],
        arrows: [
          { from: 'd5', to: 'd8', mark: 'blue' },
          { from: 'd5', to: 'h5', mark: 'blue' },
        ],
      },
      {
        kind: 'demo',
        title: 'Shrink the box, then bring the king',
        fen: '8/8/5k2/3Q4/8/4K3/8/8 w - - 0 1',
        text: 'Watch how the queen follows the king at a knight\'s distance, taking away a row or a column each time, until the king is trapped in the corner.',
        highlights: box('e6', 'h8', 'yellow'),
        moves: [
          { san: 'Qe4', text: 'The queen shadows the king from a knight\'s jump away (e4). Now the e-file and 4th rank are the walls: the box is f5–h8.', highlights: box('f5', 'h8', 'yellow') },
          { san: 'Kf7', text: 'Black steps back, hoping to find a way out.' },
          { san: 'Qe5', text: 'Again a knight\'s jump away. The e-file and 5th rank are walls: the box shrinks to f6–h8.', highlights: box('f6', 'h8', 'yellow') },
          { san: 'Kg6', text: 'Black tries to stay near the middle of the box.' },
          { san: 'Qf4', text: 'Now the f-file becomes a wall. The king is squeezed into the g- and h-files.', highlights: box('g5', 'h8', 'yellow') },
          { san: 'Kg7', text: 'Black retreats again.' },
          { san: 'Qf5', text: 'The box is now just g6–h8 — six squares.', highlights: box('g6', 'h8', 'yellow') },
          { san: 'Kh6', text: 'The king is pushed onto the edge.' },
          { san: 'Qg4', text: 'The queen seals the g-file. The king can only move up and down the h-file.', highlights: hl('yellow', 'h6', 'h7', 'h8') },
          { san: 'Kh7', text: 'Black shuffles along the edge.' },
          { san: 'Qg5', text: 'Only h7 and h8 are left. STOP squeezing now! If the king were on h8, a move like Qg6 would leave it with no legal moves and no check — stalemate.', highlights: [...hl('yellow', 'h7', 'h8'), { sq: 'g6', mark: 'red' }] },
          { san: 'Kh8', text: 'Black shuffles between h8 and h7. It cannot escape, so now we have time.' },
          { san: 'Kf4', text: 'The queen alone cannot mate — it needs its king. March the king toward the corner.', arrows: [{ from: 'f4', to: 'f6', mark: 'green' }] },
          { san: 'Kh7', text: 'Black can only shuffle.' },
          { san: 'Kf5', text: 'The king keeps walking.' },
          { san: 'Kh8', text: 'Still shuffling — Black always has h7 or h8, so there is no stalemate.' },
          { san: 'Kf6', text: 'The king arrives. Now it protects g7.', highlights: hl('green', 'g7') },
          { san: 'Kh7', text: 'Black has nothing better.' },
          { san: 'Qg7#', text: 'Checkmate! The queen on g7 is protected by the king on f6 and covers every escape square.', highlights: [{ sq: 'g7', mark: 'green' }, { sq: 'h7', mark: 'red' }] },
        ],
      },
      {
        kind: 'try',
        title: 'Mate — but don\'t stalemate!',
        fen: 'k7/2K5/8/8/8/8/8/6Q1 w - - 0 1',
        prompt: 'White to move. Checkmate in one move. Careful: one tempting queen move is stalemate.',
        solution: ['Qa1#'],
        hints: [
          'The black king on a8 can only go to a7. Your king already covers b7 and b8.',
          'Give a check along the a-file from far away, so the queen also covers a7.',
        ],
        explain:
          'Qa1# covers the whole a-file, including a7, while your king covers b7 and b8. ' +
          'Beware Qb6?? — it takes away a7 but gives no check, so Black has no legal move: stalemate, a draw!',
        solvedAnnotations: { highlights: [{ sq: 'a1', mark: 'green' }, { sq: 'b6', mark: 'red' }], arrows: [{ from: 'a1', to: 'a8', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'Bring the king, then mate',
        fen: 'k7/8/8/2K5/8/2Q5/8/8 w - - 0 1',
        prompt: 'White to move. Mate in two. The queen cannot do it alone — which move brings your king into action?',
        solution: ['Kb6', 'Kb8', 'Qh8#'],
        hints: [
          'Your king wants to stand next to the corner, covering a7 and b7.',
          'After your king move, Black has only one square left. Then find a long-distance check along the back rank.',
        ],
        explain:
          '1.Kb6! takes away a7 and b7, so Black must play 1...Kb8. Then 2.Qh8# checks along the 8th rank while your king covers a7, b7 and c7. ' +
          'Note: 1.Qc7?? would be stalemate — always make sure the king has a square left until you give mate.',
        solvedAnnotations: { highlights: [{ sq: 'h8', mark: 'green' }, { sq: 'c7', mark: 'red' }] },
      },
      {
        kind: 'playout',
        title: 'Play it out',
        fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
        prompt: 'Checkmate the black king against the computer. Build the box with your queen, shrink it, then bring your king. Watch out for stalemate!',
        goal: 'mate',
        maxMoves: 20,
        hints: [
          'Start with a queen move that is a knight\'s jump from the black king, e.g. Qd3.',
          'Shrink the box until the king is on the edge with two squares left.',
          'Then walk your king over, and mate with the queen protected by the king.',
        ],
      },
      {
        kind: 'quiz',
        title: 'Spot the blunder',
        fen: '7k/8/8/5KQ1/8/8/8/8 w - - 0 1',
        question: 'White to move. Which of these moves throws away the win?',
        options: ['Qg6', 'Kf6', 'Kg6'],
        answer: 0,
        explain:
          'Qg6?? takes away every square from the black king (g7, g8, h7) without giving check — stalemate, a draw. ' +
          'Kf6 or Kg6 keep the win: after Black\'s only move you give mate next move.',
      },
    ],
  },

  // =========================================================================
  // 2. Rook mates: ladder (two rooks) and box (king + rook)
  // =========================================================================
  {
    id: 'rook-mates',
    track: 'endgames',
    category: 'endgames',
    title: 'Rook Mates: the Ladder and the Box',
    level: 1,
    summary: 'Mate with two rooks using the ladder, then with king and rook using the shrinking box.',
    minutes: 12,
    keyPoints: [
      'Two rooks "climb the ladder": one guards a rank, the other checks on the next rank.',
      'If the enemy king gets close to your rooks, swing them to the far side of the board.',
      'With king + rook, the rook builds a box and your king does the pushing.',
      'The rook mates on the edge when the two kings stand face to face — use a waiting rook move to make that happen.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The ladder idea',
        fen: '8/8/8/3k4/8/8/7R/1K4R1 w - - 0 1',
        text:
          'Two rooks can mate without any help from the king. One rook guards a rank so the king cannot come back, and the other rook checks on the next rank up. ' +
          'Then they swap roles, climbing like a ladder until the king is on the back rank. ' +
          'Here White starts by putting a rook on the 4th rank (Rg4) and then checks on the 5th (Rh5+).',
        arrows: [
          { from: 'g1', to: 'g4', mark: 'blue' },
          { from: 'h2', to: 'h5', mark: 'blue' },
        ],
        highlights: box('a4', 'h4', 'yellow'),
      },
      {
        kind: 'demo',
        title: 'Climbing the ladder',
        fen: '8/8/8/3k4/8/8/7R/1K4R1 w - - 0 1',
        text: 'Step through the ladder mate. Notice what happens when the black king tries to attack the rooks.',
        moves: [
          { san: 'Rg4', text: 'The g-rook guards the 4th rank. The black king is stuck on ranks 5–8.', highlights: box('a4', 'h4', 'yellow') },
          { san: 'Ke5', text: 'Black runs toward the rooks, hoping to attack them.' },
          { san: 'Rh5+', text: 'Check on the 5th rank. The 4th rank is guarded, so the king must climb to the 6th.', highlights: box('a5', 'h5', 'yellow') },
          { san: 'Kf6', text: 'Now the king is right next to g5, g6 and g7. If we played Rg6+?? the king would simply capture the rook!', highlights: hl('red', 'g6') },
          { san: 'Ra4', text: 'The fix: move the rook to the far side of the board. From a4 it can check on a6 safely, far from the king.', arrows: [{ from: 'g4', to: 'a4', mark: 'green' }] },
          { san: 'Ke6', text: 'Black cannot stop the next check.' },
          { san: 'Ra6+', text: 'Check on the 6th rank. The h5 rook still guards the 5th rank, so the king must go up again.', highlights: box('a6', 'h6', 'yellow') },
          { san: 'Kd7', text: 'The king climbs to the 7th rank.' },
          { san: 'Rh7+', text: 'The rooks swap roles: now the h-rook checks on the 7th and the a-rook guards the 6th.', highlights: box('a7', 'h7', 'yellow') },
          { san: 'Kc8', text: 'The king reaches the back rank — the end of the ladder.' },
          { san: 'Ra8#', text: 'Checkmate! The a-rook checks along the 8th rank and the h-rook guards the 7th.', highlights: [...box('a8', 'h8', 'green')] },
        ],
      },
      {
        kind: 'try',
        title: 'Your turn: climb the ladder',
        fen: '8/8/2k5/7R/6R1/8/8/K7 w - - 0 1',
        prompt: 'White to move. Mate in three with the ladder. The h5 rook already guards the 5th rank.',
        solution: ['Rg6+', 'Kd7', 'Rh7+', 'Ke8', 'Rg8#'],
        hints: [
          'The rook that is NOT guarding a rank gives the next check.',
          'Check on the 6th with the g-rook, then on the 7th with the h-rook, then on the 8th.',
        ],
        explain:
          'Rg6+ drives the king to the 7th, Rh7+ drives it to the 8th, and Rg8# finishes. ' +
          'Each time, one rook guards the rank below while the other checks on the next rank.',
        solvedAnnotations: { highlights: box('a8', 'h8', 'green') },
      },
      {
        kind: 'explain',
        title: 'King and rook: the box',
        fen: '8/8/8/5k2/3R4/8/2K5/8 w - - 0 1',
        text:
          'With only one rook you need your king too. The rook on d4 cuts the board: the black king cannot cross the d-file or the 4th rank, so it is locked in the yellow box (e5–h8). ' +
          'Your plan: bring your king closer, and whenever you can, move the rook one line closer to make the box smaller. ' +
          'At the end the black king is on the edge and the rook mates it while your king stands directly opposite.',
        highlights: [...box('e5', 'h8', 'yellow'), { sq: 'd4', mark: 'blue' }],
        arrows: [
          { from: 'd4', to: 'd8', mark: 'blue' },
          { from: 'd4', to: 'h4', mark: 'blue' },
          { from: 'c2', to: 'd3', mark: 'green' },
        ],
      },
      {
        kind: 'demo',
        title: 'Finishing off with king and rook',
        fen: '3k4/8/4K3/8/8/8/8/7R w - - 0 1',
        text: 'The final phase. The black king is near the edge. First lock it on the back rank, then chase it with your king until the kings face each other.',
        moves: [
          { san: 'Rh7', text: 'The rook guards the whole 7th rank. The black king is stuck on the 8th rank.', highlights: box('a7', 'h7', 'yellow') },
          { san: 'Kc8', text: 'Black runs away from your king. (1...Ke8 would allow Rh8# at once, because the kings would face each other.)' },
          { san: 'Kd6', text: 'Follow with your king, one step behind on the 6th rank.' },
          { san: 'Kb8', text: 'Black keeps running toward the corner.' },
          { san: 'Kc6', text: 'Keep following.' },
          { san: 'Ka8', text: 'The king reaches the corner. (1...Kc8 would allow Rh8# too.)' },
          { san: 'Kb6', text: 'The kings are now close together. Black has only one move.' },
          { san: 'Kb8', text: 'Forced: the kings now face each other on the b-file.', highlights: hl('blue', 'b6', 'b8') },
          { san: 'Rh8#', text: 'Checkmate! The rook checks along the back rank and your king on b6 covers a7, b7 and c7.', highlights: box('a8', 'h8', 'green') },
        ],
      },
      {
        kind: 'try',
        title: 'The waiting move',
        fen: '3k4/8/2K5/8/8/8/8/R7 w - - 0 1',
        prompt: 'White to move. Mate in two. The kings are not yet facing each other — find a rook move that leaves Black only one square, and that square walks into mate.',
        solution: ['Re1', 'Kc8', 'Re8#'],
        hints: [
          'Your king on c6 already covers c7 and d7. Take away the e-file from the black king.',
          'After the rook goes to the e-file, Black\'s only move is Kc8 — where it faces your king.',
        ],
        explain:
          '1.Re1! cuts off the e-file, so Black\'s only move is 1...Kc8, walking into the opposition. Then 2.Re8# is mate because your king on c6 covers b7, c7 and d7.',
        solvedAnnotations: { highlights: [{ sq: 'e8', mark: 'green' }, { sq: 'c6', mark: 'blue' }, { sq: 'c8', mark: 'blue' }] },
      },
      {
        kind: 'playout',
        title: 'Play it out: king and rook',
        fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
        prompt: 'Checkmate the computer\'s king with king and rook. Build a box with the rook, bring your king, and shrink the box.',
        goal: 'mate',
        maxMoves: 32,
        hints: [
          'Start by cutting the king off with the rook (for example Ra4 keeps it above the 4th rank).',
          'Walk your king up so it supports the rook. Move the rook one line closer whenever it is safe.',
          'If the enemy king attacks your rook, move the rook far away along the same line.',
          'When the king is on the edge, mate it with the kings face to face — use a waiting rook move if needed.',
        ],
      },
      {
        kind: 'quiz',
        title: 'When does the rook mate?',
        question: 'In the King + Rook vs King ending, the black king is on the back rank. When can the rook give mate on that rank?',
        options: [
          'When your king stands directly opposite the black king (or the black king is in the corner and your king covers its escape)',
          'Any time the rook checks on the back rank',
          'Only when your rook is protected by your king',
        ],
        answer: 0,
        explain:
          'The rook covers the whole back rank, but the king can still step forward. Your king must cover those squares, which happens when the kings face each other (or next to the corner).',
      },
    ],
  },

  // =========================================================================
  // 3. The rule of the square
  // =========================================================================
  {
    id: 'rule-of-the-square',
    track: 'endgames',
    category: 'endgames',
    title: 'The Rule of the Square',
    level: 2,
    summary: 'Know instantly whether a king can catch a runaway pawn — no counting moves needed.',
    minutes: 8,
    keyPoints: [
      'Draw a square from the pawn to its promotion square. If the defending king can step inside, it catches the pawn.',
      'The square shrinks every time the pawn moves, so whose turn it is matters.',
      'A pawn on its starting square can jump two squares: draw its square as if it were already one rank further.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Draw the square',
        fen: '8/8/8/6k1/1P6/8/8/K7 w - - 0 1',
        text:
          'The b4 pawn needs 4 moves to reach b8. Draw a square with the pawn\'s path as one side: b4 up to b8 and 4 files across to f8 (yellow). ' +
          'If the black king can step inside this square, it catches the pawn. The king on g5 is just outside. ' +
          'Here it is White\'s move: after b5 the square shrinks to b5–e8 and the king can never get in — the pawn promotes. ' +
          'If it were Black\'s move, Kf5 (or Kf4/Kf6) would step into the square and catch the pawn.',
        highlights: [...box('b4', 'f8', 'yellow'), { sq: 'g5', mark: 'red' }],
        arrows: [{ from: 'b4', to: 'b8', mark: 'green' }],
      },
      {
        kind: 'demo',
        title: 'The king steps into the square',
        fen: '8/8/6k1/8/2P5/8/8/K7 w - - 0 1',
        text: 'The c4 pawn\'s square is c4–g8, and the black king on g6 is already inside. Watch the square shrink as the pawn runs — the king stays inside every time.',
        highlights: box('c4', 'g8', 'yellow'),
        moves: [
          { san: 'c5', text: 'The pawn advances; its square shrinks to c5–f8.', highlights: box('c5', 'f8', 'yellow') },
          { san: 'Kf7', text: 'The king stays inside the new square.', highlights: box('c5', 'f8', 'yellow') },
          { san: 'c6', text: 'The square is now c6–e8.', highlights: box('c6', 'e8', 'yellow') },
          { san: 'Ke7', text: 'Still inside.', highlights: box('c6', 'e8', 'yellow') },
          { san: 'c7', text: 'The square is just c7–d8.', highlights: box('c7', 'd8', 'yellow') },
          { san: 'Kd7', text: 'The king guards the promotion square c8.', highlights: [...box('c7', 'd8', 'yellow'), { sq: 'c8', mark: 'red' }] },
          { san: 'c8=Q+', text: 'White promotes anyway...' },
          { san: 'Kxc8', text: '...and the king captures the new queen. The king was inside the square, so it caught the pawn. Draw.' },
        ],
      },
      {
        kind: 'try',
        title: 'Catch the pawn',
        fen: '7K/8/8/8/1P6/6k1/8/8 b - - 0 1',
        prompt: 'You are Black. Catch the white pawn. Each move, step into the pawn\'s square — only one move does it each time!',
        solution: ['Kf4', 'b5', 'Ke5', 'b6', 'Kd6', 'b7', 'Kc7'],
        hints: [
          'The pawn\'s square right now is b4–f8. Which king move gets you onto the f-file and the 4th rank or higher?',
          'After every pawn move, the square gets one file narrower. Move diagonally toward the promotion square.',
        ],
        explain:
          'Kf4 steps into the b4–f8 square. Then Ke5 (square b5–e8), Kd6 (square b6–d8) and Kc7 guard b8. ' +
          'The pawn is lost, and K vs K is a draw. Any other first move, such as Kg4 or Kf3, stays outside the square and the pawn promotes.',
        solvedAnnotations: { highlights: [{ sq: 'b8', mark: 'red' }, { sq: 'c7', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'The double step',
        fen: '8/8/8/8/1k6/8/7P/K7 w - - 0 1',
        prompt: 'White to move. Win the race: find the pawn move that gets outside the black king\'s reach, then keep running.',
        solution: ['h4', 'Kc5', 'h5', 'Kd6', 'h6', 'Ke7', 'h7', 'Kf7', 'h8=Q'],
        hints: [
          'A pawn on its starting square may move two squares at once.',
          'After h4 the square is d4–h8. Can the king on b4 get into it in one move?',
        ],
        explain:
          '1.h4! jumps two squares. The new square is d4–h8, and the king on b4 cannot reach the d-file in one move. After 1.h3? the square would be c3–h8, and 1...Kc4 steps in. ' +
          'Remember: for a pawn on its starting square, draw the square from the third rank.',
        solvedAnnotations: { highlights: box('d4', 'h8', 'yellow') },
      },
      {
        kind: 'quiz',
        title: 'Starting-square pawns',
        question: 'A white pawn stands on g2 (its starting square). When you draw its square, treat the pawn as if it stood on…',
        options: ['g2', 'g3', 'g4'],
        answer: 1,
        explain:
          'From g2 the pawn can jump to g4 in one move, which is the same as if it already stood on g3. So draw the square from g3: g3–g8 plus five files across.',
      },
    ],
  },

  // =========================================================================
  // 4. The opposition
  // =========================================================================
  {
    id: 'opposition',
    track: 'endgames',
    category: 'endgames',
    title: 'The Opposition',
    level: 3,
    summary: 'When kings face off, the side that does NOT have to move wins the standoff.',
    minutes: 10,
    keyPoints: [
      'Direct opposition: the kings stand on the same file (or rank) with exactly one square between them.',
      'The side that just moved into that position "has the opposition": the other king must give way.',
      'The attacker uses the opposition to push the defending king aside and walk forward.',
      'The defender uses it too: keep facing the enemy king and it can never get past you.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Kings face to face',
        fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1',
        text:
          'The kings on e4 and e6 stand face to face with one square (e5) between them. Kings can never stand next to each other, so neither can step onto e5, d5 or f5 if the other king covers it. ' +
          'This is called the opposition. The side that does NOT have to move "has the opposition". ' +
          'Here White is to move, so Black has the opposition: whatever White does, Black can answer by facing the white king again, and White makes no progress (draw). ' +
          'If it were Black to move, the black king would have to step aside and the white king would march forward and win.',
        highlights: [
          { sq: 'e4', mark: 'blue' },
          { sq: 'e6', mark: 'blue' },
          ...hl('red', 'd5', 'e5', 'f5'),
        ],
      },
      {
        kind: 'demo',
        title: 'Taking the opposition',
        fen: '8/8/8/3k4/8/8/2KP4/8 w - - 0 1',
        text:
          'White wants to reach one of the green squares (c4, d4, e4) in front of the pawn — from there the pawn is sure to promote. The black king guards them all. White uses the opposition to get past.',
        highlights: hl('green', 'c4', 'd4', 'e4'),
        moves: [
          { san: 'Kd3', text: 'White takes the opposition: kings on d3 and d5, one square apart, and Black must move.', highlights: [...hl('blue', 'd3', 'd5'), { sq: 'd4', mark: 'red' }] },
          { san: 'Kc5', text: 'Black has to give way. It steps to one side…' },
          { san: 'Ke4', text: '…so White steps round the other side (outflanking) and reaches e4, a key square.', highlights: hl('green', 'e4') },
          { san: 'Kd6', text: 'Black tries to block the way forward.' },
          { san: 'Kd4', text: 'Opposition again: kings on d4 and d6, Black to move.', highlights: hl('blue', 'd4', 'd6') },
          { san: 'Ke6', text: 'Black must give way again.' },
          { san: 'Kc5', text: 'White outflanks on the other side and marches ahead of its pawn. The pawn will follow and promote.' },
        ],
      },
      {
        kind: 'try',
        title: 'Take the opposition',
        fen: '8/8/8/4k3/8/8/3KP3/8 w - - 0 1',
        prompt: 'White to move. Only one move wins. Put the kings face to face so that Black has to give way.',
        solution: ['Ke3'],
        hints: [
          'Put your king on the same file as the black king, with exactly one square between them.',
          'The black king is on e5. Where does your king need to stand?',
        ],
        explain:
          'Ke3! takes the opposition. Black must give way: after 1...Kd5 2.Kf4 or 1...Kf5 2.Kd4, the white king reaches a key square in front of the pawn and wins. ' +
          'Pushing the pawn (e3 or e4) or any other king move lets Black keep the opposition and draw.',
        solvedAnnotations: { highlights: [...hl('blue', 'e3', 'e5'), { sq: 'e4', mark: 'red' }] },
      },
      {
        kind: 'try',
        title: 'Defend with the opposition',
        fen: '8/4k3/8/8/4K3/4P3/8/8 b - - 0 1',
        prompt: 'You are Black. Save the game! Take the opposition, and keep it when White tries to go round.',
        solution: ['Ke6', 'Kd4', 'Kd6'],
        hints: [
          'Face the white king with one square in between.',
          'When the white king steps sideways, step sideways too so you face it again.',
        ],
        explain:
          '1...Ke6! takes the opposition. When White tries 2.Kd4, Black answers 2...Kd6!, again face to face. The white king can never get past, so it is a draw. ' +
          'Any other first move, like 1...Kd6 or 1...Kf6, lets the white king step forward (Kf5 or Kd5) and White wins.',
        solvedAnnotations: { highlights: hl('blue', 'd4', 'd6') },
      },
      {
        kind: 'quiz',
        title: 'Who has the opposition?',
        fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1',
        question: 'Kings on e4 and e6, and it is White\'s move. Who has the opposition?',
        options: ['White', 'Black', 'Nobody — the kings are not facing each other'],
        answer: 1,
        explain:
          'The side NOT to move has the opposition. White must move and give way, so Black has it. This position is a draw.',
      },
      {
        kind: 'quiz',
        title: 'Outflanking',
        question: 'You have the opposition and the enemy king steps to the left. What do you usually do?',
        options: ['Step to the right and go forward (outflank)', 'Follow it to the left', 'Push your pawn right away'],
        answer: 0,
        explain:
          'When the defending king gives way to one side, the attacking king goes past on the other side. That is called outflanking.',
      },
    ],
  },

  // =========================================================================
  // 5. King + Pawn vs King
  // =========================================================================
  {
    id: 'king-pawn-vs-king',
    track: 'endgames',
    category: 'endgames',
    title: 'King and Pawn vs King',
    level: 3,
    summary: 'Key squares tell you whether K+P vs K wins. Learn the winning method, the drawing defence and the rook-pawn exception.',
    minutes: 14,
    keyPoints: [
      'For a pawn on the 2nd–4th rank, the key squares are the three squares two ranks in front of it. Reach one with your king and you win.',
      'Lead with the king, not the pawn: king in front, pawn behind.',
      'The defender draws by staying in front of the pawn and keeping the opposition; with the pawn on the 7th it often ends in stalemate.',
      'A rook pawn (a- or h-pawn) is usually a draw if the defending king reaches the corner.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Key squares',
        fen: '8/4k3/8/8/4P3/8/8/4K3 w - - 0 1',
        text:
          'For a pawn on e4, the key squares are d6, e6 and f6 (green) — the three squares two ranks in front of it. ' +
          'If the white king reaches any of them, White wins, no matter whose move it is. ' +
          'For a pawn on e2 or e3 the key squares are likewise two ranks ahead (d4–f4 or d5–f5). ' +
          'So in K+P vs K, the fight is really about the kings: can the attacker get to a key square, or can the defender keep it away?',
        highlights: [...hl('green', 'd6', 'e6', 'f6'), { sq: 'e4', mark: 'yellow' }],
      },
      {
        kind: 'demo',
        title: 'The winning method',
        fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
        text: 'The white king leads, the pawn follows. Watch how the king clears the way.',
        highlights: hl('green', 'd6', 'e6', 'f6'),
        moves: [
          { san: 'Ke6', text: 'The king steps onto a key square, and it also takes the opposition against e8.', highlights: [...hl('green', 'e6'), { sq: 'e8', mark: 'blue' }] },
          { san: 'Kf8', text: 'Black must give way.' },
          { san: 'Kd7', text: 'The king takes control of e7 and e8 — the path of the pawn.', highlights: hl('green', 'e7', 'e8') },
          { san: 'Kf7', text: 'Black cannot get back in front of the pawn.' },
          { san: 'e5', text: 'Now the pawn walks up, protected by its king.' },
          { san: 'Kf8', text: 'Black waits.' },
          { san: 'e6', text: 'On it goes.' },
          { san: 'Kg7', text: 'Nothing can stop the pawn.' },
          { san: 'e7', text: 'The white king covers e8.' },
          { san: 'Kf7', text: 'Black attacks e8 too, but the white king defends it.' },
          { san: 'e8=Q+', text: 'A new queen, protected by the king. White wins.' },
        ],
      },
      {
        kind: 'try',
        title: 'Reach a key square',
        fen: '8/4k3/8/5K2/4P3/8/8/8 w - - 0 1',
        prompt: 'White to move. The key squares are d6, e6 and f6. Only one move wins — find it.',
        solution: ['Ke5'],
        hints: [
          'The black king guards all three key squares right now. Use the opposition.',
          'Face the black king with one square between you, so that Black must give way.',
        ],
        explain:
          '1.Ke5! takes the opposition. Black must step aside, and then the white king goes to a key square on the other side (1...Kd7 2.Kf6, or 1...Kf7 2.Kd6). ' +
          'Pushing the pawn with 1.e5? lets Black keep the opposition and draw.',
        solvedAnnotations: { highlights: [...hl('blue', 'e5', 'e7'), ...hl('green', 'd6', 'e6', 'f6')] },
      },
      {
        kind: 'try',
        title: 'The drawing defence',
        fen: '4k3/8/3KP3/8/8/8/8/8 b - - 0 1',
        prompt: 'You are Black. The pawn is on the 6th rank. Find the only drawing defence.',
        solution: ['Kd8', 'e7+', 'Ke8'],
        hints: [
          'Take the opposition against the white king on d6.',
          'After the pawn checks you, stay in front of it.',
        ],
        explain:
          '1...Kd8! takes the opposition. After 2.e7+ Ke8 White can only protect the pawn with 3.Ke6 — and that is stalemate! ' +
          'The wrong move 1...Kf8? loses to 2.Kd7, when the pawn walks through to e8.',
        solvedAnnotations: { highlights: [...hl('blue', 'd6', 'd8'), { sq: 'e8', mark: 'green' }] },
      },
      {
        kind: 'explain',
        title: 'The rook-pawn exception',
        fen: '8/2k5/8/8/P7/1K6/8/8 w - - 0 1',
        text:
          'Rook pawns (a- and h-pawns) are special. If the defending king gets to the corner in front of the pawn (red squares), White cannot win: the king cannot be forced out, and trying usually ends in stalemate. ' +
          'Here Black simply heads for b8 and a8, and it is a draw even though White has a king right next to the pawn. ' +
          'With any other pawn the attacker has room on both sides to go round; on the edge, there is only one side.',
        highlights: [...hl('red', 'a8', 'b8', 'b7'), { sq: 'a4', mark: 'yellow' }],
        arrows: [{ from: 'c7', to: 'b8', mark: 'red' }],
      },
      {
        kind: 'playout',
        title: 'Play it out: promote the pawn',
        fen: '4k3/8/8/8/8/4K3/4P3/8 w - - 0 1',
        prompt: 'Win against the computer by promoting your pawn. Remember: king first, pawn second. The key squares for the e2 pawn are d4, e4 and f4.',
        goal: 'promote',
        maxMoves: 20,
        hints: [
          'Bring the king forward first (to e4 and beyond). Do not rush the pawn.',
          'Use the opposition to push the black king aside, and aim for the 6th rank in front of your pawn.',
          'Move the pawn up only when your king already controls the squares ahead of it.',
        ],
      },
      {
        kind: 'quiz',
        title: 'Rook pawn',
        fen: '1k6/8/1K6/P7/8/8/8/8 w - - 0 1',
        question: 'White has an extra a-pawn and the black king is on b8. What is the result with best play?',
        options: ['Draw', 'White wins', 'Black wins'],
        answer: 0,
        explain:
          'The black king just shuffles between a8 and b8. White cannot drive it out of the corner without stalemating it, so the rook pawn only draws.',
      },
    ],
  },

  // =========================================================================
  // 6. Active king & outside passed pawn
  // =========================================================================
  {
    id: 'active-king-outside-passer',
    track: 'endgames',
    category: 'endgames',
    title: 'Active King and the Outside Passed Pawn',
    level: 4,
    summary: 'In the endgame your king is a fighting piece. An outside passed pawn drags the enemy king away while yours feasts.',
    minutes: 12,
    keyPoints: [
      'In the endgame the king is a strong attacking piece — march it toward the action.',
      'An outside passed pawn (far from the other pawns) works as a decoy: the enemy king must chase it.',
      'While the enemy king is busy, your king eats the pawns on the other side.',
      'You can create a passed pawn with a pawn breakthrough — count the moves first!',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The outside passed pawn',
        fen: '8/8/4k1p1/7p/P3K2P/6P1/8/8 w - - 0 1',
        text:
          'Material is level on the kingside (two pawns each), but White has an extra pawn on a4 — a passed pawn far away from everything else. ' +
          'Black\'s king must go and stop it. When it does, it abandons its own pawns on g6 and h5, and the white king (already active on e4) goes to eat them. ' +
          'This is why an outside passed pawn is often decisive in a king-and-pawn ending.',
        highlights: [{ sq: 'a4', mark: 'green' }, ...hl('red', 'g6', 'h5'), { sq: 'e4', mark: 'blue' }],
        arrows: [
          { from: 'a4', to: 'a8', mark: 'green' },
          { from: 'e4', to: 'g5', mark: 'blue' },
        ],
      },
      {
        kind: 'demo',
        title: 'Decoy, then invade',
        fen: '8/8/4k1p1/7p/P3K2P/6P1/8/8 w - - 0 1',
        text: 'White pushes the a-pawn to lure the black king away, then the white king goes to the other side.',
        moves: [
          { san: 'a5', text: 'The pawn runs. The black king must go after it.' },
          { san: 'Kd6', text: 'Black heads toward the a-pawn.' },
          { san: 'a6', text: 'Keep pushing, so the black king has to go all the way.' },
          { san: 'Kc6', text: 'Black stays inside the pawn\'s square.' },
          { san: 'a7', text: 'One more step — the king must go to b7 to stop it.' },
          { san: 'Kb7', text: 'The black king is now far away on the queenside.' },
          { san: 'Kf4', text: 'The decoy has done its job. Now the white king heads for the kingside pawns.', arrows: [{ from: 'f4', to: 'g5', mark: 'blue' }] },
          { san: 'Kxa7', text: 'Black wins the a-pawn, but it took many moves.' },
          { san: 'Kg5', text: 'The white king attacks g6.' },
          { san: 'Kb6', text: 'The black king rushes back, but it is much too slow.' },
          { san: 'Kxg6', text: 'One pawn falls…' },
          { san: 'Kc5', text: 'Black is still far away.' },
          { san: 'Kxh5', text: '…and the other. White has two connected passed pawns and the black king is miles away. White wins easily.' },
        ],
      },
      {
        kind: 'try',
        title: 'Activate your king',
        fen: '8/2k5/p5p1/7p/P6P/4K1P1/8/8 w - - 0 1',
        prompt: 'White to move. The black king is far away on the queenside. Only one move wins — where should your king go?',
        solution: ['Kf4'],
        hints: [
          'Look for weak black pawns your king can attack.',
          'The g6 and h5 pawns are close to your king. Head for g5.',
        ],
        explain:
          '1.Kf4! heads for g5, where the king attacks the g6 pawn (and then h5). The black king is too far away to defend them. ' +
          'Slow moves like Kf3 or g4 give Black time to bring the king over and hold the draw.',
        solvedAnnotations: { arrows: [{ from: 'f4', to: 'g5', mark: 'green' }], highlights: hl('red', 'g6', 'h5') },
      },
      {
        kind: 'try',
        title: 'Create a passed pawn: the breakthrough',
        fen: '8/ppp3k1/8/PPP5/8/8/8/7K w - - 0 1',
        prompt: 'White to move. Three pawns face three pawns, and the kings are far away. Find the breakthrough that creates an unstoppable passed pawn.',
        solution: ['b6', 'cxb6', 'a6', 'bxa6', 'c6'],
        hints: [
          'Sacrifice the middle pawn first.',
          'After 1.b6, whichever pawn captures, push the pawn on the side where the capture came from.',
        ],
        explain:
          '1.b6! If 1...cxb6 then 2.a6! bxa6 3.c6 and the c-pawn runs to c8 — the black king on g7 is outside its square. ' +
          '(If 1...axb6, then 2.c6! bxc6 3.a6 wins the same way.) Any other move lets the black king come over and win the white pawns.',
        solvedAnnotations: { arrows: [{ from: 'c6', to: 'c8', mark: 'green' }] },
      },
      {
        kind: 'quiz',
        title: 'Why the outside pawn?',
        question: 'Why is an outside passed pawn so strong in a king-and-pawn ending?',
        options: [
          'It pulls the enemy king away from the other pawns, so your king can win them',
          'Pawns on the edge promote faster',
          'It cannot be attacked by the enemy king',
        ],
        answer: 0,
        explain:
          'The enemy king has to go and stop the far-away pawn. That costs it many moves, and meanwhile your king takes the pawns it left behind.',
      },
    ],
  },

  // =========================================================================
  // 7. Rook behind the passed pawn & cutting off the king
  // =========================================================================
  {
    id: 'rook-behind-passer',
    track: 'endgames',
    category: 'endgames',
    title: 'Rooks Behind Passed Pawns',
    level: 4,
    summary: 'The Tarrasch rule — put rooks behind passed pawns — and cutting off the enemy king with your rook.',
    minutes: 12,
    keyPoints: [
      'Tarrasch rule: rooks belong BEHIND passed pawns — your own or your opponent\'s.',
      'A rook behind its pawn gets more active as the pawn advances; a rook in front gets more passive.',
      'A defending rook stuck in front of a pawn ties its king down too.',
      'Cut the enemy king off from the pawn with your rook along a file — the further away, the better.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The Tarrasch rule',
        fen: 'r7/5pkp/6p1/P7/8/6P1/5PKP/R7 w - - 0 1',
        text:
          'White has a passed a-pawn. White\'s rook stands BEHIND it (a1): every time the pawn moves forward, the rook controls more squares. ' +
          'Black\'s rook stands IN FRONT of the pawn (a8): as the pawn advances, the black rook gets squeezed and can only wait. ' +
          'This is the Tarrasch rule: put your rook behind passed pawns — your own ones to push them, and the opponent\'s ones to stop them.',
        highlights: [{ sq: 'a1', mark: 'green' }, { sq: 'a8', mark: 'red' }, { sq: 'a5', mark: 'yellow' }],
        arrows: [{ from: 'a1', to: 'a5', mark: 'green' }],
      },
      {
        kind: 'demo',
        title: 'The rook pushes, the skewer punishes',
        fen: 'r7/6k1/6p1/P7/8/6P1/6K1/R7 w - - 0 1',
        text: 'Watch the pawn advance with the rook behind it — and a classic trick when the black king wanders onto the wrong rank.',
        moves: [
          { san: 'a6', text: 'The pawn advances, still protected by the rook from behind.' },
          { san: 'Kf6', text: 'Black brings the king toward the centre.' },
          { san: 'a7', text: 'Now the black rook is totally stuck on a8. If it ever leaves, the pawn promotes.' },
          { san: 'Ke7', text: 'Black wants to bring the king to the a-pawn. But this steps onto the 7th rank…', highlights: hl('red', 'e7') },
          { san: 'Rh1', text: 'The rook leaves the a-file with a threat: Rh8, attacking the black rook.', arrows: [{ from: 'h1', to: 'h8', mark: 'blue' }] },
          { san: 'Kd7', text: 'Black continues toward the pawn, but the king is still on the 7th rank.' },
          { san: 'Rh8', text: 'Attacking the rook on a8. Black must take the pawn…' },
          { san: 'Rxa7', text: '…but now the black king and rook stand on the same rank.', highlights: hl('red', 'd7', 'a7') },
          { san: 'Rh7+', text: 'Skewer! The rook checks the king along the 7th rank.', arrows: [{ from: 'h7', to: 'a7', mark: 'red' }] },
          { san: 'Kc6', text: 'The king has to move…' },
          { san: 'Rxa7', text: '…and White wins the rook. With the pawn on the 7th, the black king must stay on g7 or h7 to avoid this trick — so it can never reach the pawn.' },
        ],
      },
      {
        kind: 'try',
        title: 'Where does the rook belong?',
        fen: '8/5pkp/6p1/Pr6/8/6P1/5PKP/2R5 w - - 0 1',
        prompt: 'White to move. Black\'s rook attacks the a5 pawn. Defend it the right way.',
        solution: ['Ra1'],
        hints: ['Follow the Tarrasch rule.', 'Put the rook behind the pawn, on the a-file.'],
        explain:
          'Ra1! protects the pawn from behind. Now the pawn is ready to advance, and every step makes the white rook stronger and the black rook weaker. ' +
          'Other moves, like pushing a6 at once or defending from the side, give Black time to round up the pawn.',
        solvedAnnotations: { arrows: [{ from: 'a1', to: 'a5', mark: 'green' }] },
      },
      {
        kind: 'explain',
        title: 'Cutting off the king',
        fen: '1r6/8/8/6k1/3P4/2K5/8/5R2 w - - 0 1',
        text:
          'Rooks are also great at building walls. Here White\'s rook on the f-file cuts the black king off: the king on g5 cannot cross the f-file to reach the d-pawn. ' +
          'Now White can bring the king and pawn forward while the black king watches from the side. ' +
          'The more files between the defending king and the pawn, the easier the win.',
        highlights: [...box('f1', 'f8', 'red'), { sq: 'd4', mark: 'green' }, { sq: 'g5', mark: 'blue' }],
      },
      {
        kind: 'try',
        title: 'Cut the king off',
        fen: '1r6/8/8/6k1/3P4/2K5/8/R7 w - - 0 1',
        prompt: 'White to move. The black king wants to run to your d-pawn. Stop it with one rook move — only one move wins.',
        solution: ['Rf1'],
        hints: [
          'Build a wall between the black king and the pawn.',
          'Put the rook on the file right next to the black king, keeping it as far from the pawn as possible.',
        ],
        explain:
          'Rf1! cuts the king off along the f-file. It is now two files away from the d-pawn, and White can push the pawn with king support. ' +
          'Re1 only cuts it off on the e-file (one file away) and the king gets close enough to defend. A pawn move like d5 lets the king come over at once.',
        solvedAnnotations: { highlights: box('f1', 'f8', 'green') },
      },
      {
        kind: 'quiz',
        title: 'Tarrasch rule',
        question: 'Your opponent has a dangerous passed pawn. Where is the best place for your rook to stop it?',
        options: ['Behind the pawn', 'Directly in front of the pawn', 'Next to the pawn, on the same rank'],
        answer: 0,
        explain:
          'Behind the pawn. The further the pawn advances, the more squares your rook controls — and the pawn is attacked the whole time. A rook in front of it becomes a passive blocker.',
      },
    ],
  },

  // =========================================================================
  // 8. Philidor position
  // =========================================================================
  {
    id: 'philidor-position',
    track: 'endgames',
    category: 'endgames',
    title: 'The Philidor Position',
    level: 5,
    summary: 'Draw a rook ending a pawn down with the famous third-rank defence.',
    minutes: 12,
    keyPoints: [
      'Keep your king on the queening square and your rook on your 3rd rank (the 6th rank for Black).',
      'That rook stops the enemy king from coming forward. Just wait along that rank.',
      'As soon as the pawn steps onto your 3rd rank, drop the rook to the back and check from behind.',
      'The attacking king has no shelter from checks, so it is a draw.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The third-rank defence',
        fen: '4k3/R7/7r/3KP3/8/8/8/8 w - - 0 1',
        text:
          'White has an extra pawn, but this is a draw. Black\'s king stands on the queening square e8, and the black rook guards the 6th rank (yellow) — Black\'s "third rank". ' +
          'The white king cannot step forward to d6, e6 or f6, so it cannot support the pawn. Black simply waits with the rook along the 6th rank. ' +
          'If White pushes e6 to take those squares away from the rook, the pawn no longer shelters its king — and the black rook starts checking from behind.',
        highlights: [...box('a6', 'h6', 'yellow'), { sq: 'e8', mark: 'green' }, ...hl('red', 'd6', 'e6', 'f6')],
      },
      {
        kind: 'demo',
        title: 'The Philidor defence in action',
        fen: '4k3/R7/7r/3KP3/8/8/8/8 w - - 0 1',
        text: 'Black waits on the 6th rank, then switches to checks from behind the moment the pawn advances.',
        moves: [
          { san: 'Rb7', text: 'White looks for a way forward.' },
          { san: 'Ra6', text: 'Black just waits, keeping the rook on the 6th rank.', highlights: box('a6', 'h6', 'yellow') },
          { san: 'e6', text: 'White pushes the pawn to the 6th to block the rook\'s rank. But now the pawn no longer shields the white king from behind.' },
          { san: 'Ra1', text: 'The key moment: the rook drops to the back and gets ready to check from far away.', arrows: [{ from: 'a6', to: 'a1', mark: 'green' }] },
          { san: 'Kd6', text: 'White threatens Rb8 mate.' },
          { san: 'Rd1+', text: 'Check from behind! The white king has no shelter.' },
          { san: 'Ke5', text: 'The king steps away from the checks…' },
          { san: 'Re1+', text: '…and the rook follows.' },
          { san: 'Kd6', text: 'White cannot escape.' },
          { san: 'Rd1+', text: 'The checks go on forever. Draw!' },
        ],
      },
      {
        kind: 'try',
        title: 'The pawn has advanced',
        fen: '4k3/R7/4P2r/3K4/8/8/8/8 b - - 0 1',
        prompt: 'You are Black. White has just pushed e6. Find the defence: where does your rook go now?',
        solution: ['Rh1'],
        alsoAccept: ['Rh2', 'Rh3', 'Rh4'],
        hints: [
          'The rook is no longer needed on the 6th rank.',
          'Get the rook far behind the white king, ready to check it from behind.',
        ],
        explain:
          'Rh1! (or another quiet move down the h-file) gets ready to check the white king from behind. It has no shelter, so it can never escape the checks. ' +
          'Staying passive, e.g. 1...Kf8? 2.Kd6, lets White set up a winning position.',
        solvedAnnotations: { arrows: [{ from: 'h6', to: 'h1', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'Check from behind',
        fen: '4k3/R7/3KP3/8/8/8/8/7r b - - 0 1',
        prompt: 'You are Black. White threatens Ra8 mate. Only one move saves the game.',
        solution: ['Rd1+'],
        hints: ['Start checking.', 'The white king has no shelter from a check along the d-file.'],
        explain:
          'Rd1+! starts the checks from behind. The king has nowhere to hide: if it goes to e5 the rook checks on the e-file, and if it goes back to e6, again Rd1+ or Re1+. Draw. ' +
          'Any other move allows Ra8# or a winning attack.',
        solvedAnnotations: { arrows: [{ from: 'd1', to: 'd6', mark: 'green' }] },
      },
      {
        kind: 'quiz',
        title: 'When to leave the third rank',
        question: 'In the Philidor defence, when should Black\'s rook leave the 6th rank?',
        options: [
          'As soon as the white pawn steps onto the 6th rank',
          'As soon as White gives the first check',
          'Never — it must stay on the 6th rank all game',
        ],
        answer: 0,
        explain:
          'Once the pawn is on the 6th, the rook cannot use that rank anyway, and the white king has lost its shelter. That is the moment to go to the back and check from behind.',
      },
    ],
  },

  // =========================================================================
  // 9. Lucena position
  // =========================================================================
  {
    id: 'lucena-position',
    track: 'endgames',
    category: 'endgames',
    title: 'The Lucena Position: Building a Bridge',
    level: 5,
    summary: 'The most important winning technique in rook endings: free your king and block the checks with a rook "bridge".',
    minutes: 14,
    keyPoints: [
      'Lucena: your pawn is on the 7th, your king in front of it, and the enemy king is cut off.',
      'First push the enemy king one file further away with a rook check.',
      'Put your rook on the 4th rank — the "bridge".',
      'Walk your king out; when the checks run out of room, block with the rook on the 4th rank.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The problem',
        fen: '3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1',
        text:
          'White is about to promote, but the white king is stuck on d8 in front of its own pawn. The black rook on c2 stops it from going to the c-file, and the black king on f7 guards e7 and e8. ' +
          'If the white king walks out, the black rook will check it again and again. ' +
          'The solution has two steps: push the black king further away with a check, then build a "bridge" with the rook on the 4th rank to block the checks later.',
        highlights: [{ sq: 'd8', mark: 'blue' }, { sq: 'd7', mark: 'yellow' }, ...hl('red', 'c7', 'c8', 'e7', 'e8')],
      },
      {
        kind: 'demo',
        title: 'Building the bridge',
        fen: '3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1',
        text: 'Step through the full technique.',
        moves: [
          { san: 'Rf1+', text: 'Step 1: check the black king to push it one more file away.' },
          { san: 'Kg7', text: 'The king has to leave the f-file. Now it is two files from the pawn.' },
          { san: 'Rf4', text: 'Step 2: the bridge! The rook goes to the 4th rank. It will block the checks later.', highlights: box('a4', 'h4', 'yellow') },
          { san: 'Rc1', text: 'Black waits. (Checking now does not help: the rook checks run out soon.)' },
          { san: 'Ke7', text: 'The white king leaves the queening square.' },
          { san: 'Re1+', text: 'Black starts checking from behind.' },
          { san: 'Kd6', text: 'The king walks down toward the rook on f4.' },
          { san: 'Rd1+', text: 'Another check.' },
          { san: 'Ke6', text: 'Stepping to the side, still guarding the pawn.' },
          { san: 'Re1+', text: 'Check again.' },
          { san: 'Kd5', text: 'The king reaches the 5th rank, next to the bridge.' },
          { san: 'Rd1+', text: 'One last check…' },
          { san: 'Rd4', text: 'The bridge! The rook blocks the check, protected by the king. Nothing can stop d8=Q now.', highlights: [{ sq: 'd4', mark: 'green' }], arrows: [{ from: 'd7', to: 'd8', mark: 'green' }] },
        ],
      },
      {
        kind: 'try',
        title: 'Walk out and block (mirrored)',
        fen: '8/1k1KP3/8/8/2R5/8/8/3r4 w - - 0 1',
        prompt: 'White to move. This is the same technique mirrored: the bridge rook is already on c4. Walk the king out of the checks and finish with the bridge.',
        solution: ['Ke6', 'Re1+', 'Kd6', 'Rd1+', 'Ke5', 'Re1+', 'Re4'],
        hints: [
          'Walk your king toward your rook on the 4th rank, staying next to the pawn.',
          'Zig-zag: e6, d6, e5 — then block the last check with the rook.',
        ],
        explain:
          '1.Ke6 Re1+ 2.Kd6 Rd1+ 3.Ke5 Re1+ 4.Re4! The rook blocks the check, protected by the king, and the pawn promotes. This is the bridge.',
        solvedAnnotations: { highlights: [{ sq: 'e4', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'The bridge as Black',
        fen: '4R3/8/8/5r2/8/4k3/3p2K1/8 b - - 0 1',
        prompt: 'You are Black, and you are the one with the pawn now. Your king is in check. Step toward your rook, then finish with the bridge.',
        solution: ['Kd4', 'Rd8+', 'Rd5'],
        hints: ['Move your king next to the 5th rank, where your rook is waiting.', 'When the next check comes, block it with the rook.'],
        explain:
          '1...Kd4! 2.Rd8+ Rd5! The rook on the 5th rank (Black\'s "4th rank") blocks the check with the king\'s protection, and ...d1=Q follows.',
        solvedAnnotations: { highlights: [{ sq: 'd5', mark: 'green' }] },
      },
      {
        kind: 'playout',
        title: 'Play it out: win the Lucena',
        fen: '3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1',
        prompt: 'Promote your pawn against the computer. Check the king away, build the bridge on the 4th rank, then walk your king out.',
        goal: 'promote',
        maxMoves: 20,
        hints: [
          'Rf1+ first, to push the black king away from the pawn.',
          'Then Rf4 — the bridge.',
          'Walk the king out (Ke7, Kd6, Ke6, Kd5) and block the last check with the rook on d4.',
        ],
      },
      {
        kind: 'quiz',
        title: 'Why the 4th rank?',
        question: 'Why does White put the bridge rook on the 4th rank?',
        options: [
          'So the king can walk down to the 5th rank and then block the checks with the rook',
          'To attack the black king',
          'To protect the pawn from the side',
        ],
        answer: 0,
        explain:
          'The white king zig-zags down to the 5th rank. When Black checks again, the rook on the 4th rank steps in front of the king to block, protected by the king. The checks are over and the pawn promotes.',
      },
    ],
  },
];
