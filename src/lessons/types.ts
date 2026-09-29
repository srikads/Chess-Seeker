// Lesson content schema. Every lesson is plain data so it can be validated
// offline by `npm run validate:lessons` (chess.js legality + Stockfish checks).

export type Square = string; // "e4"

/** Named colours used for square highlights and arrows. */
export type Mark = 'green' | 'red' | 'blue' | 'yellow';

export interface Highlight {
  sq: Square;
  mark: Mark;
}

export interface Arrow {
  from: Square;
  to: Square;
  mark: Mark;
}

/** Visual annotations shown on the board for a step or move. */
export interface Annotations {
  highlights?: Highlight[];
  arrows?: Arrow[];
}

/** One move in a step-through demonstration. */
export interface DemoMove extends Annotations {
  /** SAN, e.g. "Nf3", "exd5", "O-O", "e8=Q+" */
  san: string;
  /** Explanation shown after this move is played. */
  text: string;
}

/** Static explanation of a position. */
export interface ExplainStep extends Annotations {
  kind: 'explain';
  title?: string;
  fen: string;
  text: string;
  orientation?: 'white' | 'black';
}

/** A position the learner steps through move by move (forward / back). */
export interface DemoStep extends Annotations {
  kind: 'demo';
  title?: string;
  fen: string;
  /** Text shown before the first move. */
  text: string;
  moves: DemoMove[];
  orientation?: 'white' | 'black';
}

/**
 * "Try it": the learner must find the moves.
 * `solution` alternates: learner move, opponent reply, learner move, ...
 * It must start with the side to move in `fen` and end with a learner move.
 */
export interface TryStep extends Annotations {
  kind: 'try';
  title?: string;
  fen: string;
  prompt: string;
  solution: string[];
  /** Other learner first moves that are also accepted (SAN). Only when genuinely equally good. */
  alsoAccept?: string[];
  /** Progressive hints, shown one at a time on request. */
  hints: string[];
  /** Explanation shown once solved (can reference the whole line). */
  explain: string;
  /** Annotations shown after solving. */
  solvedAnnotations?: Annotations;
  orientation?: 'white' | 'black';
}

/**
 * "Play it out": the learner plays a position against Stockfish until a goal is met.
 * Great for endgames (e.g. deliver mate with K+Q vs K).
 */
export interface PlayoutStep extends Annotations {
  kind: 'playout';
  title?: string;
  fen: string;
  prompt: string;
  goal: 'mate' | 'promote' | 'draw' | 'win-material';
  /** Max learner moves before the attempt counts as failed (e.g. 50-move pressure). */
  maxMoves?: number;
  hints: string[];
  orientation?: 'white' | 'black';
}

/** Multiple choice question, optionally about a position. */
export interface QuizStep extends Annotations {
  kind: 'quiz';
  title?: string;
  fen?: string;
  question: string;
  options: string[];
  /** index into options */
  answer: number;
  explain: string;
  orientation?: 'white' | 'black';
}

export type Step = ExplainStep | DemoStep | TryStep | PlayoutStep | QuizStep;

/**
 * Study category used by the 20/40/40 planner.
 * openings = opening principles & ideas, tactics = middlegame tactics/strategy,
 * endgames = endgame technique. `method` = how-to-study / thinking lessons
 * (counted toward whichever bucket the planner treats as "play & review").
 */
export type Category = 'openings' | 'tactics' | 'endgames' | 'method';

export type Track = 'foundations' | 'tactics' | 'endgames' | 'longgame';

export interface Lesson {
  id: string; // kebab-case, globally unique
  track: Track;
  category: Category;
  title: string;
  /** 1 = first-week beginner ... 5 = advanced */
  level: 1 | 2 | 3 | 4 | 5;
  /** One-line summary for cards. */
  summary: string;
  /** Estimated minutes. */
  minutes: number;
  /** Short list of takeaways shown at the end. */
  keyPoints: string[];
  steps: Step[];
}

export interface TrackInfo {
  id: Track;
  title: string;
  blurb: string;
  icon: string;
}
