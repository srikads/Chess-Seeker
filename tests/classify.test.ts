import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { classifyMove, isSacrifice } from '../src/chess/classify';

const base = { ply: 20, winBefore: 55, winAfter: 55, winSecond: 54, isBest: true, isSacrifice: false };

describe('classifyMove', () => {
  it('labels ordinary best moves', () => expect(classifyMove(base)).toBe('best'));
  it('labels only-moves as great', () => expect(classifyMove({ ...base, winSecond: 30 })).toBe('great'));
  it('labels sound sacrifices as brilliant', () => expect(classifyMove({ ...base, isSacrifice: true })).toBe('brilliant'));
  it('does not call an unsound sacrifice brilliant', () =>
    expect(classifyMove({ ...base, isBest: false, isSacrifice: true, winAfter: 20 })).toBe('blunder'));
  it('does not award great/brilliant when already totally winning', () =>
    expect(classifyMove({ ...base, winBefore: 99, winAfter: 99, winSecond: 60, isSacrifice: true })).toBe('best'));
  it('labels failing to punish a mistake as a miss', () =>
    expect(classifyMove({ ...base, isBest: false, winBefore: 80, winAfter: 62, prevCls: 'blunder' })).toBe('miss'));
  it('keeps a huge error after an opponent mistake as a blunder', () =>
    expect(classifyMove({ ...base, isBest: false, winBefore: 80, winAfter: 30, prevCls: 'mistake' })).toBe('blunder'));
  it('grades by win% loss', () => {
    expect(classifyMove({ ...base, isBest: false, winAfter: 53 })).toBe('excellent');
    expect(classifyMove({ ...base, isBest: false, winAfter: 50 })).toBe('good');
    expect(classifyMove({ ...base, isBest: false, winAfter: 45 })).toBe('inaccuracy');
    expect(classifyMove({ ...base, isBest: false, winAfter: 40 })).toBe('mistake');
    expect(classifyMove({ ...base, isBest: false, winAfter: 20 })).toBe('blunder');
  });
  it('treats early sensible moves as book', () => expect(classifyMove({ ...base, ply: 2, isBest: false, winAfter: 53 })).toBe('book'));
});

describe('isSacrifice', () => {
  it('detects a piece left en prise', () => {
    // Bxf7+ with the bishop capturable by the king
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3';
    const m = new Chess(fen).move('Bxf7+');
    expect(isSacrifice(fen, m)).toBe(true);
  });
  it('ignores safe moves', () => {
    const fen = new Chess().fen();
    expect(isSacrifice(fen, new Chess().move('Nf3'))).toBe(false);
  });
});
