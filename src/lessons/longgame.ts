import type { Lesson } from './types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const LONGGAME: Lesson[] = [
  // ---------------------------------------------------------------------------
  // 0. The 20/40/40 rule (shown as the very first lesson of the curriculum)
  // ---------------------------------------------------------------------------
  {
    id: 'the-20-40-40-rule',
    track: 'longgame',
    category: 'method',
    title: 'The 20/40/40 Rule: How to Study',
    level: 1,
    summary: 'Split your study time: about 20% openings, 40% middlegame and tactics, 40% endgames. Then play long games and review them.',
    minutes: 8,
    keyPoints: [
      'Study split: about 20% openings (principles, not long lines), 40% tactics and the middlegame, 40% endgames.',
      'Another version: 20% openings, 40% tactics, 40% playing and reviewing longer games. The Study Planner lets you pick either one.',
      'Beginners win and lose most games through tactics, so solve puzzles every day.',
      'Play slower games (15+10 or longer) and review every one of them.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Three buckets of study time',
        fen: START,
        text:
          'Chess has three phases: the opening, the middlegame and the endgame. Many new players spend nearly all their time memorising openings. That is the least useful way to improve. ' +
          'A proven split is the 20/40/40 rule: about 20% of your study time on openings, 40% on the middlegame (mostly tactics: puzzles and patterns), and 40% on endgames. ' +
          'The next steps show one example from each bucket.',
      },
      {
        kind: 'explain',
        title: 'Openings (20%): learn principles, not long lines',
        fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        text:
          'This is a normal Italian Game. You do not need 20 moves of theory to play it well. Follow three principles: control the centre with pawns and pieces (the yellow squares), ' +
          'develop your knights and bishops towards the centre, and castle early so your king is safe (the green arrow). ' +
          'Both sides here have followed the principles. At this level, knowing WHY moves are played is worth far more than a memorised list of moves.',
        highlights: [
          { sq: 'd4', mark: 'yellow' },
          { sq: 'e4', mark: 'yellow' },
          { sq: 'd5', mark: 'yellow' },
          { sq: 'e5', mark: 'yellow' },
          { sq: 'f3', mark: 'blue' },
          { sq: 'c4', mark: 'blue' },
        ],
        arrows: [{ from: 'e1', to: 'g1', mark: 'green' }],
      },
      {
        kind: 'try',
        title: 'Tactics (40%): punish the mistake',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        prompt: 'Black has just played ...Nf6, attacking your queen. White to move. Is there something better than moving the queen away?',
        solution: ['Qxf7#'],
        hints: [
          'Look at the f7 pawn. Which of your pieces attack it, and which black pieces defend it?',
          'The queen and the c4-bishop both hit f7. Only the king defends it.',
        ],
        explain:
          'Qxf7# is checkmate. The queen is protected by the bishop on c4, so the king cannot take it. Seeing a pattern like this in one second comes from solving lots of puzzles. That is why tactics get 40% of your time.',
        solvedAnnotations: {
          highlights: [{ sq: 'f7', mark: 'green' }, { sq: 'e8', mark: 'red' }],
          arrows: [{ from: 'c4', to: 'f7', mark: 'blue' }],
        },
      },
      {
        kind: 'explain',
        title: 'Why beginners should put tactics first',
        fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1',
        text:
          'At beginner and club level, most games are decided by a tactic: a hanging piece, a fork, a pin, or a missed mate. The white knight on c7 checks the king and attacks the rook at the same time. That is a fork, and the rook is lost. ' +
          'Short daily puzzle sessions teach your eyes these patterns. Deep opening knowledge will not help if you drop a piece on move 12. Put puzzles first, every day.',
        highlights: [{ sq: 'c7', mark: 'blue' }, { sq: 'e8', mark: 'red' }, { sq: 'a8', mark: 'red' }],
        arrows: [
          { from: 'c7', to: 'e8', mark: 'red' },
          { from: 'c7', to: 'a8', mark: 'red' },
        ],
      },
      {
        kind: 'try',
        title: 'Endgames (40%): technique wins',
        fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
        prompt: 'King and pawn against king. White to move and win. Only two moves win here. Many natural-looking moves only draw.',
        solution: ['Kd6'],
        alsoAccept: ['Kf6'],
        hints: [
          'Your king should stay in front of its pawn and keep the black king out.',
          'Step diagonally forward-sideways so your king covers e7 and the pawn can walk forward.',
        ],
        explain:
          'Kd6 (or Kf6) wins. Your king now covers e7, so the pawn can march: e6 comes next, and the black king can never get in front of it. Moves like Kd5 or Kf5 step back and let Black take the opposition, and the game is a draw. ' +
          'Endgame study teaches exact technique. It also teaches piece activity: in the endgame the king is a fighting piece.',
        solvedAnnotations: {
          highlights: [{ sq: 'e7', mark: 'green' }, { sq: 'd7', mark: 'green' }, { sq: 'e5', mark: 'blue' }],
        },
      },
      {
        kind: 'explain',
        title: 'The other version: play and review',
        fen: START,
        text:
          'Some coaches phrase the rule differently: 20% openings, 40% tactics, 40% playing and reviewing longer games. Both versions agree on the main points: openings get the smallest share, and tactics get a big one. ' +
          'In this app\'s Study Planner you can pick either split. It records your study time on this device, so you can see whether you are really keeping the balance.',
      },
      {
        kind: 'explain',
        title: 'Play slow, review everything',
        fen: START,
        text:
          'Study only helps if you use it in real games. Play longer time controls, such as 15+10 or slower, so you have time to think like you do when solving puzzles. ' +
          'After every game, win or lose, spend a few minutes reviewing it. Find where it turned and write down one lesson. The later lessons in this track show you how.',
      },
      {
        kind: 'quiz',
        title: 'Plan your week',
        question: 'You have 5 hours of chess study this week. With the 20/40/40 rule (openings / tactics / endgames), how much time goes to endgames?',
        options: ['1 hour', '2 hours', '3 hours', '30 minutes'],
        answer: 1,
        explain: '40% of 5 hours is 2 hours. The full split would be 1 hour of openings, 2 hours of tactics and 2 hours of endgames.',
      },
      {
        kind: 'quiz',
        question: 'You keep losing games because you leave pieces undefended. Which bucket should get more of your time right now?',
        options: ['Memorising longer opening lines', 'Tactics puzzles and a blunder-check habit', 'Nothing, it is just bad luck', 'Only blitz games'],
        answer: 1,
        explain: 'Hanging pieces are a tactical-vision problem. Daily puzzles, plus checking every move for safety, fix it much faster than opening theory does.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 1. Why play longer time controls
  // ---------------------------------------------------------------------------
  {
    id: 'why-longer-time-controls',
    track: 'longgame',
    category: 'method',
    title: 'Why Play Longer Time Controls',
    level: 1,
    summary: '15+10, 30+0 and slower games give you time to calculate and build good habits that last.',
    minutes: 7,
    keyPoints: [
      '15+10 means 15 minutes each, plus 10 seconds added after every move you make.',
      'Slow games let you run your full thinking routine, and good habits form there.',
      'Blitz rewards quick, hopeful moves. It is fun, but it teaches hasty habits.',
      'Use the increment: every move adds time, so do not panic, but do not waste it either.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'What "15+10" means',
        fen: START,
        text:
          'A time control like 15+10 gives each player 15 minutes for the whole game, and adds 10 seconds (the increment) to your clock after each move you make. ' +
          '30+0 means 30 minutes with no increment. Blitz is usually 3 to 5 minutes, and bullet is 1 to 2. ' +
          'To improve, most of your serious games should be 15+10 or slower.',
      },
      {
        kind: 'demo',
        title: 'How fast games go wrong',
        fen: 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        text:
          'Black has just played ...Nd4, leaving the e5 pawn without its defender. A blitz player grabs it without a second thought. Watch what happens when White keeps playing greedy moves quickly.',
        highlights: [{ sq: 'e5', mark: 'yellow' }, { sq: 'd4', mark: 'blue' }],
        moves: [
          { san: 'Nxe5', text: 'Free pawn? White took it without asking why Black left it hanging.', highlights: [{ sq: 'e5', mark: 'yellow' }] },
          {
            san: 'Qg5',
            text: 'The queen attacks the e5 knight and the g2 pawn at the same time. White needs to stop and think now.',
            arrows: [{ from: 'g5', to: 'g2', mark: 'red' }, { from: 'g5', to: 'e5', mark: 'red' }],
          },
          { san: 'Nxf7', text: 'A fast, greedy fork of the queen and rook. It ignores the threat on g2.', highlights: [{ sq: 'g2', mark: 'red' }] },
          { san: 'Qxg2', text: 'The rook on h1 is attacked, and White\'s king is getting exposed.' },
          { san: 'Rf1', text: 'Saving the rook, but look at the e4 pawn and the d4 knight.' },
          { san: 'Qxe4+', text: 'Check. White has to block.' },
          { san: 'Be2', text: 'The only move, and it walks into mate.' },
          {
            san: 'Nf3#',
            text: 'Checkmate. White\'s own pieces block every escape square, and the e2-bishop is pinned by the queen, so it cannot take the knight. With 15 minutes on the clock, White would have had time to ask what ...Nd4 and ...Qg5 were threatening.',
            highlights: [{ sq: 'e1', mark: 'red' }, { sq: 'f3', mark: 'blue' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'The queen is free... but wait',
        fen: '6k1/5ppp/8/8/8/2q5/1B3PPP/3R2K1 w - - 0 1',
        prompt: 'Black\'s queen on c3 is hanging, and Bxc3 wins it. In a slow game you have time to look for something even better. White to move.',
        solution: ['Rd8#'],
        hints: [
          'Always look at checks first, before captures.',
          'Black\'s king has no escape square because its own pawns block f7, g7 and h7.',
        ],
        explain:
          'Rd8# ends the game at once. This is a back-rank mate. Taking the queen would also win, but a player in a hurry never finds the mate. Looking at checks before captures is a habit you build in slow games.',
        solvedAnnotations: {
          highlights: [{ sq: 'd8', mark: 'green' }, { sq: 'g8', mark: 'red' }],
          arrows: [{ from: 'd1', to: 'd8', mark: 'green' }],
        },
      },
      {
        kind: 'explain',
        title: 'How to use the increment',
        fen: START,
        text:
          'In 15+10, a 40-move game gives you about 15 minutes plus 40 x 10 seconds = about 22 minutes in total, or roughly 30 seconds per move on average. ' +
          'Obvious moves, like the only way to recapture, can take 5 seconds. You can spend 2 or 3 minutes on the critical moments. ' +
          'The increment means you are never fully out of time. Even with 20 seconds left, you gain 10 seconds back every move, so play simple, safe moves and keep going.',
      },
      {
        kind: 'try',
        title: 'Count before you move',
        fen: '7K/8/8/5k2/P7/8/8/8 w - - 0 1',
        prompt: 'Your king is far away. Can your a-pawn outrun the black king? Count carefully, then find the winning plan. White to move.',
        solution: ['a5', 'Ke5', 'a6'],
        hints: [
          'Draw an imaginary square from the pawn to its queening rank. If the enemy king cannot step into that square, it cannot catch the pawn.',
          'Push the pawn every move. Any king move lets Black into the square.',
        ],
        explain:
          'After a5 the pawn\'s square is a5-d5-d8-a8, and the black king on f5 cannot step into it. After ...Ke5, a6 shrinks the square to a6-c6-c8-a8, and the king is still outside. Keep pushing: a7, a8=Q. If you move your king even once, Black steps into the square and draws. You need a few seconds of counting for this, and slow games give you those seconds.',
        solvedAnnotations: {
          highlights: [
            { sq: 'a6', mark: 'green' },
            { sq: 'c6', mark: 'green' },
            { sq: 'c8', mark: 'green' },
            { sq: 'a8', mark: 'green' },
          ],
        },
      },
      {
        kind: 'explain',
        title: 'Habits carry over',
        fen: START,
        text:
          'Every slow game is practice at thinking: checking threats, looking for checks and captures, and doing a blunder check. Once these habits are automatic, they start to work in faster games too. ' +
          'The reverse is also true: playing lots of blitz trains you to move on instinct. Treat blitz as a fun extra, not as your main training.',
      },
      {
        kind: 'quiz',
        question: 'You want to improve steadily. Which time control should most of your rated games use?',
        options: ['1+0 bullet', '3+0 blitz', '15+10 rapid or slower', 'It makes no difference'],
        answer: 2,
        explain: '15+10 or slower leaves time to calculate and to run a thinking routine on every move. Faster games do not.',
      },
      {
        kind: 'quiz',
        question: 'In a 15+10 game you have 40 seconds left. What does the "+10" do for you?',
        options: ['Nothing, the game ends at zero', 'It adds 10 seconds after each move you make', 'It gives you 10 extra minutes once', 'It adds 10 seconds to your opponent'],
        answer: 1,
        explain: 'The increment adds 10 seconds after each of your moves. Play safe, simple moves and your clock will keep refilling.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. A thinking routine for every move
  // ---------------------------------------------------------------------------
  {
    id: 'thinking-routine',
    track: 'longgame',
    category: 'method',
    title: 'A Thinking Routine for Every Move',
    level: 2,
    summary: 'Opponent\'s last move, then checks, captures and threats, then candidate moves, then a blunder check.',
    minutes: 9,
    keyPoints: [
      'Step 1: What did my opponent\'s last move do? What does it threaten?',
      'Step 2: Checks, captures, threats (CCT) for BOTH sides.',
      'Step 3: Choose 2 or 3 candidate moves and compare them.',
      'Step 4: Blunder check: after my move, what checks and captures does my opponent have?',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'The four-step routine',
        fen: START,
        text:
          'Strong players do not just "see" good moves. They ask the same questions every move. Use this routine in every slow game:\n' +
          '1. What did my opponent\'s last move do? (What does it attack? What does it threaten next?)\n' +
          '2. Checks, captures, threats, for both sides.\n' +
          '3. Candidate moves: pick 2 or 3 moves and compare them.\n' +
          '4. Blunder check: after my chosen move, can my opponent check me, capture something, or make a new threat?',
      },
      {
        kind: 'explain',
        title: 'Step 1: What did the last move do?',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        text:
          'White has just played Qh5. Ask yourself what it attacks. The queen and the bishop on c4 both aim at f7, which only the king defends. That is a threat of Qxf7#. The queen also hits the e5 pawn. ' +
          'If you skip this question and simply "develop", you can lose on the spot.',
        highlights: [{ sq: 'f7', mark: 'red' }, { sq: 'h5', mark: 'blue' }, { sq: 'e5', mark: 'yellow' }],
        arrows: [
          { from: 'h5', to: 'f7', mark: 'red' },
          { from: 'c4', to: 'f7', mark: 'red' },
          { from: 'h5', to: 'e5', mark: 'yellow' },
        ],
      },
      {
        kind: 'demo',
        title: 'Skipping step 1',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        text: 'Here Black plays a natural developing move without checking what White threatens.',
        moves: [
          { san: 'Nf6', text: 'It looks good: a developing move that attacks the queen. But it does nothing about f7.', highlights: [{ sq: 'f7', mark: 'red' }] },
          { san: 'Qxf7#', text: 'Checkmate in four moves (Scholar\'s Mate). One question, "what does Qh5 threaten?", would have saved the game.', highlights: [{ sq: 'e8', mark: 'red' }, { sq: 'f7', mark: 'red' }] },
        ],
      },
      {
        kind: 'try',
        title: 'Notice the threat and stop it',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        prompt: 'Black to move. White threatens Qxf7#. Find a move that stops the mate and keeps e5 safe. The best one also attacks White\'s queen.',
        solution: ['g6'],
        alsoAccept: ['Qe7', 'Qf6'],
        hints: [
          'You can block the attack, defend f7 again, or chase the queen away.',
          'A pawn move can attack the queen and cut the h5 queen off from f7 at the same time.',
        ],
        explain:
          '...g6 attacks the queen. It has to move, and the mate threat is gone. The e5 pawn is still defended by the knight on c6. ...Qe7 and ...Qf6 also defend f7 and are fine. The skill here was step 1: noticing the threat before choosing a move.',
        solvedAnnotations: {
          highlights: [{ sq: 'g6', mark: 'green' }, { sq: 'h5', mark: 'red' }],
          arrows: [{ from: 'g6', to: 'h5', mark: 'green' }],
        },
      },
      {
        kind: 'explain',
        title: 'Step 2: Checks, captures, threats',
        fen: 'r3kb1r/pp1bpppp/6q1/3N4/8/8/PPPQ1PPP/R4RK1 w kq - 0 1',
        text:
          'Next, list every check, every capture and every threat. Do it for your moves first, then for your opponent\'s. This is called CCT. Forcing moves come first because they leave the opponent the fewest choices, so they are the easiest to calculate. ' +
          'In this position, look at every knight move that gives check. Which squares does the knight on d5 reach?',
        highlights: [{ sq: 'd5', mark: 'blue' }, { sq: 'e8', mark: 'yellow' }, { sq: 'a8', mark: 'yellow' }],
      },
      {
        kind: 'try',
        title: 'Use CCT to find the tactic',
        fen: 'r3kb1r/pp1bpppp/6q1/3N4/8/8/PPPQ1PPP/R4RK1 w kq - 0 1',
        prompt: 'White to move. Start with checks. Find the move that wins material.',
        solution: ['Nc7+', 'Kd8', 'Nxa8'],
        hints: ['Which knight move gives check?', 'From c7 the knight attacks e8 and a8 at the same time.'],
        explain:
          'Nc7+ forks the king and the rook on a8. Nothing defends c7, so after the king moves, Nxa8 wins a whole rook. You find this quickly when "checks first" is a habit.',
        solvedAnnotations: {
          highlights: [{ sq: 'a8', mark: 'green' }],
          arrows: [{ from: 'c7', to: 'a8', mark: 'green' }],
        },
      },
      {
        kind: 'explain',
        title: 'Steps 3 and 4: Candidates and a blunder check',
        fen: '6k1/5ppp/8/8/8/2q5/1B3PPP/3R2K1 w - - 0 1',
        text:
          'After CCT, write down 2 or 3 candidate moves in your head and compare where each one leads. Here, Bxc3 (winning the queen) and Rd8# (mate) are both candidates, and the mate is better. ' +
          'Before you touch a piece, do the blunder check: "If I play this, what are my opponent\'s checks, captures and threats?" Most lost games are lost because this last step was skipped.',
        highlights: [{ sq: 'c3', mark: 'yellow' }, { sq: 'd8', mark: 'green' }],
        arrows: [
          { from: 'b2', to: 'c3', mark: 'yellow' },
          { from: 'd1', to: 'd8', mark: 'green' },
        ],
      },
      {
        kind: 'quiz',
        question: 'What is the FIRST question in the thinking routine?',
        options: [
          'Which piece can I develop?',
          'What did my opponent\'s last move do?',
          'Can I attack the king?',
          'How much time do I have?',
        ],
        answer: 1,
        explain: 'Always start with your opponent\'s last move. It tells you what is threatened, and often which of your pieces is now in danger.',
      },
      {
        kind: 'quiz',
        question: 'Why look at checks, captures and threats first?',
        options: [
          'They are always the best moves',
          'They are forcing, so the opponent has few replies and you can calculate them',
          'The rules say you must',
          'Because quiet moves are always bad',
        ],
        answer: 1,
        explain: 'Forcing moves limit your opponent\'s options, so you can see the consequences clearly. They are not always best, but you must never miss them.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Candidate moves & calculation
  // ---------------------------------------------------------------------------
  {
    id: 'candidate-moves-calculation',
    track: 'longgame',
    category: 'method',
    title: 'Candidate Moves & Calculation',
    level: 3,
    summary: 'List your candidate moves, check forcing moves first, and see 2 to 3 moves ahead in your head.',
    minutes: 9,
    keyPoints: [
      'Before you calculate, list your candidate moves. Forcing moves (checks, captures, threats) come first.',
      'For each candidate, ask what the opponent\'s best reply is, not the reply you hope for.',
      'Calculate until the position is quiet, then judge who is better.',
      'A sacrifice is fine if the forced line after it wins.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'What is a candidate move?',
        fen: '3r2k1/2q2ppp/8/8/3Q4/8/5PPP/3R2K1 w - - 0 1',
        text:
          'A candidate move is a move worth calculating. Strong players first list 2 or 3 of them, and only then calculate each one. ' +
          'Here White\'s candidates include the capture Qxd8+ and quiet queen moves like Qe4 or Qa4. Start with the most forcing one: Qxd8+ gives up the queen, but it is check, so Black\'s replies are very limited.',
        highlights: [{ sq: 'd8', mark: 'yellow' }, { sq: 'g8', mark: 'red' }],
        arrows: [{ from: 'd4', to: 'd8', mark: 'yellow' }],
      },
      {
        kind: 'try',
        title: 'Calculate the forcing line',
        fen: '3r2k1/2q2ppp/8/8/3Q4/8/5PPP/3R2K1 w - - 0 1',
        prompt: 'White to move. See two moves ahead: find a forcing line that ends in checkmate.',
        solution: ['Qxd8+', 'Qxd8', 'Rxd8#'],
        hints: [
          'Black\'s king is stuck behind its own pawns. Which black piece guards the back rank?',
          'Remove the defender with a check, then use the rook.',
        ],
        explain:
          'Qxd8+ forces ...Qxd8 (the only legal reply), and Rxd8# is back-rank mate. You gave up the queen, but the line was forced from start to finish, so you could calculate it completely before moving.',
        solvedAnnotations: {
          highlights: [{ sq: 'd8', mark: 'green' }, { sq: 'g8', mark: 'red' }],
        },
      },
      {
        kind: 'explain',
        title: 'How to see moves ahead',
        fen: '5rk1/5Npp/8/3Q4/8/8/5PPP/6K1 w - - 0 1',
        text:
          'Calculation tips:\n' +
          '- Say each move to yourself ("knight to h6, check; king to h8..."), then picture the new position before going on.\n' +
          '- After each of your moves, ask what the opponent\'s BEST reply is, not the one you hope for.\n' +
          '- Stop when the position is quiet (no more checks or captures) and decide who is better.\n' +
          'Try it here. The knight on f7 and the queen on d5 work together, and the black king has very few squares. Find a forced mate in 3.',
        highlights: [{ sq: 'f7', mark: 'blue' }, { sq: 'd5', mark: 'blue' }, { sq: 'g8', mark: 'red' }],
      },
      {
        kind: 'try',
        title: 'Three moves deep: a classic mate',
        fen: '5rk1/5Npp/8/3Q4/8/8/5PPP/6K1 w - - 0 1',
        prompt: 'White to move and mate in 3. Every white move is forcing.',
        solution: ['Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
        hints: [
          'A knight move can give check and uncover the queen\'s attack on g8 at the same time (double check).',
          'After ...Kh8, give up the queen on g8 so the rook has to block its own king in.',
        ],
        explain:
          'Nh6+ is a double check (knight and queen), so the king must move: ...Kh8. Then Qg8+! forces ...Rxg8 because the knight guards g8, and Nf7# is a smothered mate. The king is trapped by its own pieces. Every move was forcing, so you could see the whole line from the start.',
        solvedAnnotations: {
          highlights: [{ sq: 'h8', mark: 'red' }, { sq: 'f7', mark: 'green' }],
        },
      },
      {
        kind: 'try',
        title: 'Calculate the breakthrough',
        fen: '6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1',
        prompt: 'Both kings are far away. Three pawns against three. White to move: calculate a forcing pawn sacrifice that makes a new queen.',
        solution: ['b6', 'axb6', 'c6', 'bxc6', 'a6'],
        hints: [
          'Sacrifice the middle pawn first.',
          'After ...axb6, sacrifice again with c6, so the a-pawn has a clear path.',
        ],
        explain:
          'b6! axb6 c6! bxc6 a6 and the a-pawn cannot be stopped: a7, a8=Q. The black king is too far away. You have to see the whole line before playing b6, because if it fails you have just given away a pawn.',
        solvedAnnotations: {
          highlights: [{ sq: 'a8', mark: 'green' }],
          arrows: [{ from: 'a6', to: 'a8', mark: 'green' }],
        },
      },
      {
        kind: 'demo',
        title: 'Check the other branch too',
        fen: '6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1',
        text: 'Good calculation checks every reasonable defence. What if Black takes with the other pawn?',
        moves: [
          { san: 'b6', text: 'The same first move.' },
          { san: 'cxb6', text: 'This time Black takes with the c-pawn.' },
          { san: 'a6', text: 'Now the other sacrifice. The a-pawn threatens axb7.', arrows: [{ from: 'a6', to: 'b7', mark: 'green' }] },
          { san: 'bxa6', text: 'If Black takes...' },
          { san: 'c6', text: '...the c-pawn is free: c7 and c8=Q come next. (If ...bxc5 instead, axb7 queens.) Both branches win, so b6 was fully calculated.', highlights: [{ sq: 'c8', mark: 'green' }] },
        ],
      },
      {
        kind: 'quiz',
        question: 'You are calculating a line. When should you stop and evaluate the position?',
        options: [
          'After exactly one move',
          'When the position becomes quiet (no more checks, captures or big threats)',
          'Never, keep calculating until the end of the game',
          'As soon as you find a move you like',
        ],
        answer: 1,
        explain: 'Calculate forcing moves until things calm down, then judge the position: material, king safety and piece activity.',
      },
      {
        kind: 'quiz',
        question: 'When you imagine your opponent\'s reply, which reply should you assume?',
        options: ['The one you hope for', 'Their best reply', 'A random move', 'The same move they played last time'],
        answer: 1,
        explain: 'Hope-chess assumes the opponent will cooperate. Always test your idea against the strongest defence.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. Time management
  // ---------------------------------------------------------------------------
  {
    id: 'time-management',
    track: 'longgame',
    category: 'method',
    title: 'Time Management',
    level: 3,
    summary: 'Spend your time on critical moments, play the easy moves fast, and keep at least 10% of your clock.',
    minutes: 8,
    keyPoints: [
      'Invest time at critical moments: leaving the opening, capture and recapture decisions, and choosing a plan.',
      'Play forced or obvious moves quickly to save time.',
      'Try not to fall below about 10% of your starting time.',
      'In time trouble: check for checks and captures first, then play safe, simple moves and use the increment.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'Your clock is a resource',
        fen: START,
        text:
          'Time is like material: you can spend it wisely or waste it. Two common mistakes are playing too fast and missing things, or thinking for 10 minutes about an easy move and then blundering in a time scramble. ' +
          'A good target in 15+10 is to reach move 20 with about half your time left, and never to fall below roughly 10% of your starting time (1.5 minutes in 15+10).',
      },
      {
        kind: 'explain',
        title: 'Where to spend your time',
        fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
        text:
          'Think longest at the critical moments:\n' +
          '- The first move after you leave your known opening.\n' +
          '- Capture and recapture decisions, which change the pawn structure for good.\n' +
          '- Before committing to a plan, such as a pawn storm or a sacrifice.\n' +
          '- When your opponent\'s move surprises you.\n' +
          'Here (Two Knights Defence) Black must decide how to recapture on d5. It looks automatic, but it is a critical moment.',
        highlights: [{ sq: 'd5', mark: 'yellow' }, { sq: 'f7', mark: 'red' }],
        arrows: [{ from: 'g5', to: 'f7', mark: 'red' }, { from: 'c4', to: 'f7', mark: 'red' }],
      },
      {
        kind: 'try',
        title: 'A critical recapture',
        fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
        prompt: 'Black to move. The "automatic" recapture ...Nxd5 is risky here because f7 is weak. Take your time and find a better move that attacks a white piece.',
        solution: ['Na5'],
        alsoAccept: ['b5', 'Nd4'],
        hints: [
          'Which white piece is helping the attack on f7?',
          'A knight move can attack the c4-bishop, so it has to move away from f7.',
        ],
        explain:
          '...Na5! attacks the c4-bishop and gives Black active play for the pawn. This is main-line theory. (...b5 and ...Nd4 are also known, playable choices.) The quick ...Nxd5 lets White sacrifice with Nxf7! and hunt the king, as the next demo shows. This decision was worth several minutes.',
        solvedAnnotations: {
          arrows: [{ from: 'a5', to: 'c4', mark: 'green' }],
          highlights: [{ sq: 'c4', mark: 'red' }],
        },
      },
      {
        kind: 'demo',
        title: 'What the fast recapture allows',
        fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
        text: 'Black recaptures instantly without thinking. This is the famous "Fried Liver" attack.',
        moves: [
          { san: 'Nxd5', text: 'The natural recapture, played too fast.' },
          { san: 'Nxf7', text: 'White sacrifices the knight to drag the king out.', highlights: [{ sq: 'f7', mark: 'red' }] },
          { san: 'Kxf7', text: 'Black takes, and now the king is exposed.' },
          { san: 'Qf3+', text: 'Check, and the d5 knight is attacked twice (queen and bishop).', arrows: [{ from: 'f3', to: 'd5', mark: 'red' }, { from: 'c4', to: 'd5', mark: 'red' }] },
          { san: 'Ke6', text: 'The king has to defend the knight itself.' },
          { san: 'Nc3', text: 'A third attacker on d5. Black\'s king is stuck in the centre, and one fast recapture caused all of this.', highlights: [{ sq: 'e6', mark: 'red' }, { sq: 'd5', mark: 'red' }] },
        ],
      },
      {
        kind: 'explain',
        title: 'Save time on easy moves',
        fen: START,
        text:
          'You can only spend time at critical moments if you save it elsewhere. Play these quickly:\n' +
          '- Forced moves (the only legal move, the only recapture).\n' +
          '- Opening moves you know well, but only while you still understand them.\n' +
          '- Moves you already calculated on your opponent\'s time.\n' +
          'Use your opponent\'s thinking time as well: work out their most likely replies while their clock runs.',
      },
      {
        kind: 'try',
        title: 'Low on time: checks first',
        fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',
        prompt: 'You have 20 seconds left (plus the increment). Look at checks first and finish the game. Careful: some queen moves give stalemate.',
        solution: ['Qg7#'],
        hints: ['Which check cannot be answered by the king taking or running?', 'Your king on f6 protects g7.'],
        explain:
          'Qg7# is mate: the queen is protected by your king, and the black king has no squares. In time trouble, run a quick checks-and-captures scan and always make sure the opponent still has a legal move (no stalemate).',
        solvedAnnotations: { highlights: [{ sq: 'g7', mark: 'green' }, { sq: 'h8', mark: 'red' }] },
      },
      {
        kind: 'quiz',
        question: 'In a 15+10 game, which moment deserves the MOST thinking time?',
        options: [
          'Move 2 of an opening you know well',
          'An obvious recapture when it is the only legal move',
          'Your first move after leaving familiar opening territory',
          'A move where you can only play one legal move',
        ],
        answer: 2,
        explain: 'Leaving the opening means you are thinking for yourself for the first time. Those decisions shape the game, so invest time there.',
      },
      {
        kind: 'quiz',
        question: 'You are playing 15+10 and have 1 minute left in a complicated position. What is the best approach?',
        options: [
          'Spend 50 seconds on this move to find the very best one',
          'Scan checks, captures and threats, play a safe, simple move, and use the 10-second increment to steady yourself',
          'Resign to save time',
          'Premove quickly without looking',
        ],
        answer: 1,
        explain: 'With little time, safety beats perfection. A quick CCT scan and a solid move keep you in the game, and the increment slowly rebuilds your clock.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Making a plan in quiet positions
  // ---------------------------------------------------------------------------
  {
    id: 'plans-in-quiet-positions',
    track: 'longgame',
    category: 'tactics',
    title: 'Making a Plan in Quiet Positions',
    level: 4,
    summary: 'No tactics? Find weaknesses, improve your worst piece, take open files, and plant knights on outposts.',
    minutes: 9,
    keyPoints: [
      'When there are no tactics, look for weaknesses: isolated or backward pawns, holes and a weak king.',
      'Improve your worst piece: find the piece doing the least and give it a job.',
      'Rooks belong on open files. Get there first and aim for the 7th or 8th rank.',
      'Knights love outposts: squares enemy pawns can never attack.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'A plan checklist',
        fen: '3r2k1/1p3pp1/p3b2p/n2p4/8/2N1P3/PP2BPPP/3R2K1 w - - 0 1',
        text:
          'If your CCT scan finds no tactics, you need a plan. Ask these questions in order:\n' +
          '1. Weaknesses: which enemy pawns or squares are weak? (Here, Black\'s isolated d5 pawn cannot be defended by another pawn.)\n' +
          '2. Worst piece: which of my pieces is doing the least, and where would it be better?\n' +
          '3. Open files: can my rooks use an open file?\n' +
          '4. Outposts: is there a square for my knight that enemy pawns can never attack?',
        highlights: [{ sq: 'd5', mark: 'red' }, { sq: 'd1', mark: 'blue' }, { sq: 'c3', mark: 'blue' }],
        arrows: [
          { from: 'd1', to: 'd5', mark: 'yellow' },
          { from: 'c3', to: 'd5', mark: 'yellow' },
        ],
      },
      {
        kind: 'try',
        title: 'Pile up on the weakness',
        fen: '3r2k1/1p3pp1/p3b2p/n2p4/8/2N1P3/PP2BPPP/3R2K1 w - - 0 1',
        prompt: 'The isolated d5 pawn is attacked twice (Rd1, Nc3) and defended twice (Rd8, Be6). Add a third attacker before Black can bring the knight back (via c6 to e7). White to move.',
        solution: ['Bf3'],
        hints: [
          'Which of your pieces is not attacking d5 yet?',
          'The bishop on e2 is doing little. On the long diagonal it would hit d5.',
        ],
        explain:
          'Bf3! improves your least active piece and attacks d5 a third time. Black cannot add a third defender in time (the knight on a5 is far from the action), so the pawn falls. This is the plan "attack the weakness more times than it can be defended". Timing mattered: after a slow move, ...Nc6-e7 would have held d5.',
        solvedAnnotations: {
          highlights: [{ sq: 'd5', mark: 'red' }, { sq: 'f3', mark: 'green' }],
          arrows: [
            { from: 'f3', to: 'd5', mark: 'green' },
            { from: 'c3', to: 'd5', mark: 'green' },
            { from: 'd1', to: 'd5', mark: 'green' },
          ],
        },
      },
      {
        kind: 'quiz',
        title: 'Spot the worst piece',
        fen: '3r2k1/1p3pp1/p3b2p/n2p4/8/2N1P3/PP2BPPP/3R2K1 w - - 0 1',
        question: 'In this position, which BLACK piece is doing the least?',
        options: ['The rook on d8', 'The bishop on e6', 'The knight on a5', 'The king on g8'],
        answer: 2,
        explain: 'The knight on a5 is on the edge of the board ("a knight on the rim is dim"). It neither defends d5 nor attacks anything important. If Black had time, improving this knight would be the plan.',
        highlights: [{ sq: 'a5', mark: 'red' }],
      },
      {
        kind: 'explain',
        title: 'Open files and outposts',
        fen: '2r3k1/1p1nbppp/p2p4/4p3/4P3/1BN5/PPP2PPP/3R2K1 w - - 0 1',
        text:
          'Two more planning tools:\n' +
          '- Outposts: d5 is a hole in Black\'s position. No black pawn can ever attack it (the c-pawn is gone and the e-pawn has already moved past it). A knight on d5 would be very strong, and Nd5 is White\'s natural plan here.\n' +
          '- Open files: a file with no pawns is open, and one with only an enemy pawn is half-open. The c-file is half-open for Black\'s rook (only White\'s c2 pawn is on it). White\'s d1-rook uses the half-open d-file to press on the backward d6 pawn.\n' +
          'Pieces placed like this may not win material at once, but they give you a lasting advantage.',
        highlights: [{ sq: 'd5', mark: 'green' }, { sq: 'c3', mark: 'blue' }, { sq: 'd1', mark: 'blue' }],
        arrows: [
          { from: 'c3', to: 'd5', mark: 'green' },
          { from: 'b3', to: 'd5', mark: 'blue' },
        ],
      },
      {
        kind: 'try',
        title: 'Take the only open file',
        fen: 'r1b3k1/pp3ppp/2p1p3/8/8/4P3/PP2BPPP/R5K1 w - - 0 1',
        prompt: 'White is a pawn down, but Black\'s rook on a8 is shut in by the bishop on c8. Only one file is fully open. Put your rook to work, and keep going when Black\'s king steps up.',
        solution: ['Rd1', 'Kf8', 'Rd8+'],
        hints: [
          'Which file has no pawns on it?',
          'Once your rook owns the file, invade: a check on the 8th rank ties Black up.',
        ],
        explain:
          'Rd1! takes the only open file. Black cannot challenge it because the c8-bishop blocks the a8-rook. After ...Kf8, Rd8+ Ke7 and the rook moves along the 8th rank (Rh8 next) to win back the pawn, while Black\'s queenside pieces are still stuck. Being active is worth more than the extra pawn.',
        solvedAnnotations: {
          highlights: [{ sq: 'd8', mark: 'green' }, { sq: 'a8', mark: 'red' }, { sq: 'c8', mark: 'red' }],
          arrows: [{ from: 'd1', to: 'd8', mark: 'green' }],
        },
      },
      {
        kind: 'quiz',
        question: 'What is an "outpost" for a knight?',
        options: [
          'Any square in the centre',
          'A square that enemy pawns can never attack, ideally protected by your own pawn',
          'The square the knight started on',
          'A square on the edge of the board',
        ],
        answer: 1,
        explain: 'An outpost is a square the opponent cannot drive your knight away from with a pawn. A knight there is often worth more than a rook.',
      },
      {
        kind: 'quiz',
        question: 'Your CCT scan finds no tactics for either side. What should you do next?',
        options: [
          'Make a random safe move and wait',
          'Look for weaknesses, improve your worst piece, and use open files and outposts',
          'Offer a draw immediately',
          'Push all your pawns forward',
        ],
        answer: 1,
        explain: 'Quiet positions are where plans come from. Work through the checklist to find a good move even when nothing is forced.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. How to review your games
  // ---------------------------------------------------------------------------
  {
    id: 'review-your-games',
    track: 'longgame',
    category: 'method',
    title: 'How to Review Your Games',
    level: 4,
    summary: 'Find the turning point, analyse on your own before using the engine, and write down one lesson per game.',
    minutes: 9,
    keyPoints: [
      'Review every serious game, wins as well as losses, while it is fresh.',
      'Analyse on your own first. Turn on the engine only AFTER that, to check your ideas.',
      'Find the turning point: the move where the evaluation changed the most.',
      'Write down one lesson per game and watch for mistakes that keep repeating.',
    ],
    steps: [
      {
        kind: 'explain',
        title: 'A review routine',
        fen: START,
        text:
          'After each slow game:\n' +
          '1. Right away, note what you were thinking at the key moments (your plans and your worries).\n' +
          '2. Replay the game WITHOUT an engine. Mark moves where you felt unsure or where the game changed.\n' +
          '3. Find the turning point: the move where things went wrong (or right).\n' +
          '4. Only now turn on the engine and compare it with your own analysis.\n' +
          '5. Write down ONE lesson in a sentence, for example "When a piece is offered, ask why."',
      },
      {
        kind: 'demo',
        title: 'Review a miniature',
        fen: START,
        text: 'Let us review a short game. Step through it and look for Black\'s mistakes, as if this were your own game.',
        moves: [
          { san: 'e4', text: 'A normal start.' },
          { san: 'e5', text: 'Fine.' },
          { san: 'Nf3', text: 'Develops and attacks e5.' },
          { san: 'd6', text: 'Philidor Defence. Solid.' },
          { san: 'Bc4', text: 'The bishop aims at f7, a common target.', arrows: [{ from: 'c4', to: 'f7', mark: 'yellow' }] },
          { san: 'Bg4', text: 'Pins the f3-knight to the queen. Playable.', arrows: [{ from: 'g4', to: 'd1', mark: 'blue' }] },
          { san: 'Nc3', text: 'Develops, and sets a trap.' },
          {
            san: 'g6',
            text: 'Mistake! This is the first turning point. It does nothing for the centre, and it leaves e5 defended only by the d6 pawn. ...Nf6 or ...Nc6 would develop a piece.',
            highlights: [{ sq: 'g6', mark: 'red' }, { sq: 'e5', mark: 'yellow' }],
          },
          {
            san: 'Nxe5',
            text: 'White ignores the pin and offers the queen. With ...g6 played, this works.',
            arrows: [{ from: 'g4', to: 'd1', mark: 'red' }],
            highlights: [{ sq: 'e5', mark: 'blue' }],
          },
          {
            san: 'Bxd1',
            text: 'Blunder! This is the decisive mistake. Black grabs the queen without asking why it was offered. ...dxe5 would lose only a pawn.',
            highlights: [{ sq: 'd1', mark: 'red' }],
          },
          { san: 'Bxf7+', text: 'Check. The bishop is protected by the e5-knight, so the king must move.', highlights: [{ sq: 'f7', mark: 'blue' }] },
          { san: 'Ke7', text: 'The only legal move.' },
          {
            san: 'Nd5#',
            text: 'Checkmate with three minor pieces (Legal\'s Mate). Lesson for Black\'s notebook: "When a piece is offered, ask why before taking it."',
            highlights: [{ sq: 'e7', mark: 'red' }, { sq: 'd5', mark: 'green' }],
          },
        ],
      },
      {
        kind: 'try',
        title: 'Fix the turning point',
        fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R b KQkq - 0 5',
        prompt: 'You are Black, reviewing your game. White has just played Nxe5, offering the queen. Find the move you SHOULD have played. It limits the damage to one pawn.',
        solution: ['dxe5'],
        alsoAccept: ['Be6'],
        hints: [
          'Before taking the queen, look for White\'s checks after ...Bxd1: Bxf7+ and a knight check follow.',
          'Take the knight instead, and your king stays safe.',
        ],
        explain:
          '...dxe5! and after Qxg4 Black is just a pawn down, with a real game ahead. (...Be6 is similar.) Taking the queen allowed mate in 2. In your review, mark this as the critical moment where a blunder check would have saved the game.',
        solvedAnnotations: { highlights: [{ sq: 'e5', mark: 'green' }] },
      },
      {
        kind: 'try',
        title: 'Now the winner\'s view',
        fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6',
        prompt: 'You are White and Black has just taken your queen. Reviewing a win is useful too: find the forced mate.',
        solution: ['Bxf7+', 'Ke7', 'Nd5#'],
        hints: ['Start with a check. The bishop on c4 is aiming at f7.', 'After ...Ke7, one of the knights gives mate.'],
        explain:
          'Bxf7+ Ke7 Nd5#. When you review a win, ask whether it was sound or whether your opponent just blundered. Here the trap only worked because Black played ...g6 and then took the queen.',
        solvedAnnotations: {
          highlights: [{ sq: 'e7', mark: 'red' }, { sq: 'd5', mark: 'green' }, { sq: 'f7', mark: 'green' }],
        },
      },
      {
        kind: 'explain',
        title: 'Engine last, lessons first',
        fen: START,
        text:
          'Why look at the engine last? If you check it first, you just read its answers and learn very little. If you analyse first, you find out where your thinking went wrong, which is the thing you need to fix. ' +
          'Keep a simple mistakes log. After 10 games you will see patterns, such as "missed opponent\'s threat" 5 times or "time trouble" 3 times. Those patterns tell you what to study next, and in which bucket of your 20/40/40 plan.',
      },
      {
        kind: 'quiz',
        question: 'When should you switch on the engine during a game review?',
        options: [
          'Before anything else, to save time',
          'After you have analysed the game yourself',
          'Never, engines are cheating',
          'Only for games you won',
        ],
        answer: 1,
        explain: 'Your own analysis shows how you think. The engine then checks it. Using the engine first skips the learning part.',
      },
      {
        kind: 'quiz',
        question: 'Your mistakes log shows "missed the opponent\'s threat" in 6 of your last 10 losses. What is the best response?',
        options: [
          'Learn a new opening',
          'Practise step 1 of the thinking routine ("what did the last move do?") and do more tactics',
          'Play more bullet games',
          'Ignore it, it is bad luck',
        ],
        answer: 1,
        explain: 'Recurring mistakes show you what to train. Missing threats is a thinking-routine and tactics problem, not an opening problem.',
      },
    ],
  },
];
