// Builds public/openings/openings.json from the lichess-org/chess-openings TSV files (CC0).
//
//   node scripts/build-openings.mjs                 # downloads a.tsv … e.tsv (build/dev time only)
//   node scripts/build-openings.mjs path/to/tsvdir  # uses local copies
//
// Output: { source, license, lines: [[eco, name, "e2e4 e7e5 g1f3 …"], …] }. Moves are stored in UCI so the
// app can build its book tree without parsing SAN. Every line is replayed with chess.js, so only legal lines ship.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const BASE = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master/';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];

async function load(letter) {
  if (dir) return readFileSync(join(dir, `${letter}.tsv`), 'utf8');
  const res = await fetch(`${BASE}${letter}.tsv`);
  if (!res.ok) throw new Error(`${letter}.tsv: HTTP ${res.status}`);
  return res.text();
}

const lines = [];
let skipped = 0;
for (const letter of ['a', 'b', 'c', 'd', 'e']) {
  const text = await load(letter);
  for (const row of text.split('\n').slice(1)) {
    if (!row.trim()) continue;
    const [eco, name, pgn] = row.split('\t');
    const g = new Chess();
    const uci = [];
    try {
      for (const tok of pgn.trim().split(/\s+/)) {
        if (/^\d+\.+$/.test(tok)) continue;
        const m = g.move(tok);
        uci.push(m.from + m.to + (m.promotion ?? ''));
      }
    } catch {
      skipped++;
      continue;
    }
    lines.push([eco, name, uci.join(' ')]);
  }
}
// shortest lines first: parents are always defined before the lines that extend them
lines.sort((a, b) => a[2].split(' ').length - b[2].split(' ').length || a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
// Compact: a line that extends an earlier one stores [eco, name, parentIndex, extraMoves]; otherwise
// [eco, name, -1, moves]. Expanded again in src/data/openings.ts (expandLines).
const index = new Map();
const packed = lines.map(([eco, name, moves], i) => {
  const ms = moves.split(' ');
  let parent = -1;
  for (let k = ms.length - 1; k > 0 && parent < 0; k--) parent = index.get(ms.slice(0, k).join(' ')) ?? -1;
  if (!index.has(moves)) index.set(moves, i);
  const extra = parent < 0 ? moves : ms.slice(lines[parent][2].split(' ').length).join(' ');
  return [eco, name, parent, extra];
});
const out = { source: 'lichess-org/chess-openings', license: 'CC0-1.0', lines: packed };
mkdirSync(join(root, 'public/openings'), { recursive: true });
const file = join(root, 'public/openings/openings.json');
writeFileSync(file, JSON.stringify(out));
console.log(`wrote ${lines.length} lines (${skipped} skipped) to ${file}`);
