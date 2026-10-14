import { describe, it, expect } from 'vitest';
import { gradeFor, phasesOf, phaseGrades, classCounts, summaryLine, isEndgamePosition, gameFens } from '../src/chess/reviewStats';
import { schedule, dueCards, mergeCards, BOX_DAYS, RETRY_MS, MAX_BOX, type MistakeCard } from '../src/store/mistakes';
import type { MoveAnalysis } from '../src/store/db';

const mv = (cls: MoveAnalysis['cls'], winLoss = 0): MoveAnalysis => ({ cp: 0, mate: null, best: '', bestPv: [], cls, winLoss });

describe('report card', () => {
  it('grades phases by accuracy', () => {
    expect(gradeFor(95, [])).toBe('best');
    expect(gradeFor(85, [])).toBe('excellent');
    expect(gradeFor(85, ['great'])).toBe('great');
    expect(gradeFor(60, ['brilliant'])).toBe('inaccuracy');
    expect(gradeFor(20, [])).toBe('blunder');
  });
  it('splits a game into phases', () => {
    const fens = gameFens('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['e4', 'e5']);
    expect(phasesOf(fens, 2)).toEqual(['opening', 'opening']);
    expect(isEndgamePosition('8/5k2/8/8/8/8/3R4/4K3 w - - 0 1')).toBe(true);
    expect(phasesOf(['8/5k2/8/8/8/8/3R4/4K3 w - - 0 1'], 1)).toEqual(['endgame']);
  });
  it('counts and grades per side', () => {
    const a = [mv('book'), mv('book'), mv('blunder', 40), mv('best')];
    expect(classCounts(a, 'white').blunder).toBe(1);
    expect(classCounts(a, 'black').best).toBe(1);
    const g = phaseGrades(a, ['opening', 'opening', 'opening', 'opening'], 'white');
    expect(g[0].moves).toBe(2);
    expect(g[1].accuracy).toBeNull();
  });
  it('writes a short verdict', () => {
    const counts = classCounts([mv('best')], 'white');
    expect(summaryLine({ result: '1-0', you: 'white', accuracy: 91, counts })).toBe('You won with excellent play: 91% accuracy! No mistakes or blunders. Great job!');
    counts.blunder = 2;
    expect(summaryLine({ result: '1-0', you: 'black', accuracy: 50, counts })).toMatch(/2 key mistakes/);
  });
});

describe('Leitner scheduler', () => {
  const base = { box: 1, due: 0, reps: 0, lapses: 0 };
  const now = 1_000_000;
  it('moves a card up a box with a longer wait when correct', () => {
    const c = schedule(base, true, now);
    expect(c.box).toBe(2);
    expect(c.due).toBe(now + BOX_DAYS[2] * 86_400_000);
    const c3 = schedule(schedule(c, true, now), true, now);
    expect(c3.box).toBe(4);
    expect(c3.due - now).toBeGreaterThan(c.due - now);
  });
  it('caps at the last box', () => {
    expect(schedule({ ...base, box: MAX_BOX }, true, now).box).toBe(MAX_BOX);
  });
  it('sends a wrong answer back to box 1, due again soon', () => {
    const c = schedule({ ...base, box: 4 }, false, now);
    expect(c.box).toBe(1);
    expect(c.due).toBe(now + RETRY_MS);
    expect(c.lapses).toBe(1);
  });
  it('lists due cards, lowest box first', () => {
    const cards = [
      { id: 'a', box: 3, due: now - 10 },
      { id: 'b', box: 1, due: now - 5 },
      { id: 'c', box: 1, due: now + 5 },
    ];
    expect(dueCards(cards, now).map((c) => c.id)).toEqual(['b', 'a']);
  });
  it('merges new mistakes without resetting progress', () => {
    const found = { id: '1:4', gameId: 1, ply: 4, fen: 'x', played: 'Nf6', cls: 'blunder' as const, answers: ['g6'], line: ['g6'], label: 'L' };
    const deck: MistakeCard[] = mergeCards([], [found], now);
    expect(deck[0]).toMatchObject({ box: 1, due: now });
    deck[0] = { ...deck[0], box: 3, due: now + 99 };
    const again = mergeCards(deck, [found, { ...found, id: '1:6', ply: 6 }], now + 1);
    expect(again.length).toBe(2);
    expect(again.find((c) => c.id === '1:4')).toMatchObject({ box: 3, due: now + 99 });
  });
});
