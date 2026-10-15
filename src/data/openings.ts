// Offline opening book: named openings (ECO code + name) from lichess-org/chess-openings (CC0), bundled as
// public/openings/openings.json by scripts/build-openings.mjs. Built into a move tree with a position index,
// so transpositions are recognised and any position can be named.
import { Chess } from 'chess.js';

export interface OpeningName {
  eco: string;
  name: string;
}

export interface BookLine extends OpeningName {
  uci: string[];
}

/** One packed row: [eco, name, parentIndex (-1 = none), moves (UCI, space separated, after the parent's)]. */
export type PackedLine = [string, string, number, string];

export interface BookData {
  source?: string;
  license?: string;
  lines: PackedLine[];
}

export interface BookNode {
  uci: string;
  /** position key (see posKey) after this move */
  key: string;
  parent: BookNode | null;
  children: BookNode[];
  /** set when this exact move sequence is a named opening */
  named?: OpeningName;
  /** number of named lines in this subtree (a rough "how much theory" measure) */
  lines: number;
}

export interface Continuation {
  uci: string;
  san: string;
  /** opening name this move leads to (the move's own name, else the nearest named line below it) */
  eco: string;
  name: string;
  /** true when the move itself completes a named opening */
  exact: boolean;
  /** named lines below this move */
  lines: number;
  /** FEN after the move */
  fen: string;
}

/** Position key: piece placement, side to move and castling rights (en passant is ignored). */
export function posKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 3).join(' ');
}

/** Minimal move applier for pre-validated book lines: far faster than chess.js for building the tree. */
class FastBoard {
  sq: string[] = [];
  white = true;
  castling = 'KQkq';
  constructor() {
    this.reset();
  }
  reset() {
    const rows = ['RNBQKBNR', 'PPPPPPPP', '........', '........', '........', '........', 'pppppppp', 'rnbqkbnr'];
    this.sq = rows.join('').split(''); // index = rank*8 + file, a1 = 0
    this.white = true;
    this.castling = 'KQkq';
  }
  private idx(s: string) {
    return (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
  }
  move(uci: string) {
    const f = this.idx(uci.slice(0, 2));
    const t = this.idx(uci.slice(2, 4));
    const p = this.sq[f];
    const lower = p.toLowerCase();
    if (lower === 'k' && Math.abs(t - f) === 2) {
      // castling: move the rook as well
      const [rf, rt] = t > f ? [f + 3, f + 1] : [f - 4, f - 1];
      this.sq[rt] = this.sq[rf];
      this.sq[rf] = '.';
    }
    if (lower === 'p' && (t - f) % 8 !== 0 && this.sq[t] === '.') this.sq[t + (this.white ? -8 : 8)] = '.'; // en passant
    this.sq[t] = uci[4] ? (this.white ? uci[4].toUpperCase() : uci[4]) : p;
    this.sq[f] = '.';
    const lose = (i: number) => {
      if (i === 4) this.castling = this.castling.replace(/[KQ]/g, '');
      if (i === 60) this.castling = this.castling.replace(/[kq]/g, '');
      if (i === 0) this.castling = this.castling.replace('Q', '');
      if (i === 7) this.castling = this.castling.replace('K', '');
      if (i === 56) this.castling = this.castling.replace('q', '');
      if (i === 63) this.castling = this.castling.replace('k', '');
    };
    lose(f);
    lose(t);
    this.white = !this.white;
  }
  key(): string {
    const ranks: string[] = [];
    for (let r = 7; r >= 0; r--) {
      let row = '';
      let empty = 0;
      for (let fl = 0; fl < 8; fl++) {
        const c = this.sq[r * 8 + fl];
        if (c === '.') empty++;
        else (row += (empty || '') + c), (empty = 0);
      }
      ranks.push(row + (empty || ''));
    }
    return `${ranks.join('/')} ${this.white ? 'w' : 'b'} ${this.castling || '-'}`;
  }
}

export function expandLines(data: BookData): BookLine[] {
  const out: BookLine[] = [];
  for (const [eco, name, parent, moves] of data.lines) {
    const extra = moves ? moves.split(' ') : [];
    const uci = parent >= 0 ? [...out[parent].uci, ...extra] : extra;
    out.push({ eco, name, uci });
  }
  return out;
}

const START = new Chess().fen();

export class OpeningBook {
  readonly root: BookNode;
  private byKey = new Map<string, BookNode[]>();
  readonly size: number;

  constructor(lines: BookLine[]) {
    this.size = lines.length;
    this.root = { uci: '', key: posKey(START), parent: null, children: [], lines: 0 };
    this.byKey.set(this.root.key, [this.root]);
    const g = new FastBoard();
    for (const l of lines) {
      let node = this.root;
      g.reset();
      for (const u of l.uci) {
        let child = node.children.find((c) => c.uci === u);
        g.move(u);
        if (!child) {
          child = { uci: u, key: g.key(), parent: node, children: [], lines: 0 };
          node.children.push(child);
          const list = this.byKey.get(child.key);
          if (list) list.push(child);
          else this.byKey.set(child.key, [child]);
        }
        node = child;
      }
      if (!node.named) node.named = { eco: l.eco, name: l.name };
      for (let n: BookNode | null = node; n; n = n.parent) n.lines++;
    }
  }

  static fromData(data: BookData): OpeningBook {
    return new OpeningBook(expandLines(data));
  }

  /** Book nodes reaching this position (several when move orders transpose). */
  nodes(fen: string): BookNode[] {
    return this.byKey.get(posKey(fen)) ?? [];
  }

  inBook(fen: string): boolean {
    return this.nodes(fen).length > 0;
  }

  /** Name of exactly this position, or the nearest named position above it in the book tree. */
  lookup(fen: string): OpeningName | null {
    const nodes = this.nodes(fen);
    for (const n of nodes) if (n.named) return n.named;
    let best: OpeningName | null = null;
    let bestDepth = -1;
    for (const n of nodes) {
      for (let p = n.parent; p; p = p.parent) {
        if (!p.named) continue;
        // prefer the deepest ancestor name (most specific)
        const depth = depthOf(p);
        if (depth > bestDepth) (best = p.named), (bestDepth = depth);
        break;
      }
    }
    return best;
  }

  /** Opening name for a game: the last position along `fens` (start → current) that the book knows. */
  identify(fens: string[]): OpeningName | null {
    for (let i = fens.length - 1; i >= 0; i--) {
      const n = this.lookup(fens[i]);
      if (n) return n;
    }
    return null;
  }

  /** Book moves from this position, most theory-heavy first. */
  continuations(fen: string): Continuation[] {
    const merged = new Map<string, BookNode[]>();
    for (const n of this.nodes(fen)) for (const c of n.children) merged.set(c.uci, [...(merged.get(c.uci) ?? []), c]);
    const out: Continuation[] = [];
    for (const [uci, nodes] of merged) {
      const g = new Chess(fen);
      let san: string;
      try {
        san = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
      } catch {
        continue;
      }
      const exact = nodes.find((n) => n.named)?.named;
      const label = exact ?? nearestNamedBelow(nodes) ?? this.lookup(fen) ?? { eco: '', name: 'Book move' };
      out.push({ uci, san, eco: label.eco, name: label.name, exact: !!exact, lines: nodes.reduce((s, n) => s + n.lines, 0), fen: g.fen() });
    }
    return out.sort((a, b) => b.lines - a.lines);
  }

  /** The named opening with exactly this name (the shortest line when a name repeats), with its moves. */
  byName(name: string): (OpeningName & { uci: string[]; san: string[] }) | null {
    let found: BookNode | null = null;
    let foundDepth = Infinity;
    const walk = (n: BookNode, d: number) => {
      if (n.named?.name === name && d < foundDepth) (found = n), (foundDepth = d);
      for (const c of n.children) walk(c, d + 1);
    };
    walk(this.root, 0);
    const node = found as BookNode | null;
    if (!node) return null;
    const uci: string[] = [];
    for (let n: BookNode | null = node; n && n.parent; n = n.parent) uci.unshift(n.uci);
    const g = new Chess();
    const san = uci.map((u) => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    return { ...node.named!, uci, san };
  }

  /** All named lines whose name starts with `prefix` (e.g. "Italian Game"). */
  linesNamed(prefix: string): { name: OpeningName; uci: string[] }[] {
    const out: { name: OpeningName; uci: string[] }[] = [];
    const walk = (n: BookNode, path: string[]) => {
      if (n.named && n.named.name.startsWith(prefix)) out.push({ name: n.named, uci: path });
      for (const c of n.children) walk(c, [...path, c.uci]);
    };
    walk(this.root, []);
    return out;
  }
}

function depthOf(n: BookNode): number {
  let d = 0;
  for (let p = n.parent; p; p = p.parent) d++;
  return d;
}

function nearestNamedBelow(start: BookNode[]): OpeningName | null {
  let frontier = start.flatMap((n) => n.children);
  while (frontier.length) {
    // most theory-heavy first, so the label reflects the main continuation
    frontier.sort((a, b) => b.lines - a.lines);
    const hit = frontier.find((n) => n.named);
    if (hit) return hit.named!;
    frontier = frontier.flatMap((n) => n.children);
  }
  return null;
}

let loading: Promise<OpeningBook> | null = null;

/** Alias of loadBook() for other views (e.g. a course catalog). */
export const loadOpenings = (): Promise<OpeningBook> => loadBook();

/** Look up a named opening ("Italian Game", "Sicilian Defense: Najdorf Variation"…) with its moves. */
export async function openingByName(name: string): Promise<(OpeningName & { uci: string[]; san: string[] }) | null> {
  return (await loadBook()).byName(name);
}

/** Load the bundled book once (same-origin fetch, precached by the service worker). */
export function loadBook(): Promise<OpeningBook> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}openings/openings.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`openings.json: HTTP ${r.status}`);
        return r.json() as Promise<BookData>;
      })
      .then((d) => OpeningBook.fromData(d))
      .catch((e) => {
        loading = null;
        throw e;
      });
  }
  return loading;
}
