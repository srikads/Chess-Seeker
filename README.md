# ♞ Chess Seeker

A private, offline, ad‑free chess trainer you can install on Android as an app (PWA).
It's inspired by chess.com, with one big difference: **no data ever leaves your phone**. There are no accounts, no analytics, no ads, and no third‑party requests.

## What's inside

| Tab | What it does |
| --- | --- |
| **Home** | Today's plan and your **20/40/40 balance**: study time for openings, middlegame/tactics and endgames over the last 7 days, compared with your target split. It also shows your daily goal, puzzle rating, and how many long games you played this week. |
| **Learn** | A guided path through four tracks: *Foundational Principles*, *Tactical Patterns*, *Endgame Technique*, and *Long Games & Study Method*. Each lesson works the same way: **Learn** (highlighted squares and arrows), **Watch** (step through a model example move by move, with an explanation for each move), **Try it** (you find the moves on a live board, with hints), **Play it out** (you play against Stockfish until you reach the goal), then a **Quiz**. |
| **Puzzles** | About 3,000 offline puzzles from the Lichess puzzle database (CC0), filtered by theme (fork, pin, skewer, mate in 2, back rank, endgame…). You get an on‑device puzzle rating, and an "Explain move" button gives a plain‑English reason for each answer. |
| **Play** | 11 bots from about 250 to full Stockfish strength. Long time controls go up to 60 | 30. The coach offers **hints on demand**, a **live blunder warning** ("Are you sure? The opponent answers Bxe4 and wins your knight"), and a thinking checklist. **Pure mode** turns all help off. A game in progress can be resumed later. |
| **Games** | Chess.com‑style game review by Stockfish. Every move is labelled **!! Brilliant**, **! Great**, ★ Best, Excellent, Good, Book, ?! Inaccuracy, ? Mistake, **✗ Miss** or ?? Blunder, and each label comes with a plain‑English *why*: what the move does, the only‑move margin for *Great*, the sacrifice for *Brilliant*, the refutation for mistakes, and the punishing move for a *Miss*. The review also has a broadcast‑style **White / Draw / Black win‑probability bar** (Stockfish's WDL model) that moves with every move and shows how much each move swung your chances. **How to continue** explains the best plan from each position, and **▶ Play the plan** animates it. **Technique links** (fork, pin, back‑rank mate, open file, passed pawn…) jump to the lesson that teaches the idea. Plus accuracy, an eval graph, key moments, your best moves and **Retry this moment**. Games can be exported as PGN. |

The app uses dark mode by default (light is one tap away), with four board colour themes. A backup export/import to a local JSON file is under Settings.

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
