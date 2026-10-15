// Beginner-friendly explanations of the key ideas behind common openings, written for Chess Seeker.
// Each step drives the board: moves animate first, then arrows/highlights appear, so the words always
// match what's on screen. Moves and squares are checked in tests/openingIdeas.test.ts.
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import type { NarrationStep } from '../ui/coach';

type Arrow = [string, string, string?];

export interface IdeaStep {
  text: string;
  /** SAN moves played (animated) at the start of this step, continuing from the previous step */
  moves?: string[];
  arrows?: Arrow[];
  highlights?: Record<string, string>;
  /** squares to pulse */
  flash?: string[];
}

export interface OpeningIdea {
  id: string;
  name: string;
  /** moves that define the opening (the explorer offers the idea once the board reaches this position) */
  moves: string[];
  /** whose point of view the ideas take */
  side: 'white' | 'black';
  summary: string;
  steps: IdeaStep[];
}

const o = (id: string, name: string, moves: string, side: 'white' | 'black', summary: string, steps: IdeaStep[]): OpeningIdea => ({
  id,
  name,
  moves: moves.split(' '),
  side,
  summary,
  steps,
});

export const OPENING_IDEAS: OpeningIdea[] = [
  o('italian', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4', 'white', 'Fast development and pressure on f7.', [
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], text: 'White grabs the center, brings out a knight and a bishop, and gets ready to castle.' },
    { text: 'The bishop on c4 points at **f7**. Right now only Black\'s king guards that square.', arrows: [['c4', 'f7', 'red']], highlights: { f7: 'red' } },
    { text: 'A typical plan: c3, then d4 to build a big pawn center.', arrows: [['c2', 'c3', 'yellow'], ['d2', 'd4', 'yellow']] },
    { text: 'And castle early. A safe king first, then the fight in the middle.', arrows: [['e1', 'g1', 'green']] },
  ]),
  o('ruy-lopez', 'Ruy Lopez', 'e4 e5 Nf3 Nc6 Bb5', 'white', 'Slow, lasting pressure on Black\'s center.', [
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], text: 'The Ruy Lopez, also called the Spanish. The bishop goes to b5 instead of c4.' },
    { text: 'It attacks the knight on c6, and that knight is the piece guarding **e5**.', arrows: [['b5', 'c6', 'red'], ['c6', 'e5', 'paleRed']], highlights: { e5: 'yellow' } },
    { text: 'White isn\'t grabbing anything yet. The plan is to castle, then c3 and d4 to squeeze the center.', arrows: [['e1', 'g1', 'green'], ['c2', 'c3', 'yellow'], ['d2', 'd4', 'yellow']] },
    { moves: ['a6'], text: 'Black usually asks the bishop a question with ...a6. It mostly drops back to a4 and keeps the pressure.', arrows: [['b5', 'a4', 'paleBlue']] },
  ]),
  o('scotch', 'Scotch Game', 'e4 e5 Nf3 Nc6 d4', 'white', 'Open the center right away.', [
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], text: 'White doesn\'t wait: d4 hits the e5 pawn on move three.', arrows: [['d4', 'e5', 'red']] },
    { moves: ['exd4', 'Nxd4'], text: 'After the trade, White\'s knight sits proudly in the middle and the pieces have open lines.', highlights: { d4: 'green' } },
    { text: 'Easy development follows: Nc3, Bc4 or Bd3, and castle.', arrows: [['b1', 'c3', 'yellow'], ['f1', 'c4', 'yellow'], ['e1', 'g1', 'green']] },
  ]),
  o('two-knights', 'Two Knights Defense', 'e4 e5 Nf3 Nc6 Bc4 Nf6', 'black', 'Counterattack e4 instead of defending.', [
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], text: 'Black answers the Italian by hitting the e4 pawn with a knight.', arrows: [['f6', 'e4', 'red']] },
    { text: 'Watch out for **Ng5**: knight and bishop would both aim at **f7**.', arrows: [['f3', 'g5', 'red'], ['c4', 'f7', 'red']], highlights: { f7: 'red' } },
    { moves: ['Ng5', 'd5'], text: 'The standard answer is ...d5, blocking the bishop\'s path to f7.', highlights: { d5: 'green' }, arrows: [['d5', 'c4', 'paleBlue']] },
  ]),
  o('four-knights', 'Four Knights Game', 'e4 e5 Nf3 Nc6 Nc3 Nf6', 'white', 'Both sides develop knights first.', [
    { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'], text: 'All four knights come out toward the center. Simple and solid.', highlights: { c3: 'green', f3: 'green', c6: 'green', f6: 'green' } },
    { text: 'White usually follows with Bb5 or d4 to get things going.', arrows: [['f1', 'b5', 'yellow'], ['d2', 'd4', 'yellow']] },
  ]),
  o('petrov', 'Petrov Defense', 'e4 e5 Nf3 Nf6', 'black', 'Copy-cat counterattack on e4.', [
    { moves: ['e4', 'e5', 'Nf3', 'Nf6'], text: 'Black doesn\'t defend e5. The knight hits **e4** instead.', arrows: [['f6', 'e4', 'red'], ['f3', 'e5', 'paleRed']] },
    { moves: ['Nxe5', 'd6'], text: 'After Nxe5, Black first kicks the knight with ...d6. Taking on e4 too early can get Black in trouble.', arrows: [['d6', 'e5', 'red']] },
    { moves: ['Nf3', 'Nxe4'], text: 'Now Black wins the pawn back. Material is equal again.', highlights: { e4: 'green' } },
  ]),
  o('kings-gambit', "King's Gambit", 'e4 e5 f4', 'white', 'Give a pawn to open lines.', [
    { moves: ['e4', 'e5', 'f4'], text: 'White offers the f-pawn to pull Black\'s e-pawn away from the center.', arrows: [['f4', 'e5', 'red']] },
    { moves: ['exf4'], text: 'If Black takes, White wants d4 and Bc4, with play on the open f-file.', arrows: [['d2', 'd4', 'yellow'], ['f1', 'c4', 'yellow']] },
    { text: 'Fun, but risky: the e1-h4 diagonal is open, so ...Qh4+ is always in the air.', arrows: [['d8', 'h4', 'red']], highlights: { e1: 'red' } },
  ]),
  o('vienna', 'Vienna Game', 'e4 e5 Nc3', 'white', 'Knight first, f4 later.', [
    { moves: ['e4', 'e5', 'Nc3'], text: 'The knight comes out before Nf3, so the f-pawn can still go to f4 later.', arrows: [['f2', 'f4', 'yellow']] },
    { text: 'The knight also eyes **d5**, a key central square.', arrows: [['c3', 'd5', 'green']] },
  ]),
  o('sicilian', 'Sicilian Defense', 'e4 c5', 'black', 'Fight for d4 from the side.', [
    { moves: ['e4', 'c5'], text: 'Black doesn\'t mirror White. The c-pawn fights for **d4** from the side.', arrows: [['c5', 'd4', 'red']] },
    { moves: ['Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'], text: 'When White plays d4, Black trades a side pawn for a center pawn.' },
    { text: 'Now Black has two center pawns (d and e) against one, plus the half-open c-file.', highlights: { d6: 'green', e7: 'green', c7: 'yellow', c6: 'yellow', c5: 'yellow' } },
    { moves: ['Nf6'], text: 'Black develops with tempo: the knight hits **e4**, so White must defend it.', arrows: [['f6', 'e4', 'red']] },
  ]),
  o('french', 'French Defense', 'e4 e6', 'black', 'Solid chain, then strike with ...c5.', [
    { moves: ['e4', 'e6', 'd4', 'd5'], text: 'Black prepares ...d5 with ...e6, so the d-pawn is protected.' },
    { text: 'The e4 pawn is attacked. White can defend it, trade, or push past with e5.', arrows: [['d5', 'e4', 'red']] },
    { text: 'The downside: the bishop on **c8** is stuck behind the e6 pawn.', highlights: { c8: 'red', e6: 'yellow' } },
    { moves: ['e5', 'c5'], text: 'After e5, Black hits the base of White\'s pawn chain with ...c5.', arrows: [['c5', 'd4', 'red']] },
  ]),
  o('caro-kann', 'Caro-Kann Defense', 'e4 c6', 'black', 'Like the French, but the bishop gets out.', [
    { moves: ['e4', 'c6', 'd4', 'd5'], text: 'Black supports ...d5 with the c-pawn this time.' },
    { text: 'The c8 bishop isn\'t locked in. It can come out to f5 or g4 before ...e6.', arrows: [['c8', 'f5', 'green'], ['c8', 'g4', 'paleGreen']] },
    { moves: ['Nc3', 'dxe4', 'Nxe4', 'Bf5'], text: 'In the main line the bishop comes out with tempo and hits the knight.', arrows: [['f5', 'e4', 'red']] },
  ]),
  o('scandinavian', 'Scandinavian Defense', 'e4 d5', 'black', 'Hit e4 on move one.', [
    { moves: ['e4', 'd5'], text: 'Black attacks e4 straight away.', arrows: [['d5', 'e4', 'red']] },
    { moves: ['exd5', 'Qxd5'], text: 'Black takes back with the queen. Out early, which is unusual.' },
    { moves: ['Nc3'], text: 'White develops with tempo: the knight attacks the queen.', arrows: [['c3', 'd5', 'red']] },
    { moves: ['Qa5'], text: 'The queen steps to **a5**, out of reach and still active. Next come ...Nf6, ...Bf5 and ...c6.', arrows: [['g8', 'f6', 'yellow'], ['c8', 'f5', 'yellow']] },
  ]),
  o('pirc', 'Pirc Defense', 'e4 d6 d4 Nf6 Nc3 g6', 'black', 'Let White build a center, then attack it.', [
    { moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'], text: 'Black develops quietly and prepares ...Bg7.', arrows: [['f8', 'g7', 'green']] },
    { moves: ['Be3', 'Bg7'], text: 'From g7 the bishop backs up the knight and eyes White\'s center down the long diagonal.', arrows: [['g7', 'd4', 'paleGreen']] },
    { text: 'Later Black strikes with ...e5 or ...c5.', arrows: [['e7', 'e5', 'yellow'], ['c7', 'c5', 'yellow']] },
  ]),
  o('queens-gambit', "Queen's Gambit", 'd4 d5 c4', 'white', 'Use the c-pawn to undermine d5.', [
    { moves: ['d4', 'd5', 'c4'], text: 'White offers the c-pawn to pull Black\'s d-pawn away from the center.', arrows: [['c4', 'd5', 'red']] },
    { text: 'It\'s not a real sacrifice. If ...dxc4, White can win it back with e3 and Bxc4.', arrows: [['e2', 'e3', 'yellow'], ['f1', 'c4', 'yellow']] },
  ]),
  o('qgd', "Queen's Gambit Declined", 'd4 d5 c4 e6', 'black', 'Hold d5 with ...e6.', [
    { moves: ['d4', 'd5', 'c4', 'e6'], text: 'Black declines: ...e6 keeps the d5 pawn firmly protected.', highlights: { d5: 'green' } },
    { text: 'The price is the bishop on **c8**, hemmed in by e6.', highlights: { c8: 'red', e6: 'yellow' } },
    { moves: ['Nc3', 'Nf6', 'Bg5'], text: 'A classic setup: White pins the f6 knight, which guards d5.', arrows: [['g5', 'd8', 'red']], highlights: { f6: 'yellow' } },
    { moves: ['Be7'], text: 'Black simply breaks the pin with ...Be7 and castles next.', arrows: [['e8', 'g8', 'green']] },
  ]),
  o('slav', 'Slav Defense', 'd4 d5 c4 c6', 'black', 'Hold d5 and keep the bishop free.', [
    { moves: ['d4', 'd5', 'c4', 'c6'], text: 'Black supports d5 with the c-pawn instead of the e-pawn.' },
    { text: 'That keeps the c8 bishop\'s road open, often to **f5**.', arrows: [['c8', 'f5', 'green']] },
  ]),
  o('london', 'London System', 'd4 d5 Bf4', 'white', 'One easy setup against anything.', [
    { moves: ['d4', 'd5', 'Bf4'], text: 'White brings the dark-squared bishop out to f4 before playing e3.' },
    { text: 'Then the same setup almost every game: e3, c3, Nf3, Nbd2 and Bd3.', arrows: [['e2', 'e3', 'yellow'], ['c2', 'c3', 'yellow'], ['g1', 'f3', 'yellow'], ['b1', 'd2', 'yellow'], ['f1', 'd3', 'yellow']] },
    { text: 'Later a knight on **e5** often leads a kingside attack.', arrows: [['f3', 'e5', 'green']] },
  ]),
  o('kings-indian', "King's Indian Defense", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', 'black', 'Let White take the center, then hit back.', [
    { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'], text: 'Black lets White build a big center and puts the bishop on g7.' },
    { text: 'The g7 bishop stares down the long diagonal.', arrows: [['g7', 'a1', 'green']] },
    { text: 'After castling, Black strikes back with ...e5 and often attacks with ...f5.', arrows: [['e8', 'g8', 'green'], ['e7', 'e5', 'yellow'], ['f7', 'f5', 'yellow']] },
  ]),
  o('english', 'English Opening', 'c4', 'white', 'Control d5 from the side.', [
    { moves: ['c4'], text: 'White starts with the c-pawn, which controls **d5** from the side.', arrows: [['c4', 'd5', 'green']] },
    { text: 'A popular plan is g3 and Bg2, adding pressure on the long diagonal.', arrows: [['g2', 'g3', 'yellow'], ['f1', 'g2', 'yellow'], ['g2', 'b7', 'paleGreen']] },
  ]),
  o('dutch', 'Dutch Defense', 'd4 f5', 'black', 'Grab e4 with the f-pawn.', [
    { moves: ['d4', 'f5'], text: 'Black controls **e4** with the f-pawn and often aims for a kingside attack.', arrows: [['f5', 'e4', 'green']] },
    { text: 'The cost: the e8-h5 diagonal near Black\'s king gets a little weaker.', highlights: { e8: 'yellow', f7: 'yellow', g6: 'yellow', h5: 'yellow' } },
  ]),
];

/** Turn an idea into Coach narration steps, starting from the initial position. */
export function ideaNarration(idea: OpeningIdea): NarrationStep[] {
  return idea.steps.map((s) => ({
    text: s.text,
    moves: s.moves,
    arrows: s.arrows?.map(([a, b, brush]) => ({ orig: a as Key, dest: b as Key, brush: brush ?? 'green' }) as DrawShape),
    highlights: s.highlights,
    flash: s.flash ? { squares: s.flash, color: 'yellow' } : undefined,
    mood: 'happy',
  }));
}
