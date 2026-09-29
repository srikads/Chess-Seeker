import type { Lesson } from './types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const FOUNDATIONS: Lesson[] = [
  {
    id: 'piece-values',
    track: 'foundations',
    category: 'openings',
    title: 'What the Pieces Are Worth',
    level: 1,
    summary: 'Pawn 1, knight 3, bishop 3, rook 5, queen 9 — and how to use that to decide trades.',
    minutes: 6,
    keyPoints: [
      'Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9. The king is priceless.',
      'Before every capture, count: what do I win, what do I lose?',
      'A piece that is attacked more times than it is defended is usually lost.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The point system',
        fen: '4k3/8/8/8/3QRBNP/8/8/4K3 w - - 0 1',
        text:
          'Every piece has a rough value measured in pawns. Pawn (h4) = 1, Knight (g4) = 3, Bishop (f4) = 3, Rook (e4) = 5, Queen (d4) = 9. ' +
          'These numbers let you judge trades quickly: giving a knight (3) for a rook (5) wins you 2 points — that is called "winning the exchange".',
        highlights: [
          { sq: 'h4', mark: 'yellow' },
          { sq: 'g4', mark: 'blue' },
          { sq: 'f4', mark: 'blue' },
          { sq: 'e4', mark: 'green' },
          { sq: 'd4', mark: 'red' },
        ],
      },
      {
        kind: 'demo',
        title: 'Counting a capture',
        fen: 'r3k3/8/8/3n4/8/2N5/8/4K2R w - - 0 1',
        text: 'White can take the knight on d5. Is it safe? Count attackers and defenders: the d5 knight is attacked once (Nc3) and defended by nothing.',
        highlights: [{ sq: 'd5', mark: 'red' }, { sq: 'c3', mark: 'green' }],
        arrows: [{ from: 'c3', to: 'd5', mark: 'green' }],
        moves: [
          { san: 'Nxd5', text: 'White wins a whole knight (+3) for free. Always look for undefended ("hanging") pieces — both yours and your opponent\'s.', highlights: [{ sq: 'd5', mark: 'green' }] },
        ],
      },
      {
        kind: 'try',
        title: 'Your turn: grab the free piece',
        fen: '4k3/pp6/5b2/8/3B4/8/PP6/4K3 w - - 0 1',
        prompt: 'One black piece is hanging. Find the capture that wins it.',
        solution: ['Bxf6'],
        hints: ['Which black piece is attacked by one of yours?', 'Your bishop on d4 looks along the diagonal toward f6.'],
        explain: 'Bxf6 wins a bishop (+3) because nothing defends f6. Scan every capture each move — it is the fastest way to win material.',
        solvedAnnotations: { highlights: [{ sq: 'f6', mark: 'green' }] },
      },
      {
        kind: 'quiz',
        question: 'You can give your knight to win the opponent\'s rook. Is it a good trade by the point system?',
        options: ['Yes — I gain about 2 points', 'No — I lose 2 points', 'It is exactly equal'],
        answer: 0,
        explain: 'Knight = 3, Rook = 5. You give 3 and get 5, a net gain of 2. This is called winning the exchange.',
      },
    ],
  },
  {
    id: 'control-the-centre',
    track: 'foundations',
    category: 'openings',
    title: 'Control the Centre',
    level: 1,
    summary: 'Why d4, e4, d5 and e5 matter, and how to claim them with pawns and pieces.',
    minutes: 7,
    keyPoints: [
      'The centre is d4, e4, d5 and e5 — pieces placed there or aimed there control more of the board.',
      'Start with a centre pawn (1.e4 or 1.d4) and support it with pieces such as Nf3 and Nc6.',
      "When an enemy centre pawn touches yours, consider capturing it — especially if it is free.",
      'Pawns capture diagonally forward: know which central squares each of your pawns covers.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The four central squares',
        fen: START,
        text:
          'The four squares in the middle of the board — d4, e4, d5 and e5 — are called the centre. ' +
          'A piece in the centre reaches far more squares: a knight on e4 can jump to 8 squares, a knight in the corner on a1 only 2. ' +
          'Whoever controls the centre has more room to move pieces and can switch quickly from one side of the board to the other. ' +
          'The simplest way to start fighting for it is to move a centre pawn two squares on your first move.',
        highlights: [
          { sq: 'd4', mark: 'green' },
          { sq: 'e4', mark: 'green' },
          { sq: 'd5', mark: 'green' },
          { sq: 'e5', mark: 'green' },
        ],
      },
      {
        kind: 'demo',
        title: 'Pawns and pieces fight for the middle',
        fen: START,
        text: 'Watch how both sides use pawns AND pieces to fight over the four central squares. Step through the moves.',
        highlights: [
          { sq: 'd4', mark: 'yellow' },
          { sq: 'e4', mark: 'yellow' },
          { sq: 'd5', mark: 'yellow' },
          { sq: 'e5', mark: 'yellow' },
        ],
        moves: [
          {
            san: 'e4',
            text: 'White puts a pawn in the centre. It attacks d5 and f5, and it opens lines for the queen and the f1 bishop.',
            highlights: [{ sq: 'e4', mark: 'blue' }],
            arrows: [{ from: 'e4', to: 'd5', mark: 'green' }, { from: 'e4', to: 'f5', mark: 'green' }],
          },
          {
            san: 'e5',
            text: 'Black does the same: the e5 pawn attacks d4 and f4 and stops White\'s e-pawn from advancing.',
            highlights: [{ sq: 'e5', mark: 'blue' }],
            arrows: [{ from: 'e5', to: 'd4', mark: 'green' }, { from: 'e5', to: 'f4', mark: 'green' }],
          },
          {
            san: 'Nf3',
            text: 'White develops a knight that attacks the e5 pawn and also covers d4. Pieces control the centre too, not just pawns.',
            highlights: [{ sq: 'f3', mark: 'blue' }, { sq: 'e5', mark: 'red' }],
            arrows: [{ from: 'f3', to: 'e5', mark: 'red' }, { from: 'f3', to: 'd4', mark: 'green' }],
          },
          {
            san: 'Nc6',
            text: 'Black defends e5 with a knight, which also watches d4.',
            highlights: [{ sq: 'c6', mark: 'blue' }],
            arrows: [{ from: 'c6', to: 'e5', mark: 'green' }, { from: 'c6', to: 'd4', mark: 'green' }],
          },
          {
            san: 'd4',
            text: 'A second centre pawn! It attacks e5 and challenges Black\'s hold on the middle.',
            highlights: [{ sq: 'd4', mark: 'blue' }, { sq: 'e5', mark: 'red' }],
            arrows: [{ from: 'd4', to: 'e5', mark: 'red' }],
          },
          {
            san: 'exd4',
            text: 'Black trades the e5 pawn for White\'s d-pawn.',
            highlights: [{ sq: 'd4', mark: 'yellow' }],
          },
          {
            san: 'Nxd4',
            text: 'White recaptures with the knight. White now has a pawn on e4 and a knight on d4 — both in the centre — while Black has no centre pawn left and must fight back with pieces (for example ...Nf6 or ...Bc5).',
            highlights: [{ sq: 'e4', mark: 'green' }, { sq: 'd4', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Your turn: meet 1...d5',
        fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        prompt: 'Black answered 1.e4 with 1...d5, attacking your e4 pawn. Find the best reply.',
        solution: ['exd5'],
        hints: ['Two centre pawns are touching. Who should capture first?', 'Your e4 pawn can capture diagonally forward onto d5.'],
        explain:
          '2.exd5 takes a centre pawn. Black usually wins it back with 2...Qxd5 (bringing the queen out early) or 2...Nf6 followed by ...Nxd5. ' +
          'Either way Black has spent moves getting the pawn back while White develops.',
        highlights: [{ sq: 'd5', mark: 'red' }, { sq: 'e4', mark: 'blue' }],
        solvedAnnotations: { highlights: [{ sq: 'd5', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'Take the free centre pawn',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
        prompt: 'After 1.d4 Black played 1...e5?!, offering a centre pawn. Nothing defends it. Take it.',
        solution: ['dxe5'],
        hints: ['Which of your pawns touches e5?', 'The d4 pawn captures diagonally forward to e5.'],
        explain:
          '2.dxe5 wins a pawn. Black gets a little quicker development in return, but this gambit (the Englund Gambit) is considered dubious: ' +
          'a clean extra centre pawn is worth a lot.',
        highlights: [{ sq: 'e5', mark: 'red' }],
        arrows: [{ from: 'd4', to: 'e5', mark: 'yellow' }],
        solvedAnnotations: { highlights: [{ sq: 'e5', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'Black to move: answer 2.d4',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2',
        prompt: 'You are Black. White has pushed a second pawn to d4, attacking your e5 pawn. What is the best reply?',
        solution: ['exd4'],
        hints: [
          'Your e5 pawn is attacked. You could defend it — or trade it off.',
          'Capture on d4. If White takes back with the queen, which of your pieces can attack it?',
        ],
        explain:
          '2...exd4 removes White\'s d-pawn. If 3.Qxd4, White\'s queen stands in the centre very early and 3...Nc6 attacks it, so Black develops with a gain of time. ' +
          'Defending with 2...d6 is playable, but after 3.dxe5 dxe5 4.Qxd8+ Kxd8 Black has lost the right to castle.',
        highlights: [{ sq: 'd4', mark: 'red' }, { sq: 'e5', mark: 'yellow' }],
        arrows: [{ from: 'd4', to: 'e5', mark: 'red' }],
        solvedAnnotations: { highlights: [{ sq: 'd4', mark: 'green' }], arrows: [{ from: 'b8', to: 'c6', mark: 'blue' }] },
      },
      {
        kind: 'quiz',
        question: 'Which first move does the most to fight for the centre?',
        options: ["1.a4", "1.h3", "1.e4", "1.Na3"],
        answer: 2,
        explain:
          '1.e4 occupies a central square, attacks d5 and f5, and opens lines for the queen and the f1 bishop. ' +
          'Edge pawn moves like a4 or h3 do nothing for the centre, and a knight on a3 looks toward the edge instead of the middle.',
      },
      {
        kind: 'quiz',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        question: 'After 1.e4 e5, which squares does White\'s e4 pawn attack?',
        options: ["e5 only", "d5 and f5", "d4 and f4", "d3 and f3"],
        answer: 1,
        explain:
          'Pawns move straight ahead but capture diagonally forward. The e4 pawn attacks d5 and f5. It is blocked by the e5 pawn and cannot move forward at all.',
      },
    ],
  },
  {
    id: 'develop-your-pieces',
    track: 'foundations',
    category: 'openings',
    title: 'Develop Your Pieces',
    level: 1,
    summary: 'Get knights and bishops off the back rank quickly — ideally with threats that gain time.',
    minutes: 8,
    keyPoints: [
      'In the opening, every move should develop a piece, fight for the centre, or make your king safe.',
      'Knights usually come out before bishops; aim them at the centre (f3 and c3 for White, f6 and c6 for Black).',
      'Do not move the same piece twice without a good reason — every wasted move is a free move for your opponent.',
      'Best of all: develop a piece WITH a threat, so your opponent loses time answering it (you "gain a tempo").',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'What "developed" looks like',
        fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 6',
        text:
          'This position arises after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O Nf6 5.d3 d6. Both sides have brought knights and bishops off the back rank (blue), and White has castled. ' +
          'Developed pieces control the centre, protect each other and are ready to attack. A piece still on its starting square does nothing — ' +
          'the next jobs here are the bishops on c1 and c8 (yellow) and White\'s b1 knight.',
        highlights: [
          { sq: 'f3', mark: 'blue' },
          { sq: 'c4', mark: 'blue' },
          { sq: 'c6', mark: 'blue' },
          { sq: 'f6', mark: 'blue' },
          { sq: 'c5', mark: 'blue' },
          { sq: 'c1', mark: 'yellow' },
          { sq: 'c8', mark: 'yellow' },
          { sq: 'b1', mark: 'yellow' },
        ],
      },
      {
        kind: 'demo',
        title: 'Ten principled moves',
        fen: START,
        text: 'Every move in this sequence develops a piece, fights for the centre, or helps the king get safe. Step through and see why.',
        moves: [
          { san: 'e4', text: 'Centre pawn first. It also opens the diagonal for the f1 bishop and the queen.' },
          { san: 'e5', text: 'Black stakes an equal claim in the centre.' },
          {
            san: 'Nf3',
            text: 'Knight out toward the centre, and it attacks e5. A developing move that also makes a threat is ideal.',
            arrows: [{ from: 'f3', to: 'e5', mark: 'red' }],
          },
          {
            san: 'Nc6',
            text: 'Black develops and defends e5 at the same time.',
            arrows: [{ from: 'c6', to: 'e5', mark: 'green' }],
          },
          {
            san: 'Bc4',
            text: 'The bishop comes to an active diagonal aiming at f7 — the weakest point in Black\'s camp, because only the king defends it.',
            highlights: [{ sq: 'f7', mark: 'red' }],
            arrows: [{ from: 'c4', to: 'f7', mark: 'red' }],
          },
          {
            san: 'Bc5',
            text: 'Black mirrors, aiming at f2.',
            highlights: [{ sq: 'f2', mark: 'red' }],
            arrows: [{ from: 'c5', to: 'f2', mark: 'red' }],
          },
          {
            san: 'O-O',
            text: 'White castles: the king is tucked away and the rook moves toward the centre. Only the kingside knight and bishop had to move first.',
            highlights: [{ sq: 'g1', mark: 'blue' }, { sq: 'f1', mark: 'green' }],
          },
          {
            san: 'Nf6',
            text: 'Black develops the other knight, attacking the e4 pawn.',
            arrows: [{ from: 'f6', to: 'e4', mark: 'red' }],
          },
          {
            san: 'd3',
            text: 'White defends e4 and at the same time opens the diagonal for the c1 bishop.',
            arrows: [{ from: 'd3', to: 'e4', mark: 'green' }, { from: 'c1', to: 'g5', mark: 'yellow' }],
          },
          {
            san: 'd6',
            text: 'Black does the same: supports e5 and frees the c8 bishop. No move was wasted by either side.',
            arrows: [{ from: 'c8', to: 'g4', mark: 'yellow' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Develop with a threat',
        fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3',
        prompt: 'After 1.e4 d5 2.exd5 Qxd5 Black\'s queen is out early on d5. Develop a piece so that it attacks the queen.',
        solution: ['Nc3'],
        hints: ['Which of your knights or bishops can reach a square that attacks d5?', 'The b1 knight can jump to c3.'],
        explain:
          '3.Nc3 develops a knight toward the centre AND attacks the queen. Black must spend another move with the queen, so White gets a free move ("tempo") for development.',
        highlights: [{ sq: 'd5', mark: 'red' }],
        solvedAnnotations: { arrows: [{ from: 'c3', to: 'd5', mark: 'green' }], highlights: [{ sq: 'c3', mark: 'blue' }] },
      },
      {
        kind: 'try',
        title: 'Black to move: gain time on the queen',
        fen: 'rnbqkbnr/pp1ppppp/8/8/3QP3/8/PPP2PPP/RNB1KBNR b KQkq - 0 3',
        prompt: 'You are Black. After 1.e4 c5 2.d4 cxd4 3.Qxd4 White\'s queen sits in the middle of the board. Develop a piece that attacks it.',
        solution: ['Nc6'],
        hints: ['Look for a developing move that attacks White\'s queen on d4.', 'Your b8 knight can reach c6.'],
        explain:
          '3...Nc6 develops a knight and attacks the queen, so White must move it again (for example 4.Qd3 or 4.Qe3). Black gets a piece out for free while White\'s queen wanders.',
        highlights: [{ sq: 'd4', mark: 'red' }],
        solvedAnnotations: { arrows: [{ from: 'c6', to: 'd4', mark: 'green' }], highlights: [{ sq: 'c6', mark: 'blue' }] },
      },
      {
        kind: 'quiz',
        title: 'Pick the principled move',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        question: 'White to move after 1.e4 e5 2.Nf3 Nc6. Which move follows the development principles best?',
        options: [
          "h4 — push a pawn on the edge",
          "Ng5 — move the same knight again",
          "Qe2 — bring the queen out before the minor pieces",
          "Bc4 — develop a new piece to an active diagonal",
        ],
        answer: 3,
        explain:
          'Bc4 brings a new piece into play and eyes f7. h4 develops nothing; Ng5 moves an already developed knight a second time without a real threat (f7 is defended by the king); ' +
          'and the queen should usually wait until the knights and bishops are out.',
      },
      {
        kind: 'quiz',
        question: 'Why do players usually develop knights before bishops?',
        options: [
          "We usually know the best knight squares (f3/c3, f6/c6) early, while the best bishop square depends on how the pawns end up",
          "Knights are worth more than bishops",
          "Bishops cannot move until every pawn has moved",
          "It is one of the official rules of chess",
        ],
        answer: 0,
        explain:
          'Knights are short-range pieces with few good squares, and f3/c3 (f6/c6) are almost always right. Bishops are long-range and have several possible diagonals, so it pays to wait and see where they belong. It is a guideline, not a rule.',
      },
    ],
  },
  {
    id: 'king-safety-castling',
    track: 'foundations',
    category: 'openings',
    title: 'King Safety and Castling',
    level: 1,
    summary: 'The castling rules, why to castle early, and what happens to a king stuck on an open file.',
    minutes: 9,
    keyPoints: [
      'Castle early: develop the kingside knight and bishop, then O-O.',
      'You cannot castle if the king or that rook has moved, if you are in check, or if the king would pass through or land on an attacked square.',
      'After castling, leave the f-, g- and h-pawns in front of your king alone unless there is a concrete reason.',
      'A king left in the centre on an open file can be hit by checks, pins and discovered attacks.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The castling rules',
        fen: 'r3k2r/ppp2ppp/8/8/2b5/8/PPP2PPP/R3K2R w KQkq - 0 1',
        text:
          'Castling moves the king two squares toward a rook, and that rook jumps to the square on the king\'s other side. It is the only move where two pieces move at once. ' +
          'You may castle only if: (1) neither the king nor that rook has moved yet; (2) no pieces stand between them; (3) your king is not in check; ' +
          '(4) the king does not pass through or land on a square attacked by the enemy. ' +
          'Here Black\'s bishop on c4 attacks f1, so White may NOT castle kingside — the king would pass through f1. Queenside castling is fine: d1 and c1 are safe.',
        highlights: [
          { sq: 'f1', mark: 'red' },
          { sq: 'g1', mark: 'red' },
          { sq: 'd1', mark: 'green' },
          { sq: 'c1', mark: 'green' },
          { sq: 'c4', mark: 'blue' },
        ],
        arrows: [{ from: 'c4', to: 'f1', mark: 'red' }],
      },
      {
        kind: 'demo',
        title: 'Castling on both sides',
        fen: 'r3k2r/ppp2ppp/8/8/2b5/8/PPP2PPP/R3K2R w KQkq - 0 1',
        text: 'White cannot castle kingside, so White castles queenside. Black then castles kingside.',
        moves: [
          {
            san: 'O-O-O',
            text: 'Queenside castling: the king goes to c1 and the a1 rook jumps to d1 — straight onto the open d-file.',
            highlights: [{ sq: 'c1', mark: 'blue' }, { sq: 'd1', mark: 'green' }],
          },
          {
            san: 'O-O',
            text: 'Kingside castling for Black: nothing attacks f8 or g8, so the king goes to g8 and the rook to f8. The king now hides behind the f7, g7 and h7 pawns.',
            highlights: [{ sq: 'g8', mark: 'blue' }, { sq: 'f8', mark: 'green' }, { sq: 'f7', mark: 'green' }, { sq: 'g7', mark: 'green' }, { sq: 'h7', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'demo',
        title: 'Castle early',
        fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        text: 'After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 White\'s knight and bishop have left f1 and g1, so the road to castling is clear.',
        highlights: [{ sq: 'f1', mark: 'yellow' }, { sq: 'g1', mark: 'yellow' }],
        moves: [
          {
            san: 'O-O',
            text: 'Castle early! The king hides behind the f2, g2 and h2 pawns, and the rook comes to f1, closer to the centre.',
            highlights: [{ sq: 'g1', mark: 'blue' }, { sq: 'f2', mark: 'green' }, { sq: 'g2', mark: 'green' }, { sq: 'h2', mark: 'green' }],
          },
          { san: 'Nf6', text: 'Black develops the g8 knight, clearing the way to castle too.' },
          { san: 'd3', text: 'White supports the e4 pawn.' },
          {
            san: 'O-O',
            text: 'Black castles as well. Both kings are safe. From now on, keep those three pawns in front of the king at home unless there is a very good reason to move them.',
            highlights: [{ sq: 'g8', mark: 'blue' }, { sq: 'f7', mark: 'green' }, { sq: 'g7', mark: 'green' }, { sq: 'h7', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Punish the king in the centre (1)',
        fen: 'rnbqkb1r/pppp1ppp/8/4N3/4n3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
        prompt: 'After 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! Black grabbed your e4 pawn. Black\'s king is still on e8 and the e-file is open. Find the strong queen move.',
        solution: ['Qe2'],
        hints: [
          'Put your queen on the e-file, lined up with Black\'s king.',
          'Qe2 attacks the knight on e4 — and if that knight runs away, your e5 knight can move with a discovered check.',
        ],
        explain:
          '4.Qe2! attacks the e4 knight along the open e-file. If Black simply retreats it (4...Nf6??), the e5 knight moves away with a discovered check and wins Black\'s queen — you will do that next. ' +
          'Black\'s best is 4...Qe7, blocking the file, and after 5.Qxe4 d6 6.d4 White keeps the better game. The lesson: an uncastled king on an open file is a target.',
        highlights: [{ sq: 'e8', mark: 'red' }, { sq: 'e4', mark: 'yellow' }],
        solvedAnnotations: {
          highlights: [{ sq: 'e2', mark: 'blue' }, { sq: 'e4', mark: 'red' }, { sq: 'e8', mark: 'red' }],
          arrows: [{ from: 'e2', to: 'e4', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'Punish the king in the centre (2)',
        fen: 'rnbqkb1r/pppp1ppp/5n2/4N3/8/8/PPPPQPPP/RNB1KB1R w KQkq - 2 5',
        prompt: 'Black retreated with 4...Nf6??. Your queen and Black\'s king are on the same open e-file, with only your own knight in between. Win Black\'s queen.',
        solution: ['Nc6+'],
        hints: [
          'Any move of your e5 knight uncovers a check from the queen on e2 — a discovered check.',
          'Pick the knight move that also attacks Black\'s queen on d8.',
        ],
        explain:
          '5.Nc6+! The knight steps aside so the queen gives check, and the knight itself attacks the queen on d8. Black must deal with the check first (for example 5...Be7 or 5...Qe7), ' +
          'and then White captures the queen. This is why kings do not belong on open files.',
        highlights: [{ sq: 'e2', mark: 'blue' }, { sq: 'e8', mark: 'red' }, { sq: 'e5', mark: 'yellow' }],
        arrows: [{ from: 'e2', to: 'e8', mark: 'yellow' }],
        solvedAnnotations: {
          arrows: [{ from: 'e2', to: 'e8', mark: 'red' }, { from: 'c6', to: 'd8', mark: 'red' }],
          highlights: [{ sq: 'd8', mark: 'red' }, { sq: 'e8', mark: 'red' }],
        },
      },
      {
        kind: 'quiz',
        title: 'Keep the shelter',
        fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 1 6',
        question: 'Both sides have castled. Which White pawn move weakens White\'s king the most?',
        options: ["a3", "g4", "c3", "h3"],
        answer: 1,
        explain:
          'g4 tears open the pawn shield in front of the king: f3 and h3 lose their pawn guard, the pawn can never come back, and here it is simply attacked by the f6 knight. ' +
          'a3 and c3 are far from the king, and h3 is a small, common "escape square" move. Rule of thumb: after castling, leave the f-, g- and h-pawns alone unless there is a concrete reason.',
      },
      {
        kind: 'quiz',
        question: 'Which of these makes kingside castling impossible for the rest of the game?',
        options: [
          "Your king was in check earlier in the game",
          "Your h1 rook is attacked right now",
          "Earlier, your king moved to f1 and later went back to e1",
          "Your a1 rook has already moved",
        ],
        answer: 2,
        explain:
          'Once the king has moved, castling is gone for good — even if it returns to e1. A past check does not matter, the rook being attacked does not stop castling, and the a1 rook only affects queenside castling.',
      },
    ],
  },
  {
    id: 'queen-out-early',
    track: 'foundations',
    category: 'openings',
    title: "Don't Bring the Queen Out Too Early",
    level: 2,
    summary: 'Why early queen raids lose time, how to stop Scholar\'s Mate, and how to punish the queen.',
    minutes: 10,
    keyPoints: [
      'An early queen gets chased by knights, bishops and pawns — every chase is a free developing move for your opponent.',
      "Know the Scholar's Mate pattern (queen + bishop against f7 or f2). Block it with ...g6, defend with ...Qe7, or put a knight on f6 when the queen is on f3.",
      'When you must answer a threat, look for a defence that also develops or attacks.',
      'Usually bring the queen out only after the knights and bishops.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The queen on move two',
        fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
        text:
          'After 1.e4 e5 2.Qh5 White\'s queen attacks the e5 pawn and the f7 pawn, which only Black\'s king defends. With a bishop on c4 it could threaten mate on f7. ' +
          'But the queen is worth 9 points, so whenever you attack it with a smaller piece it must run away — and you get a free developing move (a "tempo"). ' +
          'Good defence turns an early queen raid into a lead in development.',
        highlights: [{ sq: 'h5', mark: 'blue' }, { sq: 'e5', mark: 'red' }, { sq: 'f7', mark: 'red' }],
        arrows: [{ from: 'h5', to: 'e5', mark: 'red' }, { from: 'h5', to: 'f7', mark: 'red' }],
      },
      {
        kind: 'demo',
        title: "Scholar's Mate",
        fen: START,
        text: 'This is the trap every beginner meets. Watch how queen and bishop team up against f7.',
        moves: [
          { san: 'e4', text: 'A normal first move.' },
          { san: 'e5', text: 'Black answers in the centre.' },
          {
            san: 'Bc4',
            text: 'The bishop aims at f7.',
            arrows: [{ from: 'c4', to: 'f7', mark: 'red' }],
          },
          { san: 'Nc6', text: 'Black develops and defends e5.' },
          {
            san: 'Qh5',
            text: 'Now queen AND bishop both attack f7. The threat is Qxf7 checkmate.',
            highlights: [{ sq: 'f7', mark: 'red' }],
            arrows: [{ from: 'c4', to: 'f7', mark: 'red' }, { from: 'h5', to: 'f7', mark: 'red' }],
          },
          {
            san: 'Nf6',
            text: 'A blunder: Black attacks the queen but ignores the threat.',
            highlights: [{ sq: 'f6', mark: 'yellow' }, { sq: 'f7', mark: 'red' }],
          },
          {
            san: 'Qxf7#',
            text: 'Checkmate. The queen on f7 is protected by the c4 bishop, so the king cannot take it, and it has no safe square. Always ask "what does my opponent threaten?" before you move.',
            highlights: [{ sq: 'f7', mark: 'red' }, { sq: 'e8', mark: 'red' }],
            arrows: [{ from: 'c4', to: 'f7', mark: 'blue' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Black to move: stop the mate with tempo',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        prompt: 'You are Black. After 1.e4 e5 2.Qh5 Nc6 3.Bc4 White threatens Qxf7#. Stop the mate AND attack White\'s queen with one move.',
        solution: ['g6'],
        hints: [
          'The queen reaches f7 along the diagonal h5–g6–f7. Can you block it?',
          'A pawn on g6 blocks the diagonal and attacks h5.',
        ],
        explain:
          '3...g6! blocks the queen\'s path to f7 and attacks it with a humble pawn, so the queen must move again. (3...Qe7 also defends, but gains no time.) ' +
          'Never play 3...Nf6?? here — that is exactly Scholar\'s Mate.',
        highlights: [{ sq: 'f7', mark: 'red' }, { sq: 'h5', mark: 'blue' }],
        arrows: [{ from: 'h5', to: 'f7', mark: 'red' }, { from: 'c4', to: 'f7', mark: 'red' }],
        solvedAnnotations: {
          highlights: [{ sq: 'g6', mark: 'green' }, { sq: 'h5', mark: 'red' }],
          arrows: [{ from: 'g6', to: 'h5', mark: 'green' }],
        },
      },
      {
        kind: 'try',
        title: 'Black to move: defend and develop',
        fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4',
        prompt: 'The queen retreated with 4.Qf3 and again threatens Qxf7#. Defend f7 while developing a NEW minor piece.',
        solution: ['Nf6'],
        hints: ['Block the f-file between the queen on f3 and f7.', 'Your g8 knight can go to f6.'],
        explain:
          '4...Nf6 blocks the queen\'s line to f7 and develops a knight — a perfect answer. White\'s queen has moved twice and now stands on f3, the best square for White\'s own g1 knight.',
        highlights: [{ sq: 'f7', mark: 'red' }, { sq: 'f3', mark: 'blue' }],
        arrows: [{ from: 'f3', to: 'f7', mark: 'red' }, { from: 'c4', to: 'f7', mark: 'red' }],
        solvedAnnotations: { highlights: [{ sq: 'f6', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'Black to move: chase the queen again',
        fen: 'r1bqkb1r/pppp1p1p/2n2np1/4p3/2B1P3/1Q6/PPPP1PPP/RNB1K1NR b KQkq - 3 5',
        prompt: 'White played 5.Qb3?, moving the queen for the THIRD time and lining it up behind the c4 bishop against f7. Find the knight jump that attacks the queen and another target.',
        solution: ['Nd4'],
        hints: [
          'Which square can your c6 knight reach that attacks b3?',
          'From d4 the knight attacks the queen and also c2 — where a knight check would fork king and rook.',
        ],
        explain:
          '5...Nd4! attacks the queen and threatens ...Nxc2+, forking the king and the a1 rook. White cannot handle everything: even after 6.Bxf7+ Ke7 the queen is still attacked, and Black wins material. ' +
          'After five moves White has developed only one minor piece — the price of all those queen moves.',
        highlights: [{ sq: 'b3', mark: 'blue' }, { sq: 'c6', mark: 'yellow' }],
        solvedAnnotations: {
          highlights: [{ sq: 'd4', mark: 'green' }, { sq: 'b3', mark: 'red' }, { sq: 'c2', mark: 'red' }],
          arrows: [{ from: 'd4', to: 'b3', mark: 'red' }, { from: 'd4', to: 'c2', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'White to move: when Black forgets e5',
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3',
        prompt: 'Now you are White. After 1.e4 e5 2.Qh5 Black played 2...Nf6?, attacking your queen but leaving the e5 pawn unprotected. Punish it.',
        solution: ['Qxe5+'],
        hints: ['Before running away with your queen, check what it can capture.', 'Take on e5 — with check!'],
        explain:
          '3.Qxe5+ wins a pawn with check. But notice: after 3...Be7 Black will chase the queen again with ...Nc6 and ...O-O, getting development for the pawn — the computer rates the position about equal. ' +
          'Even when an early queen raid wins a pawn, it costs time.',
        highlights: [{ sq: 'e5', mark: 'red' }, { sq: 'h5', mark: 'blue' }],
        solvedAnnotations: { highlights: [{ sq: 'e5', mark: 'green' }, { sq: 'e8', mark: 'red' }] },
      },
      {
        kind: 'quiz',
        question:
          'After six moves, White\'s queen has moved four times and White has one minor piece out; Black has developed two knights and a bishop. What is White\'s main problem?',
        options: [
          "White is behind in development — Black has more pieces working",
          "The queen is worth less than a knight",
          "White is no longer allowed to castle",
          "There is no problem: the queen is the strongest piece, so moving it often is good",
        ],
        answer: 0,
        explain:
          'Every queen move that does not create a real threat is a move not spent developing. Black\'s extra developed pieces will soon attack, while White still has to bring out knights and bishops and castle.',
      },
    ],
  },
  {
    id: 'hanging-pieces',
    track: 'foundations',
    category: 'openings',
    title: 'Hanging Pieces and the Blunder Check',
    level: 2,
    summary: 'Count attackers and defenders, capture with your cheapest piece, and check every move for loose pieces.',
    minutes: 9,
    keyPoints: [
      '"Hanging" means attacked and not (sufficiently) defended. Count attackers vs defenders on the square.',
      'When a target is defended, capture with your least valuable attacker first.',
      'A defended piece can still be won by attacking it with something cheaper — a pawn attacking a knight, a knight attacking a rook.',
      'Blunder check every move: What does their move threaten? Is any of my pieces loose? Is my planned move safe?',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Count attackers and defenders',
        fen: '3r2k1/5ppp/8/3n4/8/2N5/5PPP/3R2K1 w - - 0 1',
        text:
          'Before any capture, count. How many of your pieces attack the square? How many enemy pieces defend it? ' +
          'Black\'s knight on d5 is attacked TWICE (the c3 knight and the d1 rook) and defended only ONCE (the d8 rook). ' +
          'More attackers than defenders usually means you can win something.',
        highlights: [
          { sq: 'd5', mark: 'red' },
          { sq: 'c3', mark: 'blue' },
          { sq: 'd1', mark: 'blue' },
          { sq: 'd8', mark: 'yellow' },
        ],
        arrows: [
          { from: 'c3', to: 'd5', mark: 'green' },
          { from: 'd1', to: 'd5', mark: 'green' },
          { from: 'd8', to: 'd5', mark: 'yellow' },
        ],
      },
      {
        kind: 'demo',
        title: 'Two attackers beat one defender',
        fen: '3r2k1/5ppp/8/3n4/8/2N5/5PPP/3R2K1 w - - 0 1',
        text: 'Watch the exchange on d5 play out.',
        moves: [
          {
            san: 'Nxd5',
            text: 'White captures with the cheaper attacker (knight, 3) first. Black should now just accept being a knight down…',
            highlights: [{ sq: 'd5', mark: 'green' }],
          },
          {
            san: 'Rxd5',
            text: '…but Black recaptures anyway. White still has one more attacker on d5 than Black had defenders.',
            highlights: [{ sq: 'd5', mark: 'red' }],
            arrows: [{ from: 'd1', to: 'd5', mark: 'green' }],
          },
          {
            san: 'Rxd5',
            text: 'White takes the rook too. Black gave a knight AND a rook for White\'s knight. Counting first would have saved Black a whole rook.',
            highlights: [{ sq: 'd5', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Blunder check: is it defended?',
        fen: 'r1bq1rk1/ppp2ppp/3p1n2/8/1b2P3/3B1N2/PPPQ1PPP/R4RK1 w - - 0 1',
        prompt: 'Black\'s bishop on b4 is attacking your queen. Before you run away, count: is that bishop defended?',
        solution: ['Qxb4'],
        hints: ['Look at every black piece and pawn that could protect b4.', 'Nothing defends b4 — and your queen on d2 attacks it along the diagonal.'],
        explain:
          'Qxb4 wins a whole bishop for free. Retreating the queen would have been a different kind of blunder: missing a free piece. Always count attackers and defenders for BOTH sides.',
        highlights: [{ sq: 'b4', mark: 'red' }, { sq: 'd2', mark: 'blue' }],
        arrows: [{ from: 'b4', to: 'd2', mark: 'red' }],
        solvedAnnotations: { highlights: [{ sq: 'b4', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'Capture with the cheapest piece',
        fen: 'r1bqkbnr/pppp1ppp/8/4p3/3nP3/2P2N2/PP1P1PPP/RNBQKB1R w KQkq - 1 4',
        prompt: 'After 1.e4 e5 2.Nf3 Nc6 3.c3 Nd4?! the knight is attacked twice (c3 pawn and f3 knight) and defended once (e5 pawn). Capture it the right way.',
        solution: ['cxd4'],
        hints: [
          'When the target is defended, capture with your least valuable attacker first.',
          'A pawn is worth 1, a knight 3. Take with the c3 pawn.',
        ],
        explain:
          '4.cxd4 wins a knight for a pawn: after 4...exd4 White has given 1 point and taken 3. Capturing with 4.Nxd4 exd4 would only trade knights evenly. ' +
          'Cheapest attacker first!',
        highlights: [{ sq: 'd4', mark: 'red' }, { sq: 'e5', mark: 'yellow' }],
        arrows: [
          { from: 'c3', to: 'd4', mark: 'green' },
          { from: 'f3', to: 'd4', mark: 'green' },
          { from: 'e5', to: 'd4', mark: 'yellow' },
        ],
        solvedAnnotations: { highlights: [{ sq: 'd4', mark: 'green' }] },
      },
      {
        kind: 'quiz',
        question: 'Your knight can capture a pawn, but that pawn is defended by another pawn. Is the capture a good idea (with nothing else going on)?',
        options: [
          "No — you win 1 point but then lose your 3-point knight",
          "Yes — any capture is good",
          "Yes — knights are worth less than pawns",
        ],
        answer: 0,
        explain: 'Count it: +1 for the pawn, −3 when the knight is recaptured. Net −2. A piece defended by a pawn is only a target for another pawn.',
      },
      {
        kind: 'quiz',
        title: 'The blunder-check habit',
        question: 'Your opponent has just moved. What should you ask yourself FIRST?',
        options: [
          "Which piece can I develop next?",
          "What does that move attack or threaten?",
          "Which pawn can I push?",
          "How much time is left on the clock?",
        ],
        answer: 1,
        explain:
          'A simple routine before every move: (1) What does their move threaten? (2) Is any of my pieces loose — attacked more times than it is defended? ' +
          '(3) After my planned move, is the piece I moved safe, and is everything it used to defend still defended? Only then think about your own plans.',
      },
    ],
  },
  {
    id: 'rooks-open-files',
    track: 'foundations',
    category: 'openings',
    title: 'Connect Your Rooks, Seize Open Files',
    level: 2,
    summary: 'Rooks join the game last — put them on open files and the seventh rank.',
    minutes: 8,
    keyPoints: [
      'Finish developing, castle and move the queen off the back rank so your rooks are connected.',
      'Put rooks on open files (no pawns) or half-open files (only enemy pawns).',
      'A rook on the seventh rank attacks pawns from the side and hems in the enemy king.',
      'Doubled rooks on an open file are extra strong — and always keep an eye on your own back rank.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Connected rooks and an open file',
        fen: 'r4rk1/p4ppp/1pn1bn2/2p5/4P3/2N1BN2/PPP2PPP/R4RK1 w - - 0 1',
        text:
          'Rooks are the last pieces to join the game. Once the minor pieces are developed, the king has castled and the queen has left the back rank, nothing stands between your rooks: they are "connected" and protect each other. ' +
          'Here the queens are already off and both sides have connected rooks. Now look at the d-file (yellow): no pawn of either colour stands on it. ' +
          'That is an OPEN file — a highway for rooks. White\'s best plan is to bring a rook to d1.',
        highlights: [
          { sq: 'd1', mark: 'yellow' },
          { sq: 'd2', mark: 'yellow' },
          { sq: 'd3', mark: 'yellow' },
          { sq: 'd4', mark: 'yellow' },
          { sq: 'd5', mark: 'yellow' },
          { sq: 'd6', mark: 'yellow' },
          { sq: 'd7', mark: 'yellow' },
          { sq: 'd8', mark: 'yellow' },
          { sq: 'a1', mark: 'blue' },
          { sq: 'f1', mark: 'blue' },
        ],
        arrows: [{ from: 'a1', to: 'd1', mark: 'green' }, { from: 'f1', to: 'd1', mark: 'green' }],
      },
      {
        kind: 'demo',
        title: 'Open file, then the seventh rank',
        fen: 'r4rk1/pp3ppp/2p5/8/8/2P5/PP3PPP/R4RK1 w - - 0 1',
        text: 'Here the d- and e-files are both open. Watch what active rooks can do.',
        highlights: [{ sq: 'd1', mark: 'yellow' }, { sq: 'e1', mark: 'yellow' }],
        moves: [
          {
            san: 'Rfe1',
            text: 'White puts a rook on the open e-file.',
            arrows: [{ from: 'e1', to: 'e8', mark: 'green' }],
          },
          {
            san: 'Rad8',
            text: 'Black takes the other open file.',
            arrows: [{ from: 'd8', to: 'd1', mark: 'green' }],
          },
          {
            san: 'Re7',
            text: 'The rook invades the seventh rank, where Black\'s pawns still stand. It attacks b7 (and f7, which the king guards).',
            highlights: [{ sq: 'e7', mark: 'blue' }, { sq: 'b7', mark: 'red' }],
            arrows: [{ from: 'e7', to: 'b7', mark: 'red' }],
          },
          {
            san: 'b5',
            text: 'Black moves the b-pawn out of the attack, but now the rook sees all the way to a7.',
            highlights: [{ sq: 'a7', mark: 'red' }],
            arrows: [{ from: 'e7', to: 'a7', mark: 'red' }],
          },
          {
            san: 'Rxa7',
            text: 'White wins a pawn. A rook on the seventh rank attacks pawns from the side, where only pieces can defend them.',
            highlights: [{ sq: 'a7', mark: 'green' }],
          },
          {
            san: 'Rd2',
            text: 'Black copies the idea and sends a rook to White\'s second rank, attacking b2 and f2. Rooks on open files and on the seventh (or second) rank are at their most dangerous.',
            highlights: [{ sq: 'd2', mark: 'blue' }, { sq: 'b2', mark: 'red' }, { sq: 'f2', mark: 'red' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Use the open file',
        fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/3R2K1 w - - 0 1',
        prompt: 'Your rook controls the open d-file. Black\'s king is still behind its unmoved pawns. Finish the game.',
        solution: ['Rd8#'],
        hints: ['Black\'s king cannot step forward — its own pawns block f7, g7 and h7.', 'Slide the rook up the open file to the back rank.'],
        explain:
          'Rd8# — a back-rank mate. The rook used the open d-file to reach the eighth rank, and Black\'s own pawns trapped the king.',
        highlights: [{ sq: 'd1', mark: 'blue' }, { sq: 'g8', mark: 'red' }],
        solvedAnnotations: {
          highlights: [{ sq: 'd8', mark: 'green' }, { sq: 'g8', mark: 'red' }],
          arrows: [{ from: 'd8', to: 'g8', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: 'Doubled rooks',
        fen: '2rr2k1/pp3ppp/8/8/8/8/PP1R1PPP/3R2K1 w - - 0 1',
        prompt: 'Your rooks are doubled on the open d-file. Count the attackers and defenders on d8 — then strike.',
        solution: ['Rxd8+', 'Rxd8', 'Rxd8#'],
        hints: [
          'd8 is attacked twice (both your rooks) and defended once (the c8 rook).',
          'Capture on d8 with check; when Black recaptures, capture again.',
        ],
        explain:
          '1.Rxd8+ Rxd8 2.Rxd8# — doubling gave White one more attacker than Black had defenders, and Black\'s king had no escape square (no "luft") behind its pawns.',
        highlights: [{ sq: 'd8', mark: 'red' }, { sq: 'd1', mark: 'blue' }, { sq: 'd2', mark: 'blue' }, { sq: 'c8', mark: 'yellow' }],
        arrows: [{ from: 'd2', to: 'd8', mark: 'green' }, { from: 'c8', to: 'd8', mark: 'yellow' }],
        solvedAnnotations: { highlights: [{ sq: 'd8', mark: 'green' }, { sq: 'g8', mark: 'red' }] },
      },
      {
        kind: 'quiz',
        title: 'Spot the open file',
        fen: 'r4rk1/p4ppp/1pn1bn2/2p5/4P3/2N1BN2/PPP2PPP/R4RK1 w - - 0 1',
        question: 'Which file is completely open (no pawns of either colour)?',
        options: ["The e-file", "The c-file", "The d-file", "The a-file"],
        answer: 2,
        explain:
          'The d-file has no pawns at all. The e-file is only half-open (White has a pawn on e4, so it is half-open for Black), the c-file has pawns on c2 and c5, and the a-file has pawns on a2 and a7.',
      },
      {
        kind: 'quiz',
        question: 'When are your rooks "connected"?',
        options: [
          "As soon as you have castled",
          "When no pieces stand between them on the back rank, so they defend each other",
          "When both rooks are on squares of the same colour",
          "When both rooks are on the seventh rank",
        ],
        answer: 1,
        explain:
          'Castling alone is not enough — the queen and the minor pieces between the rooks must also leave the back rank. Connected rooks protect each other and can quickly move to any open file.',
      },
    ],
  },
  {
    id: 'pawn-structure-basics',
    track: 'foundations',
    category: 'openings',
    title: 'Pawn Structure Basics',
    level: 3,
    summary: 'Doubled, isolated and passed pawns — and why every pawn move is permanent.',
    minutes: 10,
    keyPoints: [
      'Pawns never move backwards — think twice before every pawn push.',
      'Doubled and isolated pawns are usually weaknesses: no pawn can protect them, so pieces must.',
      'A passed pawn has no enemy pawns in front of it or on the neighbouring files — push it, and support it (a rook behind it is ideal).',
      'Pawn weaknesses are often a trade-off: you may accept them for active pieces, open files or the bishop pair.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Three pawn shapes to recognise',
        fen: '6k1/5ppp/4p3/8/1P1P4/5P2/5P1P/6K1 w - - 0 1',
        text:
          'Pawns are the skeleton of the position, and because they can never move backwards, every pawn move is permanent. ' +
          'DOUBLED pawns (f2 and f3, yellow): two pawns on one file cannot protect each other and block each other. ' +
          'ISOLATED pawn (d4, red): no friendly pawn on the c- or e-file, so only pieces can defend it, and the square in front of it (d5) is a safe home for enemy pieces. ' +
          'PASSED pawn (b4, green): no enemy pawn in front of it or on the neighbouring files, so only pieces can stop it from promoting.',
        highlights: [
          { sq: 'f2', mark: 'yellow' },
          { sq: 'f3', mark: 'yellow' },
          { sq: 'd4', mark: 'red' },
          { sq: 'd5', mark: 'red' },
          { sq: 'b4', mark: 'green' },
        ],
        arrows: [{ from: 'b4', to: 'b8', mark: 'green' }],
      },
      {
        kind: 'demo',
        title: 'How doubled pawns appear — and what you get for them',
        fen: START,
        text: 'In the Ruy Lopez Exchange Variation, Black accepts doubled pawns on purpose.',
        moves: [
          { san: 'e4', text: 'Centre pawn.' },
          { san: 'e5', text: 'Centre pawn.' },
          { san: 'Nf3', text: 'Develops and attacks e5.' },
          { san: 'Nc6', text: 'Develops and defends e5.' },
          {
            san: 'Bb5',
            text: 'The bishop attacks the knight that defends e5.',
            arrows: [{ from: 'b5', to: 'c6', mark: 'red' }],
          },
          { san: 'a6', text: 'Black asks the bishop what it wants.' },
          { san: 'Bxc6', text: 'White gives up the bishop for the knight.' },
          {
            san: 'dxc6',
            text: 'Black recaptures toward the centre. Black now has doubled c-pawns (c7 and c6) — a long-term weakness. In return Black has the two bishops and an open d-file for the queen and rooks. Pawn weaknesses are a trade-off, not an automatic disaster.',
            highlights: [{ sq: 'c6', mark: 'yellow' }, { sq: 'c7', mark: 'yellow' }, { sq: 'c8', mark: 'blue' }, { sq: 'f8', mark: 'blue' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Create a passed pawn by force',
        fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1',
        prompt: 'Three pawns against three, and Black\'s king is far away. Break through and create a passed pawn that queens!',
        solution: ['b6', 'cxb6', 'a6', 'bxa6', 'c6'],
        hints: [
          'Start by sacrificing the middle pawn.',
          'After 1.b6, whichever pawn Black captures with, sacrifice the pawn next to the gap — then your last pawn runs through.',
        ],
        explain:
          '1.b6! cxb6 2.a6! bxa6 3.c6 and the c-pawn promotes; Black\'s king on h8 is far too slow. (If 1...axb6, then 2.c6! bxc6 3.a6 and the a-pawn queens.) ' +
          'This "breakthrough" shows that a passed pawn can be created by force when the enemy king is far away.',
        highlights: [{ sq: 'a5', mark: 'blue' }, { sq: 'b5', mark: 'blue' }, { sq: 'c5', mark: 'blue' }, { sq: 'h8', mark: 'yellow' }],
        solvedAnnotations: {
          highlights: [{ sq: 'c6', mark: 'green' }],
          arrows: [{ from: 'c6', to: 'c8', mark: 'green' }],
        },
      },
      {
        kind: 'try',
        title: 'Push the passed pawn',
        fen: '6k1/5ppp/3P4/8/8/8/2r2PPP/3R2K1 w - - 0 1',
        prompt: 'Black\'s rook is active on c2, but you have a passed d-pawn with your rook behind it. Find the winning move.',
        solution: ['d7'],
        hints: ['A passed pawn wants to run. How close to promotion can it get right now?', 'Push it to d7 — can Black stop d8=Q?'],
        explain:
          '1.d7! Black cannot stop the pawn: 1...Rc8 runs into 2.dxc8=Q+, 1...Rd2 is met by 2.Rxd2, and Black\'s king is too far from d8. ' +
          'The rook on d1 supports the pawn all the way — that is why rooks belong BEHIND passed pawns.',
        highlights: [{ sq: 'd6', mark: 'green' }, { sq: 'd1', mark: 'blue' }],
        arrows: [{ from: 'd1', to: 'd6', mark: 'blue' }, { from: 'd6', to: 'd8', mark: 'green' }],
        solvedAnnotations: { highlights: [{ sq: 'd7', mark: 'green' }, { sq: 'd8', mark: 'green' }] },
      },
      {
        kind: 'quiz',
        fen: '6k1/5ppp/4p3/8/1P1P4/5P2/5P1P/6K1 w - - 0 1',
        question: 'Which White pawn is a passed pawn?',
        options: ["b4", "d4", "f3", "h2"],
        answer: 0,
        explain:
          'No black pawn stands on the a-, b- or c-files, so nothing can block or capture the b4 pawn. The d4 pawn is not passed because Black\'s e6 pawn controls d5; the f3 pawn faces the f7 pawn; and the h2 pawn faces g7 and h7.',
      },
      {
        kind: 'quiz',
        question: 'Why is an isolated pawn often a weakness?',
        options: [
          "It is not allowed to move forward",
          "It only counts as half a point",
          "No pawn can defend it, so pieces must guard it, and the square in front of it is a safe outpost for enemy pieces",
          "It can be captured en passant at any time",
        ],
        answer: 2,
        explain:
          'An isolated pawn has no neighbouring pawns to protect it or the square in front of it. Enemy pieces (especially knights) love to sit on that square. Isolated pawns also have plus sides — open files next to them for your rooks — but in endgames they are usually a liability.',
      },
    ],
  },
  {
    id: 'italian-game',
    track: 'foundations',
    category: 'openings',
    title: 'Your First Opening: The Italian Game',
    level: 3,
    summary: '1.e4 e5 2.Nf3 Nc6 3.Bc4 move by move — the principles behind it and the traps around it.',
    minutes: 14,
    keyPoints: [
      'The Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4) is pure principles: centre pawn, develop with a threat, aim at f7, castle.',
      'A typical White plan: c3 and d4 to build a big centre, castle, then bring the rooks to the middle.',
      'In the Two Knights (3...Nf6 4.Ng5), Black answers 4...d5 and 5...Na5 — not 5...Nxd5, which invites the Fried Liver Attack.',
      'A pin against the queen is not absolute: check whether the "pinned" piece can move with a bigger threat (Legal\'s Mate).',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Every move has a reason',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        text:
          'The Italian Game: 1.e4 e5 2.Nf3 Nc6 3.Bc4. 1.e4 takes the centre and opens lines. 2.Nf3 develops a knight toward the centre AND attacks e5. ' +
          '3.Bc4 develops the bishop to its most active diagonal, aiming at f7 — the square only Black\'s king defends. ' +
          'And White is ready to castle next move.',
        highlights: [{ sq: 'e4', mark: 'green' }, { sq: 'f3', mark: 'blue' }, { sq: 'c4', mark: 'blue' }, { sq: 'f7', mark: 'red' }],
        arrows: [{ from: 'c4', to: 'f7', mark: 'red' }, { from: 'f3', to: 'e5', mark: 'yellow' }],
      },
      {
        kind: 'quiz',
        title: "Black's third move",
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        question: 'Black to move. Which reply follows the opening principles best?',
        options: [
          "Qf6 — bring the queen out to defend f7",
          "Bc5 — develop the bishop to an active diagonal",
          "a6 — a pawn move on the edge",
          "Nd4 — move the same knight a second time",
        ],
        answer: 1,
        explain:
          '3...Bc5 (the Giuoco Piano, "quiet game") develops a new piece and aims at f2. 3...Nf6 (the Two Knights Defence) is also a good principled move. ' +
          '...Qf6 exposes the queen and takes the g8 knight\'s best square, ...a6 develops nothing, and ...Nd4 moves an already developed knight again.',
      },
      {
        kind: 'demo',
        title: 'The main line: c3 and d4',
        fen: START,
        text: 'Here is the classic plan in the Giuoco Piano. Watch White build a big pawn centre.',
        moves: [
          { san: 'e4', text: 'Centre pawn.' },
          { san: 'e5', text: 'Centre pawn.' },
          { san: 'Nf3', text: 'Develop with a threat on e5.' },
          { san: 'Nc6', text: 'Develop and defend.' },
          { san: 'Bc4', text: 'Bishop to the active diagonal, aiming at f7.', arrows: [{ from: 'c4', to: 'f7', mark: 'red' }] },
          { san: 'Bc5', text: 'Black mirrors, aiming at f2.', arrows: [{ from: 'c5', to: 'f2', mark: 'red' }] },
          {
            san: 'c3',
            text: 'White prepares d4 to build a two-pawn centre. The c3 pawn also takes the d4 square away from Black\'s knight.',
            arrows: [{ from: 'c3', to: 'd4', mark: 'green' }],
          },
          { san: 'Nf6', text: 'Black develops and attacks e4.', arrows: [{ from: 'f6', to: 'e4', mark: 'red' }] },
          {
            san: 'd4',
            text: 'White strikes in the centre: the d4 pawn attacks both e5 and the bishop on c5.',
            arrows: [{ from: 'd4', to: 'e5', mark: 'red' }, { from: 'd4', to: 'c5', mark: 'red' }],
          },
          { san: 'exd4', text: 'Black captures, removing the attacker.' },
          {
            san: 'cxd4',
            text: 'White recaptures and now has two strong pawns side by side on d4 and e4.',
            highlights: [{ sq: 'd4', mark: 'green' }, { sq: 'e4', mark: 'green' }],
          },
          { san: 'Bb4+', text: 'The attacked bishop escapes with check.', arrows: [{ from: 'b4', to: 'e1', mark: 'red' }] },
          {
            san: 'Bd2',
            text: 'White blocks the check while developing another piece. Both sides will castle next — a balanced, principled game.',
            highlights: [{ sq: 'd2', mark: 'blue' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Black to move: meet the attack on f7',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4',
        prompt: 'You are Black. After 3...Nf6 4.Ng5 White\'s knight and bishop both attack f7, which only your king defends. Block the bishop\'s diagonal.',
        solution: ['d5'],
        hints: ['Which pawn can step in between c4 and f7?', 'Push the d-pawn two squares: d5 blocks the diagonal and attacks the bishop.'],
        explain:
          '4...d5! blocks the c4–f7 diagonal and attacks the bishop. White usually replies 5.exd5. ' +
          'Note that 4.Ng5 moved the same knight twice — breaking a principle — but a concrete threat can justify that.',
        highlights: [{ sq: 'f7', mark: 'red' }, { sq: 'g5', mark: 'blue' }, { sq: 'c4', mark: 'blue' }],
        arrows: [{ from: 'g5', to: 'f7', mark: 'red' }, { from: 'c4', to: 'f7', mark: 'red' }],
        solvedAnnotations: {
          highlights: [{ sq: 'd5', mark: 'green' }],
          arrows: [{ from: 'd5', to: 'c4', mark: 'green' }],
        },
      },
      {
        kind: 'quiz',
        title: 'Recapture or not?',
        fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
        question: 'After 5.exd5, which move should Black play?',
        options: [
          "Na5 — attack the bishop on c4",
          "Nxd5 — take the pawn back right away",
          "Qxd5 — take back with the queen",
        ],
        answer: 0,
        explain:
          '5...Na5! chases the bishop and Black gets active piece play for the pawn. 5...Nxd5?! allows 6.Nxf7!? Kxf7 7.Qf3+ — the famous Fried Liver Attack (6.d4 is also very strong). ' +
          '5...Qxd5?? simply loses the queen to 6.Bxd5.',
      },
      {
        kind: 'demo',
        title: 'The Fried Liver Attack',
        fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
        text: 'See what happens when Black grabs the pawn back with the knight.',
        moves: [
          { san: 'Nxd5', text: 'Black recaptures — the risky choice.', highlights: [{ sq: 'd5', mark: 'yellow' }] },
          {
            san: 'Nxf7',
            text: 'White sacrifices the knight on f7, attacking the queen on d8 and the rook on h8.',
            arrows: [{ from: 'f7', to: 'd8', mark: 'red' }, { from: 'f7', to: 'h8', mark: 'red' }],
          },
          { san: 'Kxf7', text: 'Black takes the knight — the king is now out in the open.' },
          {
            san: 'Qf3+',
            text: 'Check! The queen also adds a second attacker on the d5 knight (together with the c4 bishop).',
            arrows: [{ from: 'f3', to: 'f7', mark: 'red' }, { from: 'f3', to: 'd5', mark: 'red' }, { from: 'c4', to: 'd5', mark: 'red' }],
          },
          { san: 'Ke6', text: 'The king steps forward to keep defending d5 — into the middle of the board.' },
          {
            san: 'Nc3',
            text: 'White develops and piles up on the d5 knight, which is pinned to the king on e6 by the c4 bishop. Black\'s king is stuck in the centre with White\'s pieces swarming — the price of ignoring king safety.',
            highlights: [{ sq: 'e6', mark: 'red' }, { sq: 'd5', mark: 'red' }],
            arrows: [{ from: 'c3', to: 'd5', mark: 'red' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'The pin that is not a pin',
        fen: 'rn1qkbnr/ppp2p1p/3p2p1/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
        prompt: 'After 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? Black\'s bishop "pins" your f3 knight to your queen. But the knight is allowed to move. Find the shocking knight move.',
        solution: ['Nxe5'],
        hints: [
          'Could the f3 knight move anyway — and grab a pawn while it is at it?',
          'Nxe5 attacks f7 together with the c4 bishop. What happens if Black takes your queen?',
        ],
        explain:
          '5.Nxe5! If 5...dxe5, then 6.Qxg4 and White has won a pawn. If Black grabs the queen with 5...Bxd1??, White has a forced mate — play it in the next step. ' +
          'The trick works because Black wasted time with ...g6 instead of developing, and f7 is weak.',
        highlights: [{ sq: 'g4', mark: 'yellow' }, { sq: 'f3', mark: 'blue' }, { sq: 'd1', mark: 'blue' }],
        arrows: [{ from: 'g4', to: 'd1', mark: 'yellow' }],
        solvedAnnotations: {
          highlights: [{ sq: 'e5', mark: 'green' }, { sq: 'f7', mark: 'red' }],
          arrows: [{ from: 'e5', to: 'f7', mark: 'red' }, { from: 'c4', to: 'f7', mark: 'red' }],
        },
      },
      {
        kind: 'try',
        title: "Legal's Mate",
        fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6',
        prompt: 'Black took the bait with 5...Bxd1??. Your queen is gone — but Black\'s king is not safe. Mate in 2!',
        solution: ['Bxf7+', 'Ke7', 'Nd5#'],
        hints: ['Start with a check on f7.', 'After 6.Bxf7+ Ke7, which knight can give check and cover the last escape square?'],
        explain:
          '6.Bxf7+ Ke7 7.Nd5# — Legal\'s Mate. The d5 knight gives check and covers f6, the f7 bishop covers e8 and e6, and the e5 knight guards d7 and protects the bishop. ' +
          'Three minor pieces beat a queen because Black neglected development and king safety.',
        highlights: [{ sq: 'f7', mark: 'red' }, { sq: 'e8', mark: 'red' }],
        solvedAnnotations: {
          highlights: [{ sq: 'e7', mark: 'red' }, { sq: 'd5', mark: 'green' }, { sq: 'f7', mark: 'green' }, { sq: 'e5', mark: 'green' }],
          arrows: [{ from: 'd5', to: 'e7', mark: 'red' }],
        },
      },
    ],
  },
];
