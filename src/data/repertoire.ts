// Curated beginner repertoires for the opening trainer. Each line is a full move sequence from the start;
// the learner plays `color`'s moves and the app answers with the other side's. Every line is checked
// for legality in tests/repertoire.test.ts.

export interface RepLine {
  id: string;
  name: string;
  moves: string[];
}

/** Alias used by other features (course catalog) that build their own line lists. */
export type RepertoireLine = RepLine;

export interface Repertoire {
  id: string;
  name: string;
  color: 'white' | 'black';
  /** one-line pitch */
  blurb: string;
  lines: RepLine[];
}

const l = (id: string, name: string, moves: string): RepLine => ({ id, name, moves: moves.split(' ') });

export const REPERTOIRES: Repertoire[] = [
  {
    id: 'italian-w',
    name: 'Italian Game',
    color: 'white',
    blurb: 'Quick development, aim at f7, castle early.',
    lines: [
      l('giuoco', 'Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1'),
      l('two-knights', 'Two Knights Defense', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3'),
      l('hungarian', 'Hungarian Defense', 'e4 e5 Nf3 Nc6 Bc4 Be7 d4 exd4 Nxd4 Nf6 Nc3 O-O O-O'),
      l('petrov', 'vs. the Petrov', 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3'),
      l('philidor', 'vs. the Philidor', 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O'),
    ],
  },
  {
    id: 'london-w',
    name: 'London System',
    color: 'white',
    blurb: 'One solid setup against almost everything.',
    lines: [
      l('vs-d5', 'vs. …d5 and …e6', 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3'),
      l('vs-c5', 'vs. an early …c5', 'd4 d5 Bf4 c5 e3 Nc6 c3 Nf6 Nd2 e6 Ngf3 Bd6 Bg3 O-O Bd3'),
      l('vs-kid', "vs. the King's Indian setup", 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3'),
      l('vs-e6', 'vs. …Nf6 and …e6', 'd4 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nd2 d5 Ngf3 Bd6 Bg3 O-O Bd3'),
    ],
  },
  {
    id: 'qg-w',
    name: "Queen's Gambit",
    color: 'white',
    blurb: 'Pressure on d5 with c4 and natural development.',
    lines: [
      l('qgd', 'Declined', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3'),
      l('qga', 'Accepted', 'd4 d5 c4 dxc4 e3 Nf6 Bxc4 e6 Nf3 c5 O-O'),
      l('slav', 'Slav Defense', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4'),
    ],
  },
  {
    id: 'e5-b',
    name: '1…e5 for Black',
    color: 'black',
    blurb: 'Classical replies to 1.e4: claim the center and develop.',
    lines: [
      l('giuoco', 'Italian: Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O'),
      l('ruy', 'Ruy Lopez: Closed', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O'),
      l('scotch', 'Scotch Game', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7'),
      l('four-knights', 'Four Knights', 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O'),
      l('evans', 'Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6'),
    ],
  },
  {
    id: 'caro-b',
    name: 'Caro-Kann Defense',
    color: 'black',
    blurb: 'Rock-solid vs 1.e4, and the c8 bishop gets out.',
    lines: [
      l('classical', 'Classical', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 Nf3 Nd7'),
      l('advance', 'Advance Variation', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5'),
      l('exchange', 'Exchange Variation', 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4'),
      l('two-knights', 'Two Knights', 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6'),
    ],
  },
  {
    id: 'scandi-b',
    name: 'Scandinavian Defense',
    color: 'black',
    blurb: 'Hit e4 on move one and play simple, active chess.',
    lines: [
      l('main', 'Main line …Qa5', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6'),
      l('nf3', 'White plays Nf3', 'e4 d5 exd5 Qxd5 Nf3 Bg4 Be2 Nc6'),
      l('advance', 'White pushes e5', 'e4 d5 e5 Bf5 d4 e6'),
      l('nc3', 'White defends with Nc3', 'e4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6'),
    ],
  },
  {
    id: 'qgd-b',
    name: "Queen's Gambit Declined",
    color: 'black',
    blurb: 'A classic, solid answer to 1.d4.',
    lines: [
      l('orthodox', 'Orthodox', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6'),
      l('exchange', 'Exchange Variation', 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O'),
      l('catalan', 'vs. the Catalan', 'd4 d5 c4 e6 Nf3 Nf6 g3 Be7 Bg2 O-O O-O dxc4'),
      l('london', 'vs. the London', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6'),
    ],
  },
];

export function repertoireById(id: string): Repertoire | undefined {
  return REPERTOIRES.find((r) => r.id === id);
}
