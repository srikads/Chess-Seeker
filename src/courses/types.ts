// Course schema (chessly-style opening & skill courses). See src/courses/AUTHORING.md before writing content.

export type CourseSide = 'white' | 'black' | 'both';
export type CourseCategory = 'white' | 'black' | 'gambit' | 'defense' | 'skill';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
/** ready = fully authored · draft = listed with chapter titles, content "in production" · soon = coming-soon tile only */
export type CourseStatus = 'ready' | 'draft' | 'soon';
export type PieceRole = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

/** Original generated cover art: big label on a coloured checker pattern. */
export interface CourseCover {
  /** background colour (hex) */
  bg: string;
  /** label colour (hex) */
  fg: string;
  /** big text, e.g. "1.e4 e5" or "Bc4" (≤ 8 chars reads best) */
  label: string;
  /** small caps line above the label, e.g. "ITALIAN" */
  sub: string;
  /** optional piece silhouette in the corner */
  piece?: PieceRole;
  pieceColor?: 'white' | 'black';
}

export interface LineMove {
  /** Standard Algebraic Notation, exactly as chess.js prints it (with + / #). */
  san: string;
  /** Short coach line shown when this move is played: ≤ 2 sentences, beginner words. */
  text?: string;
  /** Arrows drawn after the move: "f3e5" (green), "d8h4:red", or a circle "f7:red".
   *  Colours: green · red · blue · yellow · paleGreen · paleBlue · paleRed · paleGrey */
  arrows?: string[];
  /** Square highlights after the move, e.g. { f7: 'red', e4: 'green' } (green · red · blue · yellow). */
  highlights?: Record<string, 'green' | 'red' | 'blue' | 'yellow'>;
  /** Opponent move that is a deliberate mistake (a trap we teach). The validator then skips its eval check. */
  trap?: boolean;
  /** Other user moves accepted in practice as equally correct (e.g. a second mate). SAN. */
  accept?: string[];
}

export interface Line {
  /** unique inside its chapter: [a-z0-9-] */
  id: string;
  title: string;
  /** Start position. Omit for the normal starting position. */
  startFen?: string;
  /** Every ply in order, both sides, starting with the side to move in startFen. */
  moves: LineMove[];
  /** The side the learner plays (the app plays the other side). */
  userSide: 'white' | 'black';
  /** Optional first coach line before any move is played. */
  intro?: string;
  /** One or two sentences shown when the line is finished: the takeaway. */
  summary: string;
}

export interface Chapter {
  id: string;
  title: string;
  /** One or two sentences about what this chapter teaches. */
  intro: string;
  lines: Line[];
}

export interface Course {
  /** url id: [a-z0-9-] */
  id: string;
  title: string;
  /** a few words under the title, e.g. "A classical weapon vs 1...e5" */
  subtitle: string;
  side: CourseSide;
  categories: CourseCategory[];
  level: CourseLevel;
  cover: CourseCover;
  /** ≤ 2 short sentences, shown on cards (clamped to 2 lines) and on the course page */
  description: string;
  chapters: Chapter[];
  status: CourseStatus;
}

/** Key that identifies a line inside a course: "<chapterId>/<lineId>". */
export const lineKey = (chapterId: string, lineId: string) => `${chapterId}/${lineId}`;
