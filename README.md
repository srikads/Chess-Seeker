# ♞ Chess Seeker

A private, offline, ad‑free chess trainer you can install on Android as an app (PWA).
It's inspired by chess.com, with one big difference: **no data ever leaves your phone**. There are no accounts, no analytics, no ads, and no third‑party requests.

## What's inside

| Area | What it does |
| --- | --- |
| **Coach Hoot** | An original owl coach (six moods) talks you through every screen in short, one‑idea speech bubbles. Moves and squares in the text are tappable chips that point at the board, and longer explanations are walked through step by step while the pieces move and arrows draw themselves in (knight moves drawn as an L). |
| **Home** | Greeting from the coach, continue your game or play your last bot, today's Daily Puzzle and next lesson with mini boards, your latest game review, today's plan, the **20/40/40 balance**, daily goal, puzzle rating and long games this week. |
| **Play** | 11 bots with original illustrated characters and chat lines, from about 250 to full Stockfish. **Challenge / Friendly / Assisted** modes plus individual switches: move feedback with class badges, hints, suggestion and threat arrows, takebacks, eval bar, danger marks, the engine "Are you sure?" warning, and a **Safety check** that runs the *Checks? Captures? Threats?* habit before your move counts. Time controls up to 60 \| 30, resumable games, end‑of‑game card with Game Review / Rematch. |
| **Puzzles** | About 3,000 offline Lichess puzzles (CC0) with an on‑device rating, streaks, hints and an animated step‑by‑step **Explain**. **Puzzle Rush** (3 min / 5 min / Survival, three strikes), a **Daily Puzzle** with a streak calendar, **Custom Puzzles** (themes + difficulty), **Learn from mistakes**, **Drills** (11 endgame/technique positions vs Stockfish) and **Board Vision** (coordinates, knight moves, is‑it‑defended, spot the hanging piece). |
| **Learn** | **Courses**: 30 chessly‑style courses (white openings, black openings and defenses, gambits & attacks, skill courses) with a beginner *Start here* path. Each line is **learned** move by move with the coach, **practised from memory** with spaced repetition, then **played out** against a bot. Every learner move is checked by Stockfish (`npm run validate:courses`). Plus the original guided **lessons** in four tracks (Learn → Watch → Try it → Play it out → Quiz). |
| **Game Review** | Report card first (accuracy, estimated game rating, opening/middlegame/endgame grades, move‑class counts, eval graph), then a guided review: the class badge sits on the board, the coach says one short line, and **Best / Show (Fork, Threat, Lost Piece…) / Retry / Next** animate the idea on the board. **Explain step by step** walks through the threat, your move, the punishment and the better move. Brilliant/Great/Miss logic, win‑probability bar, plans, technique links and PGN export are all kept. **Learn from mistakes** turns your errors into a spaced‑repetition puzzle deck. |
| **Import** | Paste a PGN from chess.com, lichess or anywhere, or open a `.pgn` file — parsed on the device — and get the full review. |
| **Insights** | Computed on the device from your games and puzzles: results, accuracy over time and by phase, mistakes by type, tactics you missed, your openings, results vs each bot, time usage, puzzle rating history and theme strengths, plus the coach's top 3 things to work on. |
| **Analysis board** | Any position with live Stockfish: three best lines, an eval bar and best-move arrows (or turn the engine off for self analysis). Play moves to build a tree of variations, promote or delete them, and see each move graded as you go. The opening name updates as you play. **Coach explains** animates the best line. Set up a position with the board editor or a FEN, load a PGN (variations kept), and copy the FEN or PGN. |
| **Openings** | An offline opening explorer: the book moves from any position, each with its opening name and an on-device engine eval (no made-up win rates, since there's no games database offline). **Key ideas** walks through about 20 common openings with arrows and short coach lines. **Practice** drills a beginner repertoire: you play your side, the app answers, and spaced repetition brings each line back before you forget it. |

The app uses a chess.com‑like dark theme by default (light is one tap away), with four board colour themes, a bottom tab bar on phones and a sidebar on desktop. A backup export/import to a local JSON file is under Settings.

## Privacy by design

- A strict Content‑Security‑Policy (`connect-src 'self'`) stops the page from talking to any server except the one it was loaded from.
- Stockfish 19 (lite, single‑threaded WebAssembly) runs in a Web Worker on your phone.
- Progress, games and ratings are stored in IndexedDB and settings in localStorage, on this device only.
- The service worker precaches everything, including the engine and the puzzles, so the app works fully offline after the first load.

## Install on Android

1. Open the GitHub Pages URL in Chrome.
2. Tap **Install app**, or use Chrome menu ⋮ → *Add to Home screen* / *Install app*.
3. Launch it from your home screen. It runs full‑screen and offline.

## Deploying (GitHub Pages)

1. In the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`, or run the *Build & deploy* workflow manually.
   - The workflow downloads the Lichess puzzle DB at **build time** only, samples about 3,000 puzzles into `public/puzzles/puzzles.json`, validates the lessons, runs the tests, and deploys `dist/`.

## Development

```bash
npm install
npm run dev               # local dev server
npm run build             # type-check + production build (copies the Stockfish WASM into public/engine)
npm test                  # unit tests
npm run validate:lessons  # checks every lesson with chess.js AND Stockfish (slow the first time; cached)
npm run validate:lessons -- --no-engine        # fast legality-only check
npm run validate:lessons -- --only=tactics     # one track or lesson id
npm run validate:courses                       # checks every course line with chess.js AND Stockfish
npm run validate:courses -- --only=italian     # one course
```

To build the puzzle pack locally, download `lichess_db_puzzle.csv.zst` and run
`zstd -dc lichess_db_puzzle.csv.zst | npm run build:puzzles`.
Without a pack, Puzzles falls back to the "Try it" exercises from the lessons.

### Writing lessons

Lessons are plain data in `src/lessons/*.ts` (schema: `src/lessons/types.ts`). Every "Try it" line is checked by Stockfish in `validate-lessons`: a learner move that isn't (near‑)best fails the check. This keeps the teaching content chess‑correct.

## Credits and licences

Chess Seeker is licensed **GPL‑3.0‑or‑later**. It builds on:

- [Stockfish](https://stockfishchess.org) via [stockfish.js](https://github.com/nmrugg/stockfish.js) (GPL‑3.0)
- [chessground](https://github.com/lichess-org/chessground) by Lichess (GPL‑3.0)
- [chess.js](https://github.com/jhlywa/chess.js) (BSD‑2)
- the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0)
- opening names from [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0), bundled as `public/openings/openings.json` by `npm run build:openings`
