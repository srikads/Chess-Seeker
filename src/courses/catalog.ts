// The course catalog: 30 courses + "coming soon" tiles.
// To author a course: write src/courses/content/<id>.ts (see AUTHORING.md), import its chapters here,
// replace `outline([...])` with them and set status: 'ready'.
import type { Course, CourseCategory } from './types';
import { outline } from './helpers';
import { italianChapters } from './content/italian';
import { caroKannChapters } from './content/caro-kann';
import { checkmateChapters } from './content/checkmates';
import { friedLiverChapters } from './content/fried-liver';
import { kingsGambitChapters } from './content/kings-gambit';

export const COURSES: Course[] = [
  // ------------------------------------------------------------------ White openings
  {
    id: 'italian',
    title: 'The Italian Game',
    subtitle: 'A calm, classical weapon with 1.e4',
    side: 'white',
    categories: ['white'],
    level: 'beginner',
    cover: { bg: '#2e6b4a', fg: '#f4f1e8', label: 'Bc4', sub: 'Italian', piece: 'bishop', pieceColor: 'white' },
    description: 'Develop fast, aim at f7 and castle. A safe, idea-rich setup that works against almost anything after 1.e4 e5.',
    chapters: italianChapters,
    status: 'ready',
  },
  {
    id: 'vienna',
    title: 'The Vienna Game',
    subtitle: 'Knight first, attack later',
    side: 'white',
    categories: ['white'],
    level: 'beginner',
    cover: { bg: '#6b3fa0', fg: '#fff3d6', label: 'Nc3', sub: 'Vienna', piece: 'knight', pieceColor: 'white' },
    description: 'Play 2.Nc3 and keep the option of a sharp f4 push. Flexible, tricky and easy to learn.',
    chapters: outline(['Vienna setup', '2...Nf6: the f4 push', '2...Nc6 and ...Bc5', 'Traps and tricks']),
    status: 'draft',
  },
  {
    id: 'london',
    title: 'The London System',
    subtitle: 'One setup against everything',
    side: 'white',
    categories: ['white'],
    level: 'beginner',
    cover: { bg: '#1f4e79', fg: '#f2f2f2', label: 'Bf4', sub: 'London', piece: 'bishop', pieceColor: 'white' },
    description: 'd4, Bf4, e3, Nf3, c3: the same solid setup almost every game. Perfect when you want fewer lines to memorise.',
    chapters: outline(['The London setup', 'vs the King\'s Indian setup', 'vs ...c5 and ...Qb6', 'Kingside attack plans']),
    status: 'draft',
  },
  {
    id: 'queens-gambit',
    title: 'The Queen\'s Gambit',
    subtitle: 'Classical play with 1.d4 and 2.c4',
    side: 'white',
    categories: ['white'],
    level: 'intermediate',
    cover: { bg: '#8a2c3b', fg: '#ffe8c2', label: '2.c4', sub: 'Queen\'s Gambit', piece: 'queen', pieceColor: 'white' },
    description: 'Offer a pawn to win the center. Learn the Accepted, Declined and Slav setups from White\'s side.',
    chapters: outline(['Queen\'s Gambit Accepted', 'Queen\'s Gambit Declined', 'Slav lines', 'Typical plans']),
    status: 'draft',
  },
  {
    id: 'ruy-lopez',
    title: 'Ruy Lopez Basics',
    subtitle: 'The Spanish, step by step',
    side: 'white',
    categories: ['white'],
    level: 'intermediate',
    cover: { bg: '#b5542a', fg: '#fff4e0', label: 'Bb5', sub: 'Ruy Lopez', piece: 'bishop', pieceColor: 'white' },
    description: 'Pressure the knight that guards e5. Learn the main ideas without drowning in theory.',
    chapters: outline(['3.Bb5: the idea', 'Morphy Defense 3...a6', 'Berlin 3...Nf6', 'Exchange Variation']),
    status: 'draft',
  },
  {
    id: 'scotch',
    title: 'The Scotch Game',
    subtitle: 'Open the center at once',
    side: 'white',
    categories: ['white'],
    level: 'beginner',
    cover: { bg: '#1d6f73', fg: '#eafcff', label: '3.d4', sub: 'Scotch', piece: 'pawn', pieceColor: 'white' },
    description: 'Strike with 3.d4 and get open lines for your pieces. Clear plans and fewer quiet positions.',
    chapters: outline(['3.d4 exd4 4.Nxd4', 'Classical 4...Bc5', 'Schmidt 4...Nf6', 'Scotch Gambit ideas']),
    status: 'draft',
  },
  {
    id: 'english',
    title: 'English Opening Basics',
    subtitle: 'Control d5 from the side',
    side: 'white',
    categories: ['white'],
    level: 'intermediate',
    cover: { bg: '#3d5a2a', fg: '#f3ffe6', label: '1.c4', sub: 'English', piece: 'rook', pieceColor: 'white' },
    description: 'Start with 1.c4 and a fianchetto bishop. A flexible setup with simple plans.',
    chapters: outline(['The c4 + g3 setup', 'vs 1...e5', 'vs 1...c5', 'vs 1...Nf6']),
    status: 'draft',
  },
  {
    id: 'jobava',
    title: 'The Jobava London',
    subtitle: 'An attacking d4 system',
    side: 'white',
    categories: ['white', 'gambit'],
    level: 'intermediate',
    cover: { bg: '#a0312e', fg: '#ffe9e0', label: '1.d4', sub: 'Jobava', piece: 'knight', pieceColor: 'white' },
    description: 'd4, Nc3 and Bf4: the aggressive cousin of the London. Quick development and early threats.',
    chapters: outline(['Setup and ideas', 'The Nb5 jump', 'vs ...g6 setups', 'Kingside attack']),
    status: 'draft',
  },
  // ------------------------------------------------------------------ Black openings & defenses
  {
    id: 'caro-kann',
    title: 'The Caro-Kann',
    subtitle: 'A rock-solid answer to 1.e4',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'beginner',
    cover: { bg: '#24313f', fg: '#ffd166', label: '...c6', sub: 'Caro-Kann', piece: 'pawn', pieceColor: 'black' },
    description: 'Play ...c6 and ...d5, get your bishop out early and enjoy a safe king. Great for beginners who hate traps.',
    chapters: caroKannChapters,
    status: 'ready',
  },
  {
    id: 'scandinavian',
    title: 'The Scandinavian',
    subtitle: 'Hit e4 on move one',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'beginner',
    cover: { bg: '#2b4c8c', fg: '#ffffff', label: '...d5', sub: 'Scandinavian', piece: 'queen', pieceColor: 'black' },
    description: 'Answer 1.e4 with 1...d5 and choose your positions from move one. Few lines, clear plans.',
    chapters: outline(['2...Qxd5 main lines', '3...Qa5 setup', '2...Nf6 gambit ideas', 'Traps for White']),
    status: 'draft',
  },
  {
    id: 'french',
    title: 'The French Defense',
    subtitle: 'Counter-punch with ...e6 and ...d5',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'intermediate',
    cover: { bg: '#2c5d8f', fg: '#fef6e4', label: '...e6', sub: 'French', piece: 'pawn', pieceColor: 'black' },
    description: 'Build a strong pawn chain and attack White\'s center with ...c5 and ...f6.',
    chapters: outline(['Advance 3.e5', 'Exchange 3.exd5', 'Tarrasch 3.Nd2', 'Winawer ideas 3.Nc3']),
    status: 'draft',
  },
  {
    id: 'accelerated-dragon',
    title: 'Accelerated Dragon',
    subtitle: 'A Sicilian with less theory',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'intermediate',
    cover: { bg: '#15634a', fg: '#e6ffef', label: '...g6', sub: 'Dragon', piece: 'bishop', pieceColor: 'black' },
    description: 'Fianchetto your bishop on the long diagonal and fight for d5. Active Sicilian play made simple.',
    chapters: outline(['Main line with ...g6', 'Maroczy Bind', 'Alapin 2.c3', 'Tactics on the long diagonal']),
    status: 'draft',
  },
  {
    id: 'black-e5',
    title: '1...e5 for Black',
    subtitle: 'Meet the Italian and Ruy with ease',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'beginner',
    cover: { bg: '#5c4033', fg: '#ffe7c7', label: '...e5', sub: 'Open games', piece: 'knight', pieceColor: 'black' },
    description: 'Classical answers to 1.e4: the Two Knights and Giuoco Piano from Black\'s side, plus how to handle early attacks.',
    chapters: outline(['Italian: 3...Bc5', 'Two Knights 3...Nf6', 'Facing 4.Ng5', 'Scotch and others']),
    status: 'draft',
  },
  {
    id: 'qgd',
    title: 'Queen\'s Gambit Declined',
    subtitle: 'The classical fortress vs 1.d4',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'beginner',
    cover: { bg: '#4a4e69', fg: '#f2e9e4', label: 'd5 e6', sub: 'QGD', piece: 'king', pieceColor: 'black' },
    description: 'Hold the center with ...d5 and ...e6, develop and castle. A solid setup trusted by world champions.',
    chapters: outline(['Main setup', 'Exchange Variation', 'vs the London', 'Freeing moves ...c5 and ...e5']),
    status: 'draft',
  },
  {
    id: 'slav',
    title: 'The Slav Defense',
    subtitle: 'Solid ...c6 against 1.d4',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'intermediate',
    cover: { bg: '#3a6ea5', fg: '#fffbe6', label: 'c6 d5', sub: 'Slav', piece: 'pawn', pieceColor: 'black' },
    description: 'Like the Caro-Kann, but against 1.d4. Keep the center and get your light bishop out.',
    chapters: outline(['Main line ...Bf5', 'Exchange Slav', 'vs 3.Nc3 and 4.e3', 'Typical plans']),
    status: 'draft',
  },
  {
    id: 'kings-indian',
    title: 'The King\'s Indian',
    subtitle: 'Let White build, then strike',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'advanced',
    cover: { bg: '#7a2e5c', fg: '#ffe3f1', label: 'g6 Bg7', sub: 'King\'s Indian', piece: 'king', pieceColor: 'black' },
    description: 'Fianchetto, castle, then hit back with ...e5 or ...c5. Rich attacking chances for Black.',
    chapters: outline(['Setup and ideas', 'Classical main line', 'Sämisch f3', 'Kingside pawn storm']),
    status: 'draft',
  },
  {
    id: 'dutch',
    title: 'The Dutch Defense',
    subtitle: 'Fight for e4 with ...f5',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'intermediate',
    cover: { bg: '#d17a22', fg: '#2b1600', label: '...f5', sub: 'Dutch', piece: 'rook', pieceColor: 'black' },
    description: 'An unbalanced reply to 1.d4. Grab e4 and aim your pieces at White\'s king.',
    chapters: outline(['Stonewall setup', 'Leningrad ideas', 'Early Bg5 and h4', 'Staunton Gambit']),
    status: 'draft',
  },
  {
    id: 'pirc-modern',
    title: 'Pirc & Modern',
    subtitle: 'Hypermodern defense with ...d6 and ...g6',
    side: 'black',
    categories: ['black', 'defense'],
    level: 'intermediate',
    cover: { bg: '#4f6d7a', fg: '#e8f6fa', label: '...d6', sub: 'Pirc', piece: 'bishop', pieceColor: 'black' },
    description: 'Let White take the center, then attack it from the side. One setup vs 1.e4 and 1.d4.',
    chapters: outline(['Pirc setup', 'Austrian Attack', 'Modern ...g6 first', '150 Attack']),
    status: 'draft',
  },
  // ------------------------------------------------------------------ Gambits & attacks
  {
    id: 'danish',
    title: 'The Danish Gambit',
    subtitle: 'Two pawns for a huge attack',
    side: 'white',
    categories: ['white', 'gambit'],
    level: 'intermediate',
    cover: { bg: '#c0392b', fg: '#ffffff', label: '3.c3!', sub: 'Danish', piece: 'bishop', pieceColor: 'white' },
    description: 'Sacrifice pawns for fast development and two raking bishops. Beginners on Black often collapse.',
    chapters: outline(['Accepted: the full gambit', 'Declined with ...d5', 'Traps and mates']),
    status: 'draft',
  },
  {
    id: 'smith-morra',
    title: 'The Smith-Morra Gambit',
    subtitle: 'Punish the Sicilian',
    side: 'white',
    categories: ['white', 'gambit'],
    level: 'intermediate',
    cover: { bg: '#e07a1f', fg: '#2a1300', label: 'd4 c3', sub: 'Smith-Morra', piece: 'knight', pieceColor: 'white' },
    description: 'Give a pawn against 1...c5 for open lines and quick development. A great anti-Sicilian weapon.',
    chapters: outline(['Accepted main line', 'Declined lines', 'Traps on the c-file', 'Attacking plans']),
    status: 'draft',
  },
  {
    id: 'kings-gambit',
    title: 'The King\'s Gambit',
    subtitle: 'Romantic chess with 2.f4',
    side: 'white',
    categories: ['white', 'gambit'],
    level: 'advanced',
    cover: { bg: '#9b1d20', fg: '#ffd8a8', label: '2.f4', sub: 'King\'s Gambit', piece: 'king', pieceColor: 'white' },
    description: 'Open the f-file and go for the king. Sharp, fun and full of traps on both sides.',
    chapters: kingsGambitChapters,
    status: 'ready',
  },
  {
    id: 'fried-liver',
    title: 'Fried Liver & Ng5 Attacks',
    subtitle: 'Hit f7 against the Two Knights',
    side: 'white',
    categories: ['white', 'gambit'],
    level: 'beginner',
    cover: { bg: '#b23a48', fg: '#fff0f3', label: 'Ng5', sub: 'Fried Liver', piece: 'knight', pieceColor: 'white' },
    description: 'Jump 4.Ng5 at f7 and punish natural mistakes. Learn the main defenses too.',
    chapters: friedLiverChapters,
    status: 'ready',
  },
  {
    id: 'stafford',
    title: 'Beat the Stafford Traps',
    subtitle: 'Refute a trappy gambit',
    side: 'white',
    categories: ['white', 'gambit'],
    level: 'beginner',
    cover: { bg: '#38304f', fg: '#ffcf56', label: '...Nc6?!', sub: 'Stafford', piece: 'queen', pieceColor: 'black' },
    description: 'The Stafford Gambit is full of tricks. See every trap, then learn the calm moves that refute it.',
    chapters: outline(['The traps', 'Safe refutation', 'Converting the extra piece']),
    status: 'draft',
  },
  {
    id: 'albin-englund',
    title: 'Black Gambits vs 1.d4',
    subtitle: 'Albin & Englund, with honest notes',
    side: 'black',
    categories: ['black', 'gambit'],
    level: 'intermediate',
    cover: { bg: '#4b2a6b', fg: '#ffd6f5', label: '...e5!?', sub: 'Albin & Englund', piece: 'pawn', pieceColor: 'black' },
    description: 'Surprise 1.d4 players with ...e5 gambits and their traps. We also show the refutations, so you know the risks.',
    chapters: outline(['Albin Countergambit', 'The Lasker Trap', 'Englund Gambit traps', 'How White refutes them']),
    status: 'draft',
  },
  // ------------------------------------------------------------------ Skill courses
  {
    id: 'fundamentals',
    title: 'Beginner Fundamentals',
    subtitle: 'The habits that win games',
    side: 'both',
    categories: ['skill'],
    level: 'beginner',
    cover: { bg: '#5a8f29', fg: '#ffffff', label: 'ABC', sub: 'Fundamentals', piece: 'pawn', pieceColor: 'white' },
    description: 'Center, development, king safety and not hanging pieces. The four rules that win most beginner games.',
    chapters: outline(['Control the center', 'Develop your pieces', 'Castle early', 'Don\'t hang pieces', 'Check, capture, threat']),
    status: 'draft',
  },
  {
    id: 'checkmates',
    title: 'Checkmate Patterns',
    subtitle: 'Mates you will see again and again',
    side: 'both',
    categories: ['skill'],
    level: 'beginner',
    cover: { bg: '#1e1e24', fg: '#ff6b6b', label: '#', sub: 'Checkmates', piece: 'king', pieceColor: 'black' },
    description: 'Back-rank mates, queen kisses, rook ladders and smothered mates. Spot them fast and finish games.',
    chapters: checkmateChapters,
    status: 'ready',
  },
  {
    id: 'tactics',
    title: 'Tactics Basics',
    subtitle: 'Forks, pins and skewers',
    side: 'both',
    categories: ['skill'],
    level: 'beginner',
    cover: { bg: '#e8a33d', fg: '#2d1a00', label: 'Fork!', sub: 'Tactics', piece: 'knight', pieceColor: 'black' },
    description: 'The tricks that win material: forks, pins, skewers, discovered attacks and removing the defender.',
    chapters: outline(['Forks', 'Pins', 'Skewers', 'Discovered attacks', 'Removing the defender']),
    status: 'draft',
  },
  {
    id: 'middlegame',
    title: 'Middlegame Plans',
    subtitle: 'What to do after the opening',
    side: 'both',
    categories: ['skill'],
    level: 'intermediate',
    cover: { bg: '#2d6a8e', fg: '#e6f4ff', label: 'Plan', sub: 'Middlegame', piece: 'rook', pieceColor: 'white' },
    description: 'Find a plan: improve your worst piece, open files for rooks and attack where you are stronger.',
    chapters: outline(['Improve your worst piece', 'Open files and outposts', 'Attacking the castled king', 'Trading pieces']),
    status: 'draft',
  },
  {
    id: 'endgames',
    title: 'Endgame Essentials',
    subtitle: 'Win the won positions',
    side: 'both',
    categories: ['skill'],
    level: 'beginner',
    cover: { bg: '#6d597a', fg: '#fdf0ff', label: 'K+P', sub: 'Endgames', piece: 'king', pieceColor: 'white' },
    description: 'King and pawn endings, the opposition, basic rook endings and how to mate with a queen or rook.',
    chapters: outline(['Queen and rook mates', 'King and pawn: the opposition', 'The square rule', 'Rook endings basics']),
    status: 'draft',
  },
  {
    id: 'pawn-structures',
    title: 'Pawn Structures',
    subtitle: 'Pawns tell you the plan',
    side: 'both',
    categories: ['skill'],
    level: 'intermediate',
    cover: { bg: '#355e3b', fg: '#f1ffe8', label: 'Pawns', sub: 'Structures', piece: 'pawn', pieceColor: 'white' },
    description: 'Isolated, doubled and passed pawns, pawn chains and majorities. Learn which plan each structure asks for.',
    chapters: outline(['Isolated pawns', 'Pawn chains', 'Passed pawns', 'Majorities and minority attack']),
    status: 'draft',
  },
  // ------------------------------------------------------------------ Coming soon
  soon('najdorf', 'Sicilian Najdorf Ideas', 'For players ready for sharp play', 'black', ['black', 'defense'], { bg: '#3b3b58', fg: '#c8c8ff', label: '...a6', sub: 'Najdorf' }),
  soon('nimzo', 'Nimzo-Indian Basics', 'Pin and pressure vs 1.d4', 'black', ['black', 'defense'], { bg: '#3f4a3c', fg: '#e3f2c1', label: '...Bb4', sub: 'Nimzo' }),
  soon('catalan', 'The Catalan', 'Long-diagonal pressure', 'white', ['white'], { bg: '#4a3f35', fg: '#f6e7d0', label: 'g3 Bg2', sub: 'Catalan' }),
  soon('grunfeld', 'The Grünfeld', 'Let White build, then smash the center', 'black', ['black', 'defense'], { bg: '#2f3e46', fg: '#cad2c5', label: '...d5', sub: 'Grünfeld' }),
  soon('rook-endgames', 'Rook Endgames', 'Lucena, Philidor and more', 'both', ['skill'], { bg: '#393d3f', fg: '#fdfdff', label: 'R+P', sub: 'Rook endings' }),
  soon('attack-king', 'Attacking the King', 'Sacrifices that work', 'both', ['skill'], { bg: '#5b2333', fg: '#f7f4f3', label: 'Bxh7+', sub: 'Attack' }),
];

function soon(id: string, title: string, subtitle: string, side: Course['side'], categories: CourseCategory[], cover: Course['cover']): Course {
  return { id, title, subtitle, side, categories, level: 'intermediate', cover, description: subtitle + '.', chapters: [], status: 'soon' };
}

export function courseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

/** A course can be studied only when it is ready and has at least one line. */
export function isPlayable(c: Course): boolean {
  return c.status === 'ready' && c.chapters.some((ch) => ch.lines.length > 0);
}

export function lineCount(c: Course): number {
  return c.chapters.reduce((n, ch) => n + ch.lines.length, 0);
}

// ------------------------------------------------------------------ filters

export type CourseFilter = 'all' | 'white' | 'black' | 'gambit' | 'defense' | 'skill' | 'soon';

export const FILTERS: { id: CourseFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'white', label: 'White openings' },
  { id: 'black', label: 'Black openings' },
  { id: 'gambit', label: 'Gambits & attacks' },
  { id: 'defense', label: 'Defenses' },
  { id: 'skill', label: 'Skill courses' },
  { id: 'soon', label: 'Coming soon' },
];

/** Courses matching a filter chip and a free-text search (title, subtitle, description, cover text). */
export function filterCourses(list: Course[], filter: CourseFilter, query = ''): Course[] {
  const q = query.trim().toLowerCase();
  return list.filter((c) => {
    if (filter === 'soon' ? c.status !== 'soon' : filter !== 'all' && !c.categories.includes(filter)) return false;
    if (filter !== 'soon' && filter !== 'all' && c.status === 'soon') return false;
    if (!q) return true;
    return [c.title, c.subtitle, c.description, c.cover.label, c.cover.sub].some((s) => s.toLowerCase().includes(q));
  });
}

// ------------------------------------------------------------------ beginner path

export interface PathChoice {
  white: string;
  vsE4: string;
  vsD4: string;
}

export const PATH_OPTIONS: { key: keyof PathChoice; label: string; options: string[] }[] = [
  { key: 'white', label: 'Your opening as White', options: ['italian', 'vienna', 'london', 'scotch'] },
  { key: 'vsE4', label: 'Your defense vs 1.e4', options: ['caro-kann', 'scandinavian', 'black-e5', 'french'] },
  { key: 'vsD4', label: 'Your setup vs 1.d4', options: ['qgd', 'slav', 'dutch'] },
];

export const DEFAULT_PATH: PathChoice = { white: 'italian', vsE4: 'caro-kann', vsD4: 'qgd' };

/** Courses on the "Start here" path, in order. */
export function pathCourses(p: PathChoice): string[] {
  return [p.white, p.vsE4, p.vsD4, 'checkmates', 'tactics'];
}
