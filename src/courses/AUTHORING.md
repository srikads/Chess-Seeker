# Authoring a course

Courses are plain TypeScript data. The app plays every line in **Learn** mode (the coach, Hoot, narrates each
move while the board animates it), then in **Practice** mode (spaced repetition: the learner plays their side from
memory and the app plays the replies), then offers **Play it out** against a gentle bot from the final position.

Good examples to copy: `content/italian.ts` (White opening), `content/caro-kann.ts` (Black defense),
`content/checkmates.ts` (skill course with lines that start from a FEN).

## Steps

1. Create `src/courses/content/<course-id>.ts` that exports `export const <name>Chapters: Chapter[] = [...]`.
2. In `src/courses/catalog.ts`, import it, replace `outline([...])` for that course with your chapters, and set
   `status: 'ready'`. Keep the course's metadata (title, cover, ...) unless you have a reason to change it.
3. Run `npm test` (fast legality and style checks) and `npm run validate:courses -- --only=<course-id>` (Stockfish
   checks, about a minute per course). Fix every ERROR. Read every WARN.

## Schema (`types.ts`)

```ts
Course   { id, title, subtitle, side: 'white'|'black'|'both', categories: ('white'|'black'|'gambit'|'defense'|'skill')[],
           level: 'beginner'|'intermediate'|'advanced', cover: { bg, fg, label, sub, piece?, pieceColor? },
           description, chapters: Chapter[], status: 'ready'|'draft'|'soon' }
Chapter  { id, title, intro, lines: Line[] }
Line     { id, title, startFen?, moves: LineMove[], userSide: 'white'|'black', intro?, summary }
LineMove { san, text?, arrows?, highlights?, trap?, accept? }
```

- `moves` holds **every ply, both sides, in order**, starting with the side to move in `startFen`
  (normal start position when `startFen` is omitted). The learner plays the `userSide` plies.
- Lines **with** `startFen` must start with the learner to move (puzzle-style skill lines).
- `side` of an opening course must match every line's `userSide`. Skill courses use `side: 'both'`.
- `san`: exactly as chess.js prints it, including `+` and `#` (`Nxe5`, `O-O`, `Qxf7#`). The test tells you the
  correct spelling if you get it wrong.
- `arrows`: `'f3e5'` (green), `'d8h4:red'`, or a circle `'f7:red'`. Colours: green, red, blue, yellow, paleGreen,
  paleBlue, paleRed, paleGrey. Green = our idea, red = a threat/target, pale colours = a hint or background idea.
  Arrows are drawn **after** the move is played, from the new position.
- `highlights`: `{ e5: 'red', d4: 'green' }` (green, red, blue, yellow).
- `trap: true` on an **opponent** move that is a deliberate mistake we teach how to punish. The engine check skips
  it. The board shows a "mistake" badge on it in Learn mode.
- `accept: ['Qh7#']`: other learner moves that count as correct. Only allowed on the **last** move of a line.
- ids: lowercase `[a-z0-9-]`, unique inside their parent.

Helpers in `helpers.ts` keep files short:

```ts
moves: [
  ...plain('e4 e5 Nf3 Nc6'),                                  // moves without notes
  M('Bc4', 'The bishop aims at f7.', { arrows: ['c4f7:red'] }), // move with a note
  T('Nd4', 'A tricky move. Black leaves e5 hanging.'),         // opponent trap (trap: true)
]
```

## Style rules for coach notes

- **At most 2 short sentences** per note (≤ 170 characters). The test enforces this. One idea per note.
- Beginner words (the learner is rated under 800). Say *why*: the threat, the target, the plan.
  "Protect e4 with a pawn." beats "Maintaining central tension."
- Chess notation is fine (`Nf3`, `e5`, `Bxf7+`): moves and squares in notes become tappable chips that point at the
  board. Use `**bold**` sparingly for the key word.
- Not every move needs a note. Put notes on key moves, new ideas, threats and traps; leave routine moves plain
  (the coach then just says "Play Nf3 here." / "Black answers e5.").
- Use arrows to show what the note talks about: the attacked piece, the plan, the threat.
- `intro` (optional): one or two sentences before the first move. `summary` (required): the takeaway, shown when
  the line is finished — it should be the one thing to remember.
- Original text only. Do not copy other courses' text, names or move commentary.

## Size

- Openings: 3–6 chapters, 4–8 lines per chapter, about 8–16 plies per line (up to ~20 for a plan line).
  Lines can share their first moves; that is how a repertoire tree is built.
- Skill courses: 4–6 chapters of 4–6 short lines (mate in 1–4, a tactic, a key endgame technique).

## Validation

- `npm test` → `tests/courses.test.ts` runs `lintCourse()` (`lint.ts`) on every course: legal SAN, exact spelling,
  userSide consistency, note length, arrow/highlight format, trap/accept placement, ready courses have no empty
  chapters.
- `npm run validate:courses [-- --only=<id>] [-- --depth=14] [-- --max-loss=150]` replays every line of every
  `ready` course with Stockfish:
  - ERROR if a **learner** move loses more than 150 centipawns, or throws away a forced mate.
  - WARN if an opponent move loses > 200cp without `trap: true` (fine if it is the common human move, but say so in
    the note), or a `trap: true` move barely loses anything.
  - WARN if a line ends clearly worse for the learner.
  Results are cached in `scripts/.engine-cache-courses.json` (git-ignored).
