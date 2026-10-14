import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  ALL_SQUARES,
  attackersOf,
  defendedQuestion,
  defendersOf,
  hangingQuestion,
  hangingSquares,
  knightTargets,
  randomPosition,
  randomSquare,
  seeded,
  squareAt,
} from '../src/data/vision';

describe('board vision', () => {
  it('maps taps to squares from both sides', () => {
    expect(ALL_SQUARES.length).toBe(64);
    expect(squareAt(5, 5, 800, 'white')).toBe('a8');
    expect(squareAt(795, 795, 800, 'white')).toBe('h1');
    expect(squareAt(5, 5, 800, 'black')).toBe('h1');
    expect(squareAt(350, 450, 800, 'white')).toBe('d4');
    expect(squareAt(-1, 5, 800, 'white')).toBeNull();
  });

  it('never repeats the same square twice in a row', () => {
    const rnd = seeded(1);
    let prev = randomSquare(rnd);
    for (let i = 0; i < 200; i++) {
      const s = randomSquare(rnd, prev);
      expect(s).not.toBe(prev);
      prev = s;
    }
  });

  it('knows knight jumps', () => {
    expect(knightTargets('a1').sort()).toEqual(['b3', 'c2']);
    expect(knightTargets('d4').length).toBe(8);
    expect(knightTargets('h8').sort()).toEqual(['f7', 'g6']);
  });

  it('finds defenders, attackers and hanging pieces', () => {
    const g = new Chess('4k3/8/8/3n4/4P3/3P4/8/4K3 w - - 0 1');
    expect(attackersOf(g, 'd5')).toEqual(['e4']);
    expect(defendersOf(g, 'e4')).toEqual(['d3']);
    expect(hangingSquares(g)).toEqual(['d5']);
  });

  it('builds legal random positions with nobody in check', () => {
    const rnd = seeded(7);
    for (let i = 0; i < 40; i++) {
      const g = new Chess(randomPosition(rnd));
      expect(g.inCheck()).toBe(false);
      expect(g.findPiece({ type: 'k', color: 'w' }).length).toBe(1);
      expect(g.findPiece({ type: 'k', color: 'b' }).length).toBe(1);
    }
  });

  it('asks fair "is it defended?" questions with correct answers', () => {
    const rnd = seeded(3);
    let yes = 0;
    for (let i = 0; i < 60; i++) {
      const q = defendedQuestion(rnd);
      const g = new Chess(q.fen);
      expect(g.get(q.sq)?.type).not.toBe('k');
      expect(defendersOf(g, q.sq).length > 0).toBe(q.defended);
      if (q.defended) yes++;
    }
    expect(yes).toBeGreaterThan(15);
    expect(yes).toBeLessThan(45);
  });

  it('hanging-piece positions have exactly one hanging piece', () => {
    const rnd = seeded(11);
    for (let i = 0; i < 25; i++) {
      const q = hangingQuestion(rnd);
      const g = new Chess(q.fen);
      expect(hangingSquares(g)).toEqual([q.sq]);
      expect(q.attackers.length).toBeGreaterThan(0);
    }
  });
});
