// Builds public/puzzles/puzzles.json from the Lichess puzzle database (CC0).
// Usage (CI):  zstd -dc lichess_db_puzzle.csv.zst | node scripts/build-puzzles.mjs
//          or: node scripts/build-puzzles.mjs path/to/lichess_db_puzzle.csv
// CSV columns: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
// Output tuples: [id, fen, "uci uci ...", rating, "theme theme ..."] (FEN is before the opponent's setup move).
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const TARGET = Number(process.env.PUZZLE_COUNT ?? 3000);
const THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'hangingPiece', 'backRankMate', 'smotheredMate', 'deflection', 'attraction', 'capturingDefender', 'intermezzo', 'trappedPiece', 'xRayAttack', 'promotion', 'defensiveMove', 'quietMove', 'sacrifice', 'kingsideAttack', 'opening', 'endgame', 'rookEndgame', 'pawnEndgame'];
const BANDS = [[400, 800], [800, 1100], [1100, 1400], [1400, 1700], [1700, 2100]];
const perBucket = Math.ceil(TARGET / (THEMES.length * BANDS.length)) + 2;

// Reservoir per (theme, band) — deterministic pseudo-random so builds are reproducible.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const buckets = new Map();
const seen = new Map();

const input = process.argv[2] ? createReadStream(process.argv[2]) : process.stdin;
const rl = createInterface({ input, crlfDelay: Infinity });
let n = 0;
for await (const line of rl) {
  if (!n++ || !line) continue;
  const c = line.split(',');
  const [id, fen, moves, rating, rd, popularity, plays, themes] = c;
  const r = +rating;
  if (+rd > 90 || +popularity < 85 || +plays < 300) continue;
  if (moves.split(' ').length > 9) continue;
  const band = BANDS.findIndex(([lo, hi]) => r >= lo && r < hi);
  if (band < 0) continue;
  const ts = themes.split(' ');
  const keep = ts.filter((t) => THEMES.includes(t));
  if (!keep.length) continue;
  const tuple = [id, fen, moves, r, keep.join(' ')];
  // assign to the rarest matching theme bucket to balance coverage
  const theme = keep[Math.floor(rnd() * keep.length)];
  const key = `${theme}|${band}`;
  const b = buckets.get(key) ?? { items: [], count: 0 };
  b.count++;
  if (b.items.length < perBucket) b.items.push(tuple);
  else {
    const j = Math.floor(rnd() * b.count);
    if (j < perBucket) b.items[j] = tuple;
  }
  buckets.set(key, b);
}
for (const b of buckets.values()) for (const t of b.items) seen.set(t[0], t);
let puzzles = [...seen.values()];
// trim to target, keeping spread
puzzles.sort(() => rnd() - 0.5);
puzzles = puzzles.slice(0, TARGET).sort((a, b) => a[3] - b[3]);
mkdirSync('public/puzzles', { recursive: true });
writeFileSync('public/puzzles/puzzles.json', JSON.stringify({ v: 1, source: 'Lichess puzzle database (CC0) https://database.lichess.org/#puzzles', count: puzzles.length, puzzles }));
console.log(`Scanned ${n - 1} rows → wrote ${puzzles.length} puzzles`);
