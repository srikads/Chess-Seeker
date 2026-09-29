import type { Lesson } from './types';

export const TACTICS: Lesson[] = [
  // ───────────────────────────────────────────────────────────── 1. FORK
  {
    id: 'fork',
    track: 'tactics',
    category: 'tactics',
    title: 'The Fork',
    level: 1,
    summary: 'One piece attacks two targets at once — the opponent can only save one.',
    minutes: 10,
    keyPoints: [
      'A fork is one piece attacking two (or more) targets at the same time. The opponent usually can only save one.',
      'Knights are the best forkers: they jump, and nothing they attack can hit them back in the same way.',
      'Spot it: look for enemy pieces a knight-jump apart from one square — especially the king plus a loose piece (a "royal fork").',
      'Pawns and queens fork too. Checks make forks unstoppable, because the opponent must answer the check first.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'One piece, two targets',
        fen: 'r3k3/pp3ppp/8/1N6/8/8/PPP2PPP/4K3 w - - 0 1',
        text:
          'The white knight on b5 can jump to c7. From c7 it would attack BOTH the black king on e8 and the rook on a8. ' +
          'Because the king is in check, Black must move it — and then the knight takes the rook. ' +
          'A fork that includes a check is called a royal fork, and it is almost always decisive. Nothing black guards c7, so the knight lands safely.',
        highlights: [
          { sq: 'b5', mark: 'blue' },
          { sq: 'c7', mark: 'green' },
          { sq: 'e8', mark: 'red' },
          { sq: 'a8', mark: 'red' },
        ],
        arrows: [
          { from: 'b5', to: 'c7', mark: 'green' },
          { from: 'c7', to: 'e8', mark: 'red' },
          { from: 'c7', to: 'a8', mark: 'red' },
        ],
      },
      {
        kind: 'demo',
        title: 'The pawn fork trick',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4',
        text:
          'A famous opening idea. Black seems to throw a knight away on e4 — but a pawn fork gets it back. Pawns fork too: a pawn attacks two squares diagonally in front of it.',
        highlights: [{ sq: 'e4', mark: 'yellow' }],
        moves: [
          {
            san: 'Nxe4',
            text: 'Black grabs the e4 pawn. It looks like the knight will simply be lost to Nxe4…',
            highlights: [{ sq: 'e4', mark: 'yellow' }],
          },
          {
            san: 'Nxe4',
            text: 'White takes the knight. Black is a piece down — for one move.',
            highlights: [{ sq: 'e4', mark: 'red' }],
          },
          {
            san: 'd5',
            text: 'The fork! The d5 pawn attacks the bishop on c4 AND the knight on e4. White can only save one of them.',
            highlights: [
              { sq: 'd5', mark: 'blue' },
              { sq: 'c4', mark: 'red' },
              { sq: 'e4', mark: 'red' },
            ],
            arrows: [
              { from: 'd5', to: 'c4', mark: 'red' },
              { from: 'd5', to: 'e4', mark: 'red' },
            ],
          },
          {
            san: 'Bd3',
            text: 'White saves the bishop, and it protects the knight — but the pawn still attacks it.',
            highlights: [{ sq: 'd3', mark: 'yellow' }],
          },
          {
            san: 'dxe4',
            text: 'Black wins the piece back.',
            highlights: [{ sq: 'e4', mark: 'green' }],
          },
          {
            san: 'Bxe4',
            text: 'Material is level again, and Black has a free, open game. The fork turned a "blunder" into a sound trick.',
          },
        ],
      },
      {
        kind: 'try',
        title: 'Royal fork',
        fen: '3r2k1/5ppp/2q5/3N4/8/8/5PPP/4R1K1 w - - 0 1',
        prompt: 'White to move. Find the knight move that checks the king and attacks the queen at the same time.',
        solution: ['Ne7+'],
        hints: [
          'The black king is on g8 and the queen is on c6. Which square is a knight-jump from both?',
          'Look at e7: a knight there touches g8 and c6.',
        ],
        explain:
          'Ne7+ is a royal fork: the knight checks the king on g8 and attacks the queen on c6. After the king moves, Nxc6 wins the queen for nothing.',
        solvedAnnotations: {
          highlights: [
            { sq: 'e7', mark: 'blue' },
            { sq: 'g8', mark: 'red' },
            { sq: 'c6', mark: 'red' },
          ],
          arrows: [
            { from: 'e7', to: 'g8', mark: 'red' },
            { from: 'e7', to: 'c6', mark: 'red' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Pawn fork',
        fen: '2r3k1/pp3ppp/8/4p3/8/3N1N2/PP3PPP/6K1 b - - 0 1',
        prompt: 'Black to move. Both white knights attack your e5 pawn. Turn the tables with a fork, then collect a piece.',
        solution: ['e4', 'Nde1', 'exf3'],
        hints: [
          'A pawn attacks the two squares diagonally in front of it.',
          'If your pawn stood on e4, which squares would it attack?',
        ],
        explain:
          '…e4 forks the knights on d3 and f3 — and saves the pawn at the same time. White can only move one knight, so …exf3 wins the other. Always check whether a pawn push can hit two pieces at once.',
        solvedAnnotations: {
          highlights: [{ sq: 'f3', mark: 'green' }],
        },
      },
      {
        kind: 'try',
        title: 'Decoy into a fork',
        fen: '6k1/p4ppp/4q3/3N4/8/8/PP3PPP/2R3K1 w - - 0 1',
        prompt:
          'White to move. There is no fork yet — but you can force the queen onto a forkable square. (Hint: sacrifice first, fork second.)',
        solution: ['Rc8+', 'Qxc8', 'Ne7+', 'Kf8', 'Nxc8'],
        hints: [
          'From e7 a knight attacks g8 and c8. How can you force the black queen to c8?',
          'Rc8+ is check along the back rank. What is Black\'s only sensible reply?',
        ],
        explain:
          'Rc8+ leaves Black only …Qxc8 (the king has no square, and blocking with …Qe8 allows Rxe8#). Now Ne7+ forks king and queen, and Nxc8 leaves White a knight up. Forcing moves can drag pieces onto fork squares.',
        solvedAnnotations: {
          highlights: [{ sq: 'c8', mark: 'green' }],
        },
      },
      {
        kind: 'quiz',
        title: 'Spot the fork',
        fen: '2q3k1/5ppp/2N5/8/8/8/5PPP/6K1 w - - 0 1',
        question: 'White to move. Which knight move is a royal fork?',
        options: ['Ne7+', 'Na7', 'Nd8', 'Nb8'],
        answer: 0,
        explain: 'From e7 the knight checks the king on g8 and attacks the queen on c8 at the same time. After the king moves, Nxc8 wins the queen.',
        highlights: [{ sq: 'c6', mark: 'blue' }],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 2. PIN
  {
    id: 'pin',
    track: 'tactics',
    category: 'tactics',
    title: 'The Pin',
    level: 1,
    summary: 'Freeze a piece in front of a more valuable one — then attack it again.',
    minutes: 10,
    keyPoints: [
      'A pin is when a piece cannot (or should not) move because a more valuable piece stands behind it on the same line.',
      'Absolute pin: the piece behind is the king — moving is illegal. Relative pin: the piece behind is the queen or a rook — moving is legal but costly.',
      'Exploit a pin by attacking the pinned piece again, especially with a pawn. A pinned piece also cannot really defend anything.',
      'Spot it: enemy king or queen on the same line (file, rank or diagonal) as another enemy piece, with your bishop, rook or queen able to reach that line.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Absolute and relative pins',
        fen: 'r1bqk2r/ppp2ppp/2np1n2/1B2p1B1/4P3/3P1N2/PPP2PPP/RN1QK2R w KQkq - 0 7',
        text:
          'Two pins at once. The bishop on b5 pins the c6 knight to the king on e8 — an ABSOLUTE pin: the knight is not allowed to move at all. ' +
          'The bishop on g5 pins the f6 knight to the queen on d8 — a RELATIVE pin: the knight may move, but then Bxd8 wins the queen.',
        highlights: [
          { sq: 'b5', mark: 'blue' },
          { sq: 'c6', mark: 'red' },
          { sq: 'e8', mark: 'yellow' },
          { sq: 'g5', mark: 'blue' },
          { sq: 'f6', mark: 'red' },
          { sq: 'd8', mark: 'yellow' },
        ],
        arrows: [
          { from: 'b5', to: 'e8', mark: 'red' },
          { from: 'g5', to: 'd8', mark: 'yellow' },
        ],
      },
      {
        kind: 'demo',
        title: 'Attack the pinned piece',
        fen: 'r1bqk2r/ppp2ppp/2np1n2/1B6/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
        text: 'The c6 knight is pinned to the king by the bishop on b5. A pinned piece cannot run away — so attack it with something cheap.',
        highlights: [
          { sq: 'b5', mark: 'blue' },
          { sq: 'c6', mark: 'red' },
          { sq: 'e8', mark: 'yellow' },
        ],
        arrows: [{ from: 'b5', to: 'e8', mark: 'red' }],
        moves: [
          {
            san: 'd5',
            text: 'The pawn attacks the pinned knight. It cannot step aside, because that would expose the black king.',
            highlights: [
              { sq: 'd5', mark: 'blue' },
              { sq: 'c6', mark: 'red' },
            ],
            arrows: [{ from: 'd5', to: 'c6', mark: 'red' }],
          },
          {
            san: 'Bd7',
            text: 'Black blocks the pin and defends c6, but it is too late: it is White\'s move and the knight is still attacked.',
          },
          {
            san: 'dxc6',
            text: 'White wins the knight.',
            highlights: [{ sq: 'c6', mark: 'green' }],
          },
          { san: 'Bxc6', text: 'Black takes back a pawn…' },
          { san: 'Bxc6+', text: '…White trades bishops with check…' },
          {
            san: 'bxc6',
            text: 'In the end White has won a knight for a pawn. The recipe: pin it, then pile on with a pawn.',
          },
        ],
      },
      {
        kind: 'try',
        title: 'Pin the queen',
        fen: '4k3/pp1q1ppp/8/8/P7/8/1P3PPP/5BK1 w - - 0 1',
        prompt: 'White to move. The black queen and king are on the same diagonal. Pin the queen and win it.',
        solution: ['Bb5'],
        hints: [
          'Draw a line from the king on e8 through the queen on d7. Where does it lead?',
          'The bishop can reach b5, where your a4 pawn protects it.',
        ],
        explain:
          'Bb5 pins the queen to the king. The queen may only move along the pin line: …Qxb5 axb5 or …Qc6 Bxc6+ — either way White wins the queen for a bishop. Protecting the pinning piece (a4) was the key detail.',
        solvedAnnotations: {
          highlights: [
            { sq: 'b5', mark: 'blue' },
            { sq: 'd7', mark: 'red' },
            { sq: 'e8', mark: 'yellow' },
            { sq: 'a4', mark: 'green' },
          ],
          arrows: [{ from: 'b5', to: 'e8', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'Pile on the pinned knight',
        fen: '3r2k1/pp3ppp/8/3p4/1b6/2N5/PPP2PPP/4K2R b - - 0 1',
        prompt: 'Black to move. White\'s c3 knight is pinned to the king. Attack it with something cheap.',
        solution: ['d4'],
        hints: ['Which of your pawns can attack c3?', 'Push the d-pawn.'],
        explain:
          '…d4 attacks the knight with a pawn. The knight is absolutely pinned by the b4 bishop, so it cannot move away, and White will lose a piece. Pawns are the best attackers of pinned pieces because they are worth the least.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd4', mark: 'blue' },
            { sq: 'c3', mark: 'red' },
            { sq: 'b4', mark: 'blue' },
            { sq: 'e1', mark: 'yellow' },
          ],
          arrows: [
            { from: 'd4', to: 'c3', mark: 'red' },
            { from: 'b4', to: 'e1', mark: 'red' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'A pinned piece is not a defender',
        fen: '2r1k2r/pN2bppp/8/8/8/8/PP1RQPPP/3R2K1 w - - 0 1',
        prompt: 'White to move and mate in two. The e7 bishop "guards" d8 — or does it?',
        solution: ['Rd8+', 'Rxd8', 'Rxd8#'],
        hints: [
          'The bishop on e7 is pinned to the king by your queen on e2. It cannot capture anything.',
          'Put a rook on d8 with check. After …Rxd8, recapture with the other rook — the knight on b7 protects it.',
        ],
        explain:
          'Rd8+ Rxd8 Rxd8#. The bishop on e7 seems to defend d8, but it is pinned to the king by Qe2 and cannot capture. The king cannot take either, because the knight on b7 guards d8. Pinned pieces are fake defenders.',
        solvedAnnotations: {
          highlights: [
            { sq: 'e7', mark: 'red' },
            { sq: 'e2', mark: 'blue' },
            { sq: 'd8', mark: 'green' },
            { sq: 'b7', mark: 'blue' },
          ],
          arrows: [{ from: 'e2', to: 'e8', mark: 'red' }],
        },
      },
      {
        kind: 'quiz',
        question: 'A black knight is pinned to its QUEEN (not the king) by a white bishop. Which is true?',
        options: [
          'The knight may legally move, but Black would lose the queen',
          'The knight is not allowed to move',
          'The knight can capture the bishop along the pin line',
          'The pin does not matter at all',
        ],
        answer: 0,
        explain:
          'That is a relative pin. Only pins to the king are absolute (illegal to break). A relative pin can be broken, but usually at a cost — here the queen.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 3. SKEWER
  {
    id: 'skewer',
    track: 'tactics',
    category: 'tactics',
    title: 'The Skewer',
    level: 2,
    summary: 'A pin in reverse: attack the valuable piece, and when it moves, take what is behind it.',
    minutes: 8,
    keyPoints: [
      'A skewer attacks a valuable piece (often the king) that has a less valuable piece behind it on the same line.',
      'When the front piece moves out of the way, you capture the piece behind.',
      'Only long-range pieces skewer: bishops, rooks and queens.',
      'Spot it: enemy king and another piece on the same rank, file or diagonal with empty squares around — especially in endgames with open lines.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Front piece, back piece',
        fen: '6r1/8/8/3k4/8/8/5PPP/1B4K1 w - - 0 1',
        text:
          'The black king on d5 and the rook on g8 stand on the same diagonal (a2–g8). If the white bishop goes to a2, it checks the king. ' +
          'The king must step off the diagonal — and then the bishop takes the rook behind it. In a pin the less valuable piece is in front; in a skewer the MORE valuable piece is in front.',
        highlights: [
          { sq: 'b1', mark: 'blue' },
          { sq: 'a2', mark: 'green' },
          { sq: 'd5', mark: 'red' },
          { sq: 'g8', mark: 'red' },
        ],
        arrows: [
          { from: 'b1', to: 'a2', mark: 'green' },
          { from: 'a2', to: 'g8', mark: 'red' },
        ],
      },
      {
        kind: 'demo',
        title: 'Bishop skewers king and queen',
        fen: '6q1/8/4k3/8/8/8/5PPP/5BK1 w - - 0 1',
        text: 'Black has a queen against a bishop, but the king on e6 and the queen on g8 share a diagonal.',
        highlights: [
          { sq: 'e6', mark: 'red' },
          { sq: 'g8', mark: 'red' },
        ],
        moves: [
          {
            san: 'Bc4+',
            text: 'Check! The bishop attacks the king, and the queen hides right behind it on the same diagonal.',
            highlights: [
              { sq: 'c4', mark: 'blue' },
              { sq: 'e6', mark: 'red' },
              { sq: 'g8', mark: 'red' },
            ],
            arrows: [{ from: 'c4', to: 'g8', mark: 'red' }],
          },
          { san: 'Ke5', text: 'The king has to get out of check, which uncovers the queen.' },
          {
            san: 'Bxg8',
            text: 'The bishop takes the queen. A lost position became a winning one with a single skewer.',
            highlights: [{ sq: 'g8', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Rook skewer',
        fen: '8/8/2k4q/8/8/8/5PPP/R5K1 w - - 0 1',
        prompt: 'White to move. The black king and queen share a rank. Skewer them.',
        solution: ['Ra6+'],
        hints: ['Both the king (c6) and the queen (h6) are on the 6th rank.', 'Check the king from the side along the 6th rank.'],
        explain:
          'Ra6+ checks the king along the 6th rank. The queen on h6 is hidden behind the king, so it cannot take the rook. After the king moves, Rxh6 wins the queen.',
        solvedAnnotations: {
          highlights: [
            { sq: 'a6', mark: 'blue' },
            { sq: 'c6', mark: 'red' },
            { sq: 'h6', mark: 'red' },
          ],
          arrows: [{ from: 'a6', to: 'h6', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'Bishop skewer',
        fen: '2b3k1/p4ppp/8/8/8/3K4/P4PPP/1R6 b - - 0 1',
        prompt: 'Black to move. The white king and rook stand on the same diagonal. Skewer them and win the rook.',
        solution: ['Bf5+', 'Kd4', 'Bxb1'],
        hints: ['Look at the diagonal from f5 through d3 to b1.', 'Give check from f5.'],
        explain:
          '…Bf5+ checks the king on d3, and the rook on b1 sits behind it on the same diagonal. Once the king steps away, …Bxb1 wins the rook.',
        solvedAnnotations: {
          highlights: [
            { sq: 'f5', mark: 'blue' },
            { sq: 'd3', mark: 'red' },
            { sq: 'b1', mark: 'red' },
          ],
          arrows: [{ from: 'f5', to: 'b1', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'The endgame skewer',
        fen: 'R7/P4k2/8/8/8/6K1/r7/8 w - - 0 1',
        prompt:
          'White to move. A famous rook-ending trick: your rook blocks your own pawn. Move it with a threat, and if Black takes the pawn, skewer.',
        solution: ['Rh8', 'Rxa7', 'Rh7+'],
        hints: [
          'Clear the a8 square so your pawn threatens to promote.',
          'If the black rook grabs the pawn on a7, it stands on the same rank as the black king.',
        ],
        explain:
          'Rh8! threatens a8=Q. If …Rxa7, then Rh7+ skewers the king on f7 and the rook on a7 along the 7th rank, and White wins the rook next move. This is why defenders keep the king on g7/h7 in these endings.',
        solvedAnnotations: {
          highlights: [
            { sq: 'h7', mark: 'blue' },
            { sq: 'f7', mark: 'red' },
            { sq: 'a7', mark: 'red' },
          ],
          arrows: [{ from: 'h7', to: 'a7', mark: 'red' }],
        },
      },
      {
        kind: 'quiz',
        question: 'What is the main difference between a pin and a skewer?',
        options: [
          'In a skewer the more valuable piece is in front; in a pin it is behind',
          'Skewers only work with knights',
          'A pin always wins more material than a skewer',
          'There is no difference',
        ],
        answer: 0,
        explain:
          'Both use a line through two enemy pieces. Pin: the cheaper piece is in front and cannot move. Skewer: the valuable piece is in front, must move, and exposes the piece behind.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 4. DISCOVERED ATTACK
  {
    id: 'discovered-attack',
    track: 'tactics',
    category: 'tactics',
    title: 'Discovered Attack & Discovered Check',
    level: 2,
    summary: 'Move one piece out of the way to unleash the piece behind it — two attacks in one move.',
    minutes: 10,
    keyPoints: [
      'A discovered attack happens when you move a piece and uncover an attack by a long-range piece (bishop, rook or queen) behind it.',
      'The moving piece is free to make its own threat, so the opponent faces two attacks at once.',
      'A discovered CHECK is the strongest kind: the opponent must deal with the check, and the moving piece can grab almost anything.',
      'Spot it: your bishop, rook or queen aims at the enemy king or queen, with one of YOUR pieces in the way. Ask: where can that blocker go with a threat?',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The hidden attacker',
        fen: '3q2k1/pp3ppp/8/8/8/3N4/PP3PPP/3R2K1 w - - 0 1',
        text:
          'The rook on d1 aims at the black queen on d8, but its own knight on d3 is in the way. The moment the knight moves, the rook attacks the queen. ' +
          'If the knight jumps somewhere with a threat of its own (for example a check), Black cannot deal with both problems.',
        highlights: [
          { sq: 'd1', mark: 'blue' },
          { sq: 'd3', mark: 'yellow' },
          { sq: 'd8', mark: 'red' },
        ],
        arrows: [{ from: 'd1', to: 'd8', mark: 'red' }],
      },
      {
        kind: 'demo',
        title: 'An opening trap: discovered check',
        fen: 'rnbqkb1r/pppp1ppp/5n2/4N3/8/8/PPPPQPPP/RNB1KB1R w KQkq - 2 5',
        text:
          'This happens in real games (Petroff Defence). White\'s queen on e2 and the black king on e8 are on the same file, with the white knight on e5 in between.',
        highlights: [
          { sq: 'e2', mark: 'blue' },
          { sq: 'e5', mark: 'yellow' },
          { sq: 'e8', mark: 'red' },
        ],
        arrows: [{ from: 'e2', to: 'e8', mark: 'red' }],
        moves: [
          {
            san: 'Nc6+',
            text: 'Discovered check! The knight moves away, so the queen on e2 now checks the king — and the knight on c6 attacks the queen on d8.',
            highlights: [
              { sq: 'c6', mark: 'blue' },
              { sq: 'd8', mark: 'red' },
              { sq: 'e8', mark: 'red' },
            ],
            arrows: [
              { from: 'e2', to: 'e8', mark: 'red' },
              { from: 'c6', to: 'd8', mark: 'red' },
            ],
          },
          { san: 'Qe7', text: 'Black must block the check, and the queen is still attacked.' },
          {
            san: 'Nxe7',
            text: 'White takes the queen.',
            highlights: [{ sq: 'e7', mark: 'green' }],
          },
          { san: 'Bxe7', text: 'Black recaptures, but has lost a queen for a knight.' },
        ],
      },
      {
        kind: 'try',
        title: 'Discovered check wins the queen',
        fen: '1q4rk/p6p/6p1/8/3N4/2B5/P4PPP/4R1K1 w - - 0 1',
        prompt: 'White to move. Your bishop is aimed at the black king, but your knight blocks it. Move the knight with a threat and win the queen.',
        solution: ['Nc6+'],
        hints: [
          'Any knight move uncovers check from the c3 bishop. Which knight move also attacks the queen on b8?',
          'From c6 a knight attacks b8.',
        ],
        explain:
          'Nc6+ is a discovered check from the c3 bishop, and the knight attacks the queen on b8. Black must answer the check (…Rg7 or …Qe5 block), and White takes the queen next move.',
        solvedAnnotations: {
          highlights: [
            { sq: 'c6', mark: 'blue' },
            { sq: 'b8', mark: 'red' },
            { sq: 'h8', mark: 'red' },
          ],
          arrows: [
            { from: 'c3', to: 'h8', mark: 'red' },
            { from: 'c6', to: 'b8', mark: 'red' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Black unleashes the bishop',
        fen: '6k1/5ppp/8/2b5/3n4/8/PP4PP/Q4RK1 b - - 0 1',
        prompt: 'Black to move. Your c5 bishop points at the white king, blocked only by your own knight. Win the white queen.',
        solution: ['Nc2+', 'Kh1', 'Nxa1'],
        alsoAccept: ['Nb3+'],
        hints: [
          'Moving the d4 knight gives discovered check from the c5 bishop.',
          'Which knight jump also attacks the queen on a1?',
        ],
        explain:
          '…Nc2+ is a discovered check (the bishop on c5 now hits g1) and the knight attacks the queen on a1. White must answer the check, then …Nxa1 wins the queen. (…Nb3+ works the same way.)',
        solvedAnnotations: {
          highlights: [
            { sq: 'a1', mark: 'green' },
            { sq: 'c5', mark: 'blue' },
          ],
          arrows: [{ from: 'c5', to: 'g1', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'Sacrifice with discovered attack',
        fen: 'r2q2k1/pp3ppp/8/8/8/3B4/PP3PPP/3R2K1 w - - 0 1',
        prompt: 'White to move. Your d1 rook stares at the black queen, with your own bishop in the way. Move the bishop with CHECK.',
        solution: ['Bxh7+', 'Kxh7', 'Rxd8'],
        hints: [
          'The bishop must move with a threat so Black has no time to save the queen.',
          'Which bishop move gives check to the king on g8?',
        ],
        explain:
          'Bxh7+! checks the king and uncovers the rook\'s attack on d8. Black must deal with the check (taking the bishop is best), and then Rxd8 wins the queen for a bishop.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd8', mark: 'green' },
            { sq: 'd1', mark: 'blue' },
          ],
          arrows: [{ from: 'd1', to: 'd8', mark: 'red' }],
        },
      },
      {
        kind: 'quiz',
        question: 'Why is a discovered CHECK usually stronger than an ordinary discovered attack?',
        options: [
          'The opponent must answer the check, so the moving piece\'s threat cannot be met',
          'Because checks always win the queen',
          'Because the king cannot move after a discovered check',
          'It is not stronger',
        ],
        answer: 0,
        explain:
          'A check must be answered immediately. That leaves no time to deal with whatever the moving piece attacks — so it can often capture anything it hits.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 5. DOUBLE CHECK
  {
    id: 'double-check',
    track: 'tactics',
    category: 'tactics',
    title: 'Double Check',
    level: 2,
    summary: 'Check with two pieces at once — the only defence is to move the king.',
    minutes: 9,
    keyPoints: [
      'A double check is a discovered check where the moving piece ALSO gives check. Two pieces check at once.',
      'You cannot block two checks or capture two pieces, so the king MUST move. If it cannot, it is mate.',
      'That means the checking pieces can land on attacked or even "hanging" squares — nobody can take them.',
      'Spot it: a discovered-check setup where the front piece can also reach a checking square. Especially deadly when the enemy king is boxed in by its own pieces.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Two checks, one answer',
        fen: 'r3k2r/pp3ppp/8/8/4B3/8/PP3PPP/4R1K1 w - - 0 1',
        text:
          'The rook on e1 aims at the black king, blocked by the bishop on e4. If the bishop goes to c6, it gives check itself AND uncovers the rook\'s check. ' +
          'Black cannot capture both checkers or block both lines. Even …bxc6 is illegal, because the rook would still be giving check. Only a king move helps — to d8 or f8.',
        highlights: [
          { sq: 'e1', mark: 'blue' },
          { sq: 'e4', mark: 'yellow' },
          { sq: 'c6', mark: 'green' },
          { sq: 'e8', mark: 'red' },
        ],
        arrows: [
          { from: 'e4', to: 'c6', mark: 'green' },
          { from: 'e1', to: 'e8', mark: 'red' },
          { from: 'c6', to: 'e8', mark: 'red' },
        ],
      },
      {
        kind: 'demo',
        title: 'Réti vs Tartakower, Vienna 1910',
        fen: 'rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9',
        text: 'One of the most famous double checks ever played. White\'s queen, d1 rook and d2 bishop are all lined up on the d-file, next to the black king.',
        highlights: [
          { sq: 'd1', mark: 'blue' },
          { sq: 'd2', mark: 'blue' },
          { sq: 'e8', mark: 'red' },
        ],
        moves: [
          {
            san: 'Qd8+',
            text: 'A queen sacrifice! It drags the king onto the d-file, where the d1 rook is waiting behind the d2 bishop.',
            highlights: [{ sq: 'd8', mark: 'yellow' }],
          },
          { san: 'Kxd8', text: 'Forced — the king must take.' },
          {
            san: 'Bg5+',
            text: 'Double check! The bishop checks from g5, and moving it uncovers the rook on d1. Black must move the king.',
            highlights: [
              { sq: 'g5', mark: 'blue' },
              { sq: 'd1', mark: 'blue' },
              { sq: 'd8', mark: 'red' },
            ],
            arrows: [
              { from: 'g5', to: 'd8', mark: 'red' },
              { from: 'd1', to: 'd8', mark: 'red' },
            ],
          },
          { san: 'Kc7', text: 'The king steps to c7 (…Ke8 allows Rd8#).' },
          {
            san: 'Bd8#',
            text: 'Checkmate. The bishop comes back to d8, protected by the rook — the king has no escape.',
            highlights: [{ sq: 'd8', mark: 'green' }, { sq: 'c7', mark: 'red' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Double check mate',
        fen: 'r2qkb1r/pp1p1ppp/8/8/4N3/8/PPP2PPP/4R1K1 w - - 0 1',
        prompt: 'White to move. Deliver mate with a double check.',
        solution: ['Nd6#'],
        alsoAccept: ['Nf6#'],
        hints: ['Move the knight so it checks the king AND uncovers the e1 rook.', 'From d6 a knight attacks e8.'],
        explain:
          'Nd6# (Nf6# also works). The knight and the rook both give check, so Black cannot block or capture — and the king has no free square. Pieces standing next to a king can be a prison.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd6', mark: 'blue' },
            { sq: 'e1', mark: 'blue' },
            { sq: 'e8', mark: 'red' },
          ],
          arrows: [
            { from: 'd6', to: 'e8', mark: 'red' },
            { from: 'e1', to: 'e8', mark: 'red' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Double check, then mate',
        fen: '3q1rk1/pp4pp/8/3N4/2B1Q3/8/5PPP/6K1 w - - 0 1',
        prompt: 'White to move and mate in two. Your c4 bishop aims at g8 through your own knight.',
        solution: ['Nf6+', 'Kh8', 'Qxh7#'],
        hints: [
          'A knight move from d5 uncovers the bishop on c4. Which knight move also gives check?',
          'After the double check the king has only one square. Then look at h7.',
        ],
        explain:
          'Nf6+ is a double check (knight and c4 bishop). …gxf6 is impossible — in double check only the king may move — so …Kh8 is forced. Then Qxh7# : the queen is protected by the knight on f6.',
        solvedAnnotations: {
          highlights: [
            { sq: 'h7', mark: 'green' },
            { sq: 'f6', mark: 'blue' },
          ],
          arrows: [{ from: 'f6', to: 'h7', mark: 'blue' }],
        },
      },
      {
        kind: 'try',
        title: 'Black\'s double check',
        fen: '6k1/p4ppp/q7/8/8/1QR5/PP1pnPPP/5K2 b - - 0 1',
        prompt: 'Black to move and mate in two. Your queen on a6 aims at f1, blocked by your own knight.',
        solution: ['Ng3+', 'Kg1', 'Qf1#'],
        hints: [
          'Find a knight move that checks the king AND opens the a6–f1 diagonal.',
          'From g3 the knight checks f1. After the king runs, where can the queen land safely?',
        ],
        explain:
          '…Ng3+ is a double check: the knight hits f1 and the queen on a6 now does too. White cannot take the knight (hxg3 or fxg3 would leave the queen\'s check in place), and e1/e2 are covered by the d2 pawn and the queen, so 2.Kg1 is forced. Then …Qf1# — the knight on g3 protects the queen and covers h1.',
        solvedAnnotations: {
          highlights: [
            { sq: 'f1', mark: 'green' },
            { sq: 'g3', mark: 'blue' },
            { sq: 'g1', mark: 'red' },
          ],
        },
      },
      {
        kind: 'quiz',
        question: 'Your king is in double check. What can you do?',
        options: [
          'Only move the king',
          'Capture one of the checking pieces',
          'Block one of the checks',
          'Any of the above',
        ],
        answer: 0,
        explain:
          'Capturing or blocking can stop only ONE of the two checks. The king must move. If it has no safe square, it is checkmate.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 6. REMOVING THE DEFENDER
  {
    id: 'removing-the-defender',
    track: 'tactics',
    category: 'tactics',
    title: 'Removing the Defender',
    level: 3,
    summary: 'If a piece or square is guarded by just one defender, capture or chase that defender away.',
    minutes: 10,
    keyPoints: [
      'Many pieces and key squares are protected by just ONE defender. Remove it, and what it guarded falls.',
      'Capturing the defender is the most direct way — even giving up material can pay if the payoff is bigger.',
      'Capturing the defender WITH CHECK is best of all: the opponent has no time to fix the problem.',
      'Spot it: for each enemy piece or mating square you attack, ask "who defends it?" If the answer is a single piece, target that piece.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Who guards h7?',
        fen: '3q1rk1/pp3ppp/5n2/7Q/4N3/3B4/PP3PPP/6K1 w - - 0 1',
        text:
          'White\'s queen (h5) and, once the knight moves, the bishop (d3) both aim at h7. The only black piece guarding h7 is the knight on f6 — and it also attacks the white queen! ' +
          'If White can remove that knight, Qxh7 becomes checkmate.',
        highlights: [
          { sq: 'f6', mark: 'red' },
          { sq: 'h7', mark: 'yellow' },
          { sq: 'h5', mark: 'blue' },
          { sq: 'd3', mark: 'blue' },
        ],
        arrows: [
          { from: 'f6', to: 'h7', mark: 'red' },
          { from: 'h5', to: 'h7', mark: 'blue' },
          { from: 'd3', to: 'h7', mark: 'blue' },
        ],
      },
      {
        kind: 'demo',
        title: 'Capture the defender with check',
        fen: '3q1rk1/pp3ppp/5n2/7Q/4N3/3B4/PP3PPP/6K1 w - - 0 1',
        text: 'Watch the lone defender disappear.',
        moves: [
          {
            san: 'Nxf6+',
            text: 'The knight takes the defender with check — and it moves off the d3–h7 diagonal, opening the bishop\'s line.',
            highlights: [{ sq: 'f6', mark: 'green' }],
            arrows: [{ from: 'd3', to: 'h7', mark: 'blue' }],
          },
          {
            san: 'gxf6',
            text: 'Black recaptures. (…Qxf6 or …Kh8 lose the same way.)',
          },
          {
            san: 'Qxh7#',
            text: 'Checkmate. The queen on h7 is protected by the bishop, and nothing guards h7 any more.',
            highlights: [
              { sq: 'h7', mark: 'green' },
              { sq: 'g8', mark: 'red' },
            ],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Take the guard',
        fen: '5rk1/pp3ppp/5n2/3b2B1/8/8/PP3PPP/3RR1K1 w - - 0 1',
        prompt: 'White to move. Your d1 rook attacks the bishop on d5, but the f6 knight guards it. Win a piece.',
        solution: ['Bxf6'],
        hints: ['Who defends d5? Can you capture that defender?', 'Your bishop on g5 can take the knight.'],
        explain:
          'Bxf6 removes the only guard of d5. If …gxf6, then Rxd5 wins the bishop. If the bishop runs instead, Black cannot recapture on f6 — either way White wins a piece.',
        solvedAnnotations: {
          highlights: [
            { sq: 'f6', mark: 'green' },
            { sq: 'd5', mark: 'red' },
          ],
          arrows: [{ from: 'd1', to: 'd5', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'Remove the guard of h2',
        fen: '5rk1/pp4pp/8/4q3/6n1/5N2/PP3PPP/1Q3RK1 b - - 0 1',
        prompt: 'Black to move. Your queen and knight both hit h2 — only White\'s knight on f3 defends it. Remove it.',
        solution: ['Rxf3'],
        hints: [
          'The f3 knight guards h2 AND attacks your queen. It must go.',
          'Your rook on f8 has an open file down to f3.',
        ],
        explain:
          '…Rxf3! gives up the exchange to remove h2\'s only defender. Now …Qxh2# is threatened. If 2.gxf3, then …Qxh2# at once (the g4 knight supports the queen and the f1 rook blocks the escape). White must give up material to survive.',
        solvedAnnotations: {
          highlights: [
            { sq: 'f3', mark: 'green' },
            { sq: 'h2', mark: 'red' },
          ],
          arrows: [
            { from: 'e5', to: 'h2', mark: 'red' },
            { from: 'g4', to: 'h2', mark: 'red' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Remove the defender with check',
        fen: 'r3k2r/ppp2ppp/2n5/8/3q4/5B2/PPP2PPP/3R2K1 w - - 0 1',
        prompt: 'White to move. Your d1 rook attacks the black queen, which is defended only by the c6 knight. Win the queen.',
        solution: ['Bxc6+', 'bxc6', 'Rxd4'],
        hints: [
          'Only the knight on c6 protects d4.',
          'Your f3 bishop can take that knight — and it will even be check.',
        ],
        explain:
          'Bxc6+ removes the queen\'s only defender with check, so Black has no time to move the queen. After …bxc6, Rxd4 wins the queen. Removing a defender with check is the cleanest version of this tactic.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd4', mark: 'green' },
            { sq: 'd1', mark: 'blue' },
          ],
          arrows: [{ from: 'd1', to: 'd4', mark: 'red' }],
        },
      },
      {
        kind: 'quiz',
        question: 'You attack an enemy piece once and it is defended once. How can "removing the defender" help?',
        options: [
          'Capture or chase away its defender, so your attack wins the piece',
          'Attack it with your king',
          'It cannot help — equal attackers and defenders means it is safe',
          'Offer a trade of queens',
        ],
        answer: 0,
        explain:
          'Count attackers and defenders. If you eliminate the lone defender (capture it, chase it, or lure it away), the piece is left hanging.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 7. BACK-RANK MATE
  {
    id: 'back-rank-mate',
    track: 'tactics',
    category: 'tactics',
    title: 'Back-Rank Mate (and Luft)',
    level: 3,
    summary: 'A king trapped behind its own pawns can be mated by one rook or queen on the back rank.',
    minutes: 9,
    keyPoints: [
      'A castled king behind three unmoved pawns has no escape squares. A rook or queen checking on the back rank can be mate.',
      'Watch for pieces whose only job is guarding the back rank — sacrifices that deflect them are common.',
      'Prevention: make "luft" (air) — a quiet pawn move like h3 / h6 — so the king has an escape square.',
      'Spot it: enemy king on its back rank with no free squares in front, and an open file for your rook or queen.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The trapped king',
        fen: '6k1/5ppp/8/8/8/8/r4PPP/4R1K1 w - - 0 1',
        text:
          'The black king on g8 is walled in by its own pawns on f7, g7 and h7. If a white rook reaches the 8th rank, the king has nowhere to go. ' +
          'Here the e-file is open, so Re8 would be checkmate.',
        highlights: [
          { sq: 'g8', mark: 'red' },
          { sq: 'f7', mark: 'yellow' },
          { sq: 'g7', mark: 'yellow' },
          { sq: 'h7', mark: 'yellow' },
          { sq: 'e8', mark: 'green' },
        ],
        arrows: [{ from: 'e1', to: 'e8', mark: 'green' }],
      },
      {
        kind: 'demo',
        title: 'Deflect the lone guard',
        fen: '3r2k1/5ppp/1q6/8/8/8/4RPPP/4Q1K1 w - - 0 1',
        text: 'Black\'s rook on d8 is the only piece guarding the back rank. White has a rook and queen lined up on the e-file.',
        highlights: [
          { sq: 'd8', mark: 'red' },
          { sq: 'e2', mark: 'blue' },
          { sq: 'e1', mark: 'blue' },
        ],
        moves: [
          {
            san: 'Re8+',
            text: 'The rook checks on the back rank. The only way out is to capture it.',
            highlights: [{ sq: 'e8', mark: 'yellow' }],
          },
          { san: 'Rxe8', text: 'Forced. But now the queen behind it takes over the file.' },
          {
            san: 'Qxe8#',
            text: 'Checkmate. The pawns on f7, g7 and h7 imprison their own king.',
            highlights: [
              { sq: 'e8', mark: 'green' },
              { sq: 'g8', mark: 'red' },
            ],
          },
        ],
      },
      {
        kind: 'explain',
        title: 'The cure: luft',
        fen: '6k1/5pp1/7p/8/8/7P/5PP1/6K1 w - - 0 1',
        text:
          'Both sides have played a small pawn move — h3 for White, …h6 for Black. Now each king has a flight square (h2 and h7). ' +
          'A back-rank check is no longer mate. When the position is quiet, spending one move on luft is often a great investment.',
        highlights: [
          { sq: 'h2', mark: 'green' },
          { sq: 'h7', mark: 'green' },
          { sq: 'h3', mark: 'blue' },
          { sq: 'h6', mark: 'blue' },
        ],
      },
      {
        kind: 'try',
        title: 'Mate in one',
        fen: '6k1/5ppp/8/8/8/2Q5/1r3PPP/6K1 w - - 0 1',
        prompt: 'White to move. Deliver back-rank mate.',
        solution: ['Qc8#'],
        hints: ['Which of your pieces can reach the 8th rank?', 'The c-file is open all the way to c8.'],
        explain: 'Qc8#. The king cannot step forward because of its own pawns, and nothing can block or capture on the back rank.',
        solvedAnnotations: { highlights: [{ sq: 'c8', mark: 'green' }, { sq: 'g8', mark: 'red' }] },
      },
      {
        kind: 'try',
        title: 'Black breaks through',
        fen: '3r2k1/5pp1/7p/8/3q4/8/2Q2PPP/3R2K1 b - - 0 1',
        prompt: 'Black to move and mate in two. White\'s rook on d1 is guarding the back rank — can you remove it?',
        solution: ['Qxd1+', 'Qxd1', 'Rxd1#'],
        hints: [
          'Your queen and rook are doubled on the d-file.',
          'Trade your queen for the d1 rook — the recapture leaves the back rank empty.',
        ],
        explain:
          '…Qxd1+! Qxd1 Rxd1#. White\'s king has no luft (f2, g2, h2 are all pawns). Note Black\'s own …h6 earlier: Black made luft, White did not.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd1', mark: 'green' },
            { sq: 'g1', mark: 'red' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Sacrifice the queen',
        fen: 'r3r1k1/1q3ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
        prompt: 'White to move and mate in two. Black\'s e8 rook guards the back rank.',
        solution: ['Qxe8+', 'Rxe8', 'Rxe8#'],
        hints: [
          'Capture on e8 with the piece in FRONT of the battery.',
          'After …Rxe8 your rook recaptures.',
        ],
        explain:
          'Qxe8+! Rxe8 Rxe8#. Giving up the queen is fine when it forces mate. Always check forcing sacrifices on the back rank when the enemy king has no luft.',
        solvedAnnotations: { highlights: [{ sq: 'e8', mark: 'green' }] },
      },
      {
        kind: 'quiz',
        question: 'Which move is the classic way to prevent back-rank mates for a king castled on g1 behind f2-g2-h2?',
        options: ['h3 (or g3)', 'Moving the king to h1', 'Putting a knight on g1', 'Pushing the a-pawn'],
        answer: 0,
        explain: 'h3 (or g3) gives the king a flight square — "luft". Kh1 does not help, since h2 and g2 are still blocked.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 8. DEFLECTION & DECOY
  {
    id: 'deflection-decoy',
    track: 'tactics',
    category: 'tactics',
    title: 'Deflection & Decoy',
    level: 3,
    summary: 'Force a defender away from its post (deflection) or lure a piece onto a bad square (decoy).',
    minutes: 11,
    keyPoints: [
      'Deflection: force a defender to leave the square or line it is guarding (by attacking it or offering a capture it must take).',
      'Decoy: force a piece — often the king or queen — ONTO a square where another tactic (fork, mate, skewer) works.',
      'Both usually start with a sacrifice or a strong threat that leaves the opponent no choice.',
      'Spot it: find a tactic that "almost works" — if only that defender were elsewhere, or that piece stood on a forkable square. Then look for a forcing move that makes it happen.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Deflection: chase the guard',
        fen: '3r2k1/pp3ppp/3b3q/4p3/8/1Q3N2/PP3PPP/5RK1 b - - 0 1',
        text:
          'White\'s knight on f3 is the only guard of h2, where Black\'s queen (h6) and — once the e5 pawn moves — the d6 bishop are aiming. ' +
          'If the knight is forced to leave f3, …Qxh2 is mate. A pawn attack (…e4) is the perfect way to deflect it: the knight must move, or be captured.',
        highlights: [
          { sq: 'f3', mark: 'red' },
          { sq: 'h2', mark: 'yellow' },
          { sq: 'e5', mark: 'blue' },
        ],
        arrows: [
          { from: 'f3', to: 'h2', mark: 'red' },
          { from: 'h6', to: 'h2', mark: 'blue' },
          { from: 'e5', to: 'e4', mark: 'green' },
        ],
      },
      {
        kind: 'demo',
        title: 'Decoy into a fork',
        fen: '7k/pp4pp/1q6/6N1/8/8/5PPP/3R2K1 w - - 0 1',
        text: 'From f7 a white knight would fork the king on h8 and the d8 square. The black queen is on b6 — so let\'s decoy it to d8.',
        highlights: [
          { sq: 'f7', mark: 'green' },
          { sq: 'h8', mark: 'red' },
          { sq: 'd8', mark: 'yellow' },
        ],
        moves: [
          {
            san: 'Rd8+',
            text: 'The rook sacrifices itself with check. Black has no king moves and nothing to block with — only …Qxd8.',
            highlights: [{ sq: 'd8', mark: 'yellow' }],
          },
          {
            san: 'Qxd8',
            text: 'The decoy worked: the queen now stands on d8.',
            highlights: [{ sq: 'd8', mark: 'red' }],
          },
          {
            san: 'Nf7+',
            text: 'Royal fork: the knight checks the king on h8 and attacks the queen on d8.',
            highlights: [
              { sq: 'f7', mark: 'blue' },
              { sq: 'h8', mark: 'red' },
              { sq: 'd8', mark: 'red' },
            ],
            arrows: [
              { from: 'f7', to: 'h8', mark: 'red' },
              { from: 'f7', to: 'd8', mark: 'red' },
            ],
          },
          { san: 'Kg8', text: 'The king must move.' },
          {
            san: 'Nxd8',
            text: 'White gave a rook (5) and won the queen (9).',
            highlights: [{ sq: 'd8', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Deflect the knight',
        fen: '5rk1/pp3ppp/1q3n2/8/4P3/3B3Q/PP3PPP/3R2K1 w - - 0 1',
        prompt: 'White to move. The f6 knight is the only defender of h7. Kick it away.',
        solution: ['e5'],
        hints: ['A pawn can attack the knight.', 'Push e4–e5: it attacks f6 and opens the d3 bishop\'s diagonal.'],
        explain:
          'e5! attacks the knight. If it moves, Qxh7# follows (h7 is hit by the queen and the d3 bishop). If Black keeps the knight and blocks with …g6, then exf6 simply wins the piece.',
        solvedAnnotations: {
          highlights: [
            { sq: 'e5', mark: 'blue' },
            { sq: 'f6', mark: 'red' },
            { sq: 'h7', mark: 'yellow' },
          ],
          arrows: [
            { from: 'e5', to: 'f6', mark: 'red' },
            { from: 'd3', to: 'h7', mark: 'blue' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'The Opera Game finish (Morphy, 1858)',
        fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
        prompt: 'White to move and mate in two. The knight on d7 is the only piece guarding d8. Deflect it!',
        solution: ['Qb8+', 'Nxb8', 'Rd8#'],
        hints: [
          'A queen check on the back rank forces a capture.',
          'Qb8+ can only be met by …Nxb8 — and then d8 is unguarded.',
        ],
        explain:
          'Qb8+!! Nxb8 Rd8#. The queen sacrifice deflects the d7 knight from guarding d8. The rook mates, protected by the g5 bishop. Paul Morphy played this in 1858 — one of the most famous finishes in chess.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd8', mark: 'green' },
            { sq: 'g5', mark: 'blue' },
            { sq: 'e8', mark: 'red' },
          ],
          arrows: [{ from: 'g5', to: 'd8', mark: 'blue' }],
        },
      },
      {
        kind: 'try',
        title: 'Decoy the king',
        fen: '6kr/5pp1/8/8/6n1/8/PP3PP1/1R1Q2K1 b - - 0 1',
        prompt:
          'Black to move. …Nxf2 would fork the queen and the h1 square — but the king simply takes it. Decoy the king first!',
        solution: ['Rh1+', 'Kxh1', 'Nxf2+', 'Kg1', 'Nxd1'],
        hints: [
          'Your rook on h8 has an open file all the way to h1.',
          'After …Rh1+ Kxh1, the king stands on h1 — a knight on f2 would check it and attack d1.',
        ],
        explain:
          '…Rh1+! forces Kxh1 (the king has no other square). Now the king is a knight-fork target: …Nxf2+ checks it and attacks the queen on d1, and …Nxd1 wins the queen. The rook sacrifice was a decoy.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd1', mark: 'green' },
            { sq: 'f2', mark: 'blue' },
          ],
        },
      },
      {
        kind: 'quiz',
        question: 'What is the difference between deflection and decoy?',
        options: [
          'Deflection pulls a defender AWAY from a square; decoy lures a piece ONTO a square',
          'They are two names for the same pawn move',
          'Decoy only works against pawns',
          'Deflection must always be a check',
        ],
        answer: 0,
        explain:
          'Deflection: "leave your post". Decoy: "come here". In practice they overlap, and both usually start with a forcing sacrifice.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 9. OVERLOADED PIECES
  {
    id: 'overloaded-pieces',
    track: 'tactics',
    category: 'tactics',
    title: 'Overloaded Pieces',
    level: 3,
    summary: 'A piece with two defensive jobs cannot do both — make it choose.',
    minutes: 10,
    keyPoints: [
      'A piece is overloaded when it must defend two things at once (two pieces, or a piece and a mating square).',
      'Attack one of its duties. If it answers, the other duty is abandoned.',
      'Overloaded queens and back-rank rooks are the most common victims.',
      'Spot it: for each enemy defender, list EVERYTHING it guards. Two or more critical jobs = overloaded.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'One queen, two jobs',
        fen: '6k1/pppq1ppp/8/8/6b1/6Q1/PP3PPP/4R1K1 w - - 0 1',
        text:
          'Black\'s queen on d7 has two jobs: it defends the bishop on g4, and it guards e8 against Re8#. ' +
          'One piece cannot do both. If White takes the bishop, recapturing abandons the back rank.',
        highlights: [
          { sq: 'd7', mark: 'red' },
          { sq: 'g4', mark: 'yellow' },
          { sq: 'e8', mark: 'yellow' },
        ],
        arrows: [
          { from: 'd7', to: 'g4', mark: 'red' },
          { from: 'd7', to: 'e8', mark: 'red' },
          { from: 'e1', to: 'e8', mark: 'blue' },
        ],
      },
      {
        kind: 'demo',
        title: 'The overload in action',
        fen: '6k1/pppq1ppp/8/8/6b1/6Q1/PP3PPP/4R1K1 w - - 0 1',
        text: 'White grabs the bishop and dares the queen to recapture.',
        moves: [
          {
            san: 'Qxg4',
            text: 'White takes the bishop. Black\'s best is to leave it and be a piece down — but let\'s see what happens if the queen does its "job"…',
            highlights: [{ sq: 'g4', mark: 'green' }],
          },
          {
            san: 'Qxg4',
            text: 'The queen recaptures — and has left e8 undefended.',
            highlights: [{ sq: 'e8', mark: 'yellow' }],
          },
          {
            san: 'Re8#',
            text: 'Back-rank mate. The queen could not guard g4 and e8 at the same time.',
            highlights: [
              { sq: 'e8', mark: 'green' },
              { sq: 'g8', mark: 'red' },
            ],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Overloaded rook',
        fen: '3r2k1/ppq2ppp/8/8/3b4/8/PP3QPP/4R1K1 w - - 0 1',
        prompt: 'White to move. Black\'s d8 rook defends the d4 bishop AND the back rank. Exploit it.',
        solution: ['Qxd4'],
        hints: ['What happens if the rook recaptures on d4?', 'Take the bishop with the queen.'],
        explain:
          'Qxd4! If …Rxd4, then Re8# because the rook has left the back rank. So Black must accept losing the bishop.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd4', mark: 'green' },
            { sq: 'd8', mark: 'red' },
            { sq: 'e8', mark: 'yellow' },
          ],
          arrows: [{ from: 'e1', to: 'e8', mark: 'blue' }],
        },
      },
      {
        kind: 'try',
        title: 'Black exploits the overload',
        fen: '2r1r1k1/pp3ppp/8/8/8/8/PPB2PPP/2R3K1 b - - 0 1',
        prompt: 'Black to move. White\'s c1 rook guards the c2 bishop AND the back rank (e1). Win a piece.',
        solution: ['Rxc2'],
        hints: ['If White recaptures on c2, who guards e1?', 'Capture the bishop with your c8 rook.'],
        explain:
          '…Rxc2! If Rxc2, then …Re1# — the rook on c1 was overloaded. White cannot recapture and is simply a piece down.',
        solvedAnnotations: {
          highlights: [
            { sq: 'c2', mark: 'green' },
            { sq: 'c1', mark: 'red' },
            { sq: 'e1', mark: 'yellow' },
          ],
          arrows: [{ from: 'e8', to: 'e1', mark: 'blue' }],
        },
      },
      {
        kind: 'try',
        title: 'Two mates, one defender',
        fen: '5qk1/pp3p1p/5P1Q/8/1n6/8/PP4PP/4R1K1 w - - 0 1',
        prompt:
          'White to move and mate in two. Black\'s queen on f8 guards g7 (against Qg7#) and the back rank. Give it one job too many.',
        solution: ['Re8', 'Qxe8', 'Qg7#'],
        hints: [
          'Attack the queen with your rook on the back rank — it is also pinned there.',
          'If the queen takes on e8, it no longer guards g7.',
        ],
        explain:
          'Re8! attacks and pins the queen to the king. If …Qxe8, it has left g7 and Qg7# follows (the f6 pawn protects the queen). Anything else loses to Rxf8# or Qg7# — the pinned queen cannot capture on g7.',
        solvedAnnotations: {
          highlights: [
            { sq: 'g7', mark: 'green' },
            { sq: 'f6', mark: 'blue' },
            { sq: 'g8', mark: 'red' },
          ],
        },
      },
      {
        kind: 'quiz',
        question: 'How do you recognise an overloaded piece?',
        options: [
          'It is the only defender of two different things',
          'It is attacked by two of your pieces',
          'It has moved more than twice',
          'It is a pawn on the 7th rank',
        ],
        answer: 0,
        explain:
          'List what each enemy defender protects. When one piece is the sole guard of two important things, attack one of them and the other falls.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 10. MATING PATTERNS
  {
    id: 'mating-patterns',
    track: 'tactics',
    category: 'tactics',
    title: 'Classic Mating Patterns',
    level: 4,
    summary: 'Smothered mate, Arabian mate, Anastasia\'s mate and Légal\'s mate — pictures every player should know.',
    minutes: 14,
    keyPoints: [
      'Smothered mate: a knight mates a king boxed in by its OWN pieces. Philidor\'s legacy: Nf7+, Nh6++, Qg8+!! Rxg8, Nf7#.',
      'Arabian mate: rook next to the cornered king, protected by a knight (e.g. Rh7# with Nf6).',
      'Anastasia\'s mate: knight covers the escape squares, rook or queen mates along the edge file.',
      'Légal\'s mate: a "pinned" knight moves anyway — the queen sacrifice is a trap, and minor pieces mate the king.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Smothered mate',
        fen: '6rk/6pp/7N/8/8/8/5PPP/6K1 w - - 0 1',
        text:
          'The black king on h8 is completely surrounded by its own pieces: rook g8, pawns g7 and h7. A knight check cannot be blocked, so Nf7 would be checkmate — the king is "smothered". ' +
          'Look for this whenever a king sits in the corner with its own pieces crowding it.',
        highlights: [
          { sq: 'h8', mark: 'red' },
          { sq: 'g8', mark: 'yellow' },
          { sq: 'g7', mark: 'yellow' },
          { sq: 'h7', mark: 'yellow' },
          { sq: 'f7', mark: 'green' },
        ],
        arrows: [
          { from: 'h6', to: 'f7', mark: 'green' },
          { from: 'f7', to: 'h8', mark: 'red' },
        ],
      },
      {
        kind: 'demo',
        title: 'Légal\'s mate',
        fen: 'rn1qkbnr/ppp2p1p/3p2p1/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
        text: 'A trap from the 1750s that still catches beginners. The f3 knight looks pinned to the queen by the g4 bishop.',
        highlights: [
          { sq: 'g4', mark: 'red' },
          { sq: 'f3', mark: 'yellow' },
          { sq: 'd1', mark: 'yellow' },
        ],
        moves: [
          {
            san: 'Nxe5',
            text: 'White ignores the "pin" and grabs a pawn, leaving the queen hanging!',
            highlights: [{ sq: 'e5', mark: 'blue' }],
          },
          {
            san: 'Bxd1',
            text: 'Black greedily takes the queen. (Best was …dxe5, losing only a pawn.)',
            highlights: [{ sq: 'd1', mark: 'red' }],
          },
          {
            san: 'Bxf7+',
            text: 'Check! The king is forced forward.',
            highlights: [{ sq: 'f7', mark: 'blue' }],
          },
          { san: 'Ke7', text: 'The only legal move.' },
          {
            san: 'Nd5#',
            text: 'Checkmate by three minor pieces. The king is hemmed in by its own queen, bishop and pawn, while the knights and bishop cover every flight square.',
            highlights: [
              { sq: 'd5', mark: 'green' },
              { sq: 'e7', mark: 'red' },
            ],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Arabian mate',
        fen: 'r6k/pp1R4/5N2/8/8/8/5PPP/6K1 w - - 0 1',
        prompt: 'White to move. Mate with rook and knight working together.',
        solution: ['Rh7#'],
        hints: ['The knight on f6 guards g8 and h7.', 'Put the rook right next to the king.'],
        explain:
          'Rh7# — the Arabian mate, one of the oldest known patterns. The rook checks from h7 and covers g7; the knight protects the rook and covers g8.',
        solvedAnnotations: {
          highlights: [
            { sq: 'h7', mark: 'green' },
            { sq: 'f6', mark: 'blue' },
            { sq: 'h8', mark: 'red' },
          ],
          arrows: [
            { from: 'f6', to: 'h7', mark: 'blue' },
            { from: 'f6', to: 'g8', mark: 'blue' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Anastasia\'s mate',
        fen: '2r5/pp3pp1/6k1/8/7q/8/PP2nPPP/R2Q3K b - - 0 1',
        prompt:
          'Black to move and mate in two. Your knight on e2 already covers g1 and g3. Open the h-file!',
        solution: ['Qxh2+', 'Kxh2', 'Rh8#'],
        hints: [
          'Sacrifice the queen on h2 to drag the king onto the h-file.',
          'Then your c8 rook swings to the h-file.',
        ],
        explain:
          '…Qxh2+! Kxh2 …Rh8#. That is Anastasia\'s mate: the king is trapped on the edge by its own g2 pawn and the e2 knight (covering g1 and g3), and the rook mates along the h-file.',
        solvedAnnotations: {
          highlights: [
            { sq: 'h8', mark: 'green' },
            { sq: 'e2', mark: 'blue' },
            { sq: 'g1', mark: 'yellow' },
            { sq: 'g3', mark: 'yellow' },
            { sq: 'h2', mark: 'red' },
          ],
          arrows: [{ from: 'h8', to: 'h2', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'Philidor\'s legacy',
        fen: '4r2k/pp4pp/3q4/6N1/2Q5/8/PP3PPP/6K1 w - - 0 1',
        prompt:
          'White to move and mate in four. The full smothered-mate combination: knight check, double check, queen sacrifice, knight mate.',
        solution: ['Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
        hints: [
          'Start with a knight check on f7.',
          'Then Nh6+ is a DOUBLE check (knight and c4 queen).',
          'Sacrifice the queen on g8 so the rook blocks the king in, then mate on f7.',
        ],
        explain:
          'Nf7+ Kg8 Nh6+ (double check with the queen) Kh8 (…Kf8 Qf7#) Qg8+!! Rxg8 Nf7#. The queen sacrifice forces the rook onto g8 to smother its own king. This pattern is called Philidor\'s legacy.',
        solvedAnnotations: {
          highlights: [
            { sq: 'f7', mark: 'green' },
            { sq: 'h8', mark: 'red' },
            { sq: 'g8', mark: 'yellow' },
          ],
        },
      },
      {
        kind: 'quiz',
        question: 'In a smothered mate, what traps the king?',
        options: ['Its own pieces', 'The opponent\'s pawns', 'The edge of the board only', 'A pin'],
        answer: 0,
        explain: 'The king is surrounded by its own pieces, so a single knight check — which cannot be blocked — is mate.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── 11. ZWISCHENZUG & CCT
  {
    id: 'zwischenzug-cct',
    track: 'tactics',
    category: 'tactics',
    title: 'Zwischenzug & the CCT Scan',
    level: 4,
    summary: 'Don\'t recapture on autopilot: look for an in-between move, and scan Checks, Captures and Threats every move.',
    minutes: 12,
    keyPoints: [
      'A zwischenzug ("in-between move") is a forcing move — usually a check or a capture — played BEFORE the expected recapture.',
      'Recaptures are not compulsory. Ask first: "Is there a check or a bigger threat?"',
      'The CCT scan: every move, list all Checks, then all Captures, then all Threats — for both sides. Most tactics are found this way.',
      'Spot it: whenever you are about to recapture, or your opponent has just captured, pause and run CCT.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The CCT scan',
        fen: 'r1bqkb1r/pppn1ppp/5n2/3p2B1/3P4/2N5/PP2PPPP/R2QKBNR w KQkq - 0 6',
        text:
          'Tactics are found with a routine, not luck. Before each move, check in this order: (1) CHECKS — every check you can give; (2) CAPTURES — every capture; (3) THREATS — moves that attack something. Then do the same for your opponent\'s reply. ' +
          'Here White is tempted by Nxd5, since the d5 pawn looks like it is defended only by the pinned f6 knight. A careful CCT scan of Black\'s replies shows why it is a mistake — watch the demo.',
        highlights: [
          { sq: 'd5', mark: 'yellow' },
          { sq: 'f6', mark: 'red' },
          { sq: 'g5', mark: 'blue' },
        ],
        arrows: [{ from: 'c3', to: 'd5', mark: 'yellow' }],
      },
      {
        kind: 'demo',
        title: 'The in-between check',
        fen: 'r1bqkb1r/pppn1ppp/5n2/3p2B1/3P4/2N5/PP2PPPP/R2QKBNR w KQkq - 0 6',
        text: 'A classic trap in the Queen\'s Gambit Declined. White grabs the pawn, "trusting" the pin on f6.',
        moves: [
          { san: 'Nxd5', text: 'White takes the pawn: if the f6 knight recaptures, Bxd8 wins the queen… or so White thinks.' },
          {
            san: 'Nxd5',
            text: 'Black recaptures anyway, offering the queen!',
            highlights: [{ sq: 'd5', mark: 'yellow' }],
          },
          {
            san: 'Bxd8',
            text: 'White takes the queen. Now Black must not recapture on autopilot…',
            highlights: [{ sq: 'd8', mark: 'red' }],
          },
          {
            san: 'Bb4+',
            text: 'Zwischenzug! An in-between CHECK. The only way to block it is with the queen on d2.',
            highlights: [
              { sq: 'b4', mark: 'blue' },
              { sq: 'e1', mark: 'red' },
            ],
            arrows: [{ from: 'b4', to: 'e1', mark: 'red' }],
          },
          { san: 'Qd2', text: 'Forced — the queen blocks.' },
          { san: 'Bxd2+', text: 'Black wins the white queen back with check.' },
          { san: 'Kxd2', text: 'White recaptures.' },
          {
            san: 'Kxd8',
            text: 'Only now does Black take the bishop on d8. Queens are gone, and Black has won a knight for a pawn.',
            highlights: [{ sq: 'd8', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'CCT: checks first',
        fen: 'r5k1/p3b1pp/1p6/8/8/2N5/PP3PPP/3Q2K1 w - - 0 1',
        prompt: 'White to move. Run the CCT scan — start with every check. One of them wins material.',
        solution: ['Qd5+'],
        hints: ['List your queen checks.', 'Which check also attacks the rook on a8?'],
        explain:
          'Qd5+ checks the king along the d5–g8 diagonal and attacks the rook on a8 along d5–a8. After the king moves, Qxa8 wins the rook. Checks first: they are the most forcing moves.',
        solvedAnnotations: {
          highlights: [
            { sq: 'd5', mark: 'blue' },
            { sq: 'g8', mark: 'red' },
            { sq: 'a8', mark: 'red' },
          ],
          arrows: [
            { from: 'd5', to: 'g8', mark: 'red' },
            { from: 'd5', to: 'a8', mark: 'red' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Don\'t recapture yet',
        fen: '4r1k1/5pp1/7p/8/8/6P1/5PKP/R2qR3 w - - 0 1',
        prompt:
          'White to move. Black has just played …Qxd1, taking your queen. You can recapture — but is there something even better first?',
        solution: ['Rxe8+', 'Kh7', 'Rxd1'],
        hints: [
          'Checks first! Can one of your rooks capture with check?',
          'Take the e8 rook with check, THEN take back the queen.',
        ],
        explain:
          'Rxe8+! is the in-between move: it grabs a rook with check. After …Kh7 (Black\'s luft saves it from mate), Rxd1 recaptures the queen. Result: White is a whole rook up instead of an equal trade.',
        solvedAnnotations: {
          highlights: [
            { sq: 'e8', mark: 'green' },
            { sq: 'd1', mark: 'green' },
          ],
        },
      },
      {
        kind: 'try',
        title: 'Black\'s zwischenzug',
        fen: 'r2Qr3/5ppk/7p/8/8/7P/5PP1/4R1K1 b - - 0 1',
        prompt:
          'Black to move. White has just captured your queen on d8. Recapturing is natural — but look for a check first.',
        solution: ['Rxe1+', 'Kh2', 'Rxd8'],
        hints: [
          'Which of your pieces can capture with check?',
          'Take the e1 rook with check first; the d8 queen will still be there.',
        ],
        explain:
          '…Rxe1+! Kh2 …Rxd8. Instead of an even queen trade, Black wins a whole rook. Every time you are about to recapture, ask: "Do I have a check or capture that comes first?"',
        solvedAnnotations: {
          highlights: [
            { sq: 'e1', mark: 'green' },
            { sq: 'd8', mark: 'green' },
          ],
        },
      },
      {
        kind: 'quiz',
        question: 'In which order does the CCT scan look at candidate moves?',
        options: ['Checks, Captures, Threats', 'Captures, Castling, Threats', 'Threats, Checks, Captures', 'Centre, Castling, Tempo'],
        answer: 0,
        explain:
          'Checks are the most forcing, then captures, then threats. Scan them for BOTH sides before every move — it catches most tactics and most blunders.',
      },
    ],
  },
];
