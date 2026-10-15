// Variation tree for the analysis board: a main line plus branches, like a chess.com / lichess study.
// children[0] is always the main continuation; the rest are variations.
import { Chess, type Move } from 'chess.js';
import type { MoveClass } from './classify';

export interface TreeNode {
  id: number;
  parent: TreeNode | null;
  children: TreeNode[];
  /** '' for the root */
  san: string;
  uci: string;
  /** position after this move (the start position for the root) */
  fen: string;
  /** 0 for the root, 1 after White's first move from the standard start, … */
  ply: number;
  /** classification of the move vs the engine (filled in on the fly) */
  cls?: MoveClass;
  comment?: string;
}

export type MoveInput = string | { from: string; to: string; promotion?: string };

export const START_FEN = new Chess().fen();

function plyOf(fen: string): number {
  const p = fen.split(' ');
  return (Number(p[5]) - 1) * 2 + (p[1] === 'b' ? 1 : 0);
}

export class GameTree {
  readonly root: TreeNode;
  private byId = new Map<number, TreeNode>();
  private nextId = 1;

  constructor(startFen: string = START_FEN) {
    this.root = { id: 0, parent: null, children: [], san: '', uci: '', fen: new Chess(startFen).fen(), ply: plyOf(startFen) };
    this.byId.set(0, this.root);
  }

  get(id: number): TreeNode | undefined {
    return this.byId.get(id);
  }

  get startFen(): string {
    return this.root.fen;
  }

  /** Play a move from `parent`. Reuses an existing child with the same move. Returns null if illegal. */
  play(parent: TreeNode, move: MoveInput): { node: TreeNode; created: boolean; move: Move } | null {
    const g = new Chess(parent.fen);
    let m: Move;
    try {
      m = g.move(move as string);
    } catch {
      return null;
    }
    const uci = m.from + m.to + (m.promotion ?? '');
    const existing = parent.children.find((c) => c.uci === uci);
    if (existing) return { node: existing, created: false, move: m };
    const node: TreeNode = { id: this.nextId++, parent, children: [], san: m.san, uci, fen: g.fen(), ply: parent.ply + 1 };
    parent.children.push(node);
    this.byId.set(node.id, node);
    return { node, created: true, move: m };
  }

  /** Play a sequence of SAN/UCI moves from `from`; stops at the first illegal one. Returns the last node. */
  playLine(from: TreeNode, moves: MoveInput[]): TreeNode {
    let n = from;
    for (const mv of moves) {
      const r = this.play(n, typeof mv === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(mv) ? { from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] } : mv);
      if (!r) break;
      n = r.node;
    }
    return n;
  }

  /** Nodes from the first move to `node` (root excluded). */
  path(node: TreeNode): TreeNode[] {
    const out: TreeNode[] = [];
    for (let n: TreeNode | null = node; n && n.parent; n = n.parent) out.push(n);
    return out.reverse();
  }

  /** Main continuation from `from` (exclusive) to the end of its line. */
  mainline(from: TreeNode = this.root): TreeNode[] {
    const out: TreeNode[] = [];
    for (let n = from.children[0]; n; n = n.children[0]) out.push(n);
    return out;
  }

  /** Last node of the main continuation from `from`. */
  lineEnd(from: TreeNode): TreeNode {
    let n = from;
    while (n.children[0]) n = n.children[0];
    return n;
  }

  isMainline(node: TreeNode): boolean {
    for (let n: TreeNode | null = node; n && n.parent; n = n.parent) if (n.parent.children[0] !== n) return false;
    return true;
  }

  /** Move the variation containing `node` one level up (it becomes the main move at its fork). */
  promote(node: TreeNode): boolean {
    for (let n: TreeNode | null = node; n && n.parent; n = n.parent) {
      const sibs = n.parent.children;
      const i = sibs.indexOf(n);
      if (i > 0) {
        sibs.splice(i, 1);
        sibs.unshift(n);
        return true;
      }
    }
    return false;
  }

  /** Promote until `node` lies on the main line. */
  makeMainline(node: TreeNode): void {
    while (this.promote(node));
  }

  /** Delete `node` and everything after it. Returns the parent (or null for the root, which can't be deleted). */
  remove(node: TreeNode): TreeNode | null {
    const p = node.parent;
    if (!p) return null;
    p.children = p.children.filter((c) => c !== node);
    const drop = (n: TreeNode) => {
      this.byId.delete(n.id);
      n.children.forEach(drop);
    };
    drop(node);
    return p;
  }

  /** Find a node by its path of UCI moves from the root. */
  find(uciPath: string[]): TreeNode | null {
    let n: TreeNode = this.root;
    for (const u of uciPath) {
      const c = n.children.find((x) => x.uci === u);
      if (!c) return null;
      n = c;
    }
    return n;
  }

  /** PGN with variations in parentheses. */
  toPgn(headers: Record<string, string> = {}): string {
    const h: Record<string, string> = { Event: 'Analysis', Site: 'Chess Seeker', Result: '*', ...headers };
    if (this.root.fen !== START_FEN) Object.assign(h, { SetUp: '1', FEN: this.root.fen });
    const head = Object.entries(h)
      .map(([k, v]) => `[${k} "${v.replace(/"/g, "'")}"]`)
      .join('\n');
    const moves = movesText(this.root);
    return `${head}\n\n${moves ? moves + ' ' : ''}${h.Result}\n`;
  }

  /** Parse a PGN (headers, comments, NAGs, nested variations). Throws on an illegal move. */
  static fromPgn(text: string): GameTree {
    const src = text.replace(/\r\n?/g, '\n');
    const fen = src.match(/\[FEN\s+"([^"]+)"\]/)?.[1];
    const tree = new GameTree(fen ?? START_FEN);
    const body = src
      .replace(/^\s*\[[^\]]*\]\s*$/gm, ' ')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/;[^\n]*/g, ' ');
    const tokens = body.match(/\(|\)|[^\s()]+/g) ?? [];
    // cursor = node the next move is played from; last = node of the last move played (variations branch before it)
    let cursor: TreeNode = tree.root;
    let last: TreeNode = tree.root;
    const stack: { cursor: TreeNode; last: TreeNode }[] = [];
    for (let t of tokens) {
      if (t === '(') {
        stack.push({ cursor, last });
        cursor = last.parent ?? tree.root;
        continue;
      }
      if (t === ')') {
        const s = stack.pop();
        if (s) ({ cursor, last } = s);
        continue;
      }
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t) || /^\$\d+$/.test(t)) continue;
      t = t.replace(/^\d+\.(\.\.)?/, '').replace(/[!?]+$/, '').replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O');
      if (!t || /^\.+$/.test(t)) continue;
      const r = tree.play(cursor, t);
      if (!r) throw new Error(`Illegal move "${t}" after ${cursor.san || 'the start'}.`);
      last = r.node;
      cursor = r.node;
    }
    return tree;
  }
}

function moveNo(n: TreeNode, force: boolean): string {
  const white = n.ply % 2 === 1;
  const no = Math.ceil(n.ply / 2);
  if (white) return `${no}. `;
  return force ? `${no}... ` : '';
}

function movesText(parent: TreeNode): string {
  const parts: string[] = [];
  let node = parent;
  let force = true;
  while (node.children.length) {
    const [main, ...vars] = node.children;
    parts.push(moveNo(main, force) + main.san);
    for (const v of vars) {
      const rest = movesText(v);
      parts.push(`(${moveNo(v, true)}${v.san}${rest ? ' ' + rest : ''})`);
    }
    force = vars.length > 0;
    node = main;
  }
  return parts.join(' ');
}
