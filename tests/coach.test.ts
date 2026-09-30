import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { coachCard, displayName } from '../src/chess/coach';

// 1.e4 c6 2.Nf3 d5 3.Bd3 h6 4.Nh4 Nd7 — the user is White, 4.Nh4 is a mistake that 4...e5 punishes.
const fenAt = (sans: string[]) => {
  const g = new Chess();
  for (const s of sans) g.move(s);
  return g.fen();
};
const opening = ['e4', 'c6', 'Nf3', 'd5', 'Bd3', 'h6'];
const all = (c: ReturnType<typeof coachCard>) => [c.headline, ...c.sections.map((s) => s.text)].join(' ');

describe('coach', () => {
  it('strips ratings from names', () => {
    expect(displayName('Knightly Ned (600)')).toBe('Knightly Ned');
  });

  it("explains the user's own mistake with the opponent's punishment", () => {
    const c = coachCard({ fen: fenAt(opening), san: 'Nh4', cls: 'mistake', mine: true, opp: 'Knightly Ned', best: 'O-O', bestPv: ['O-O', 'dxe4'], replyPv: ['e5', 'Nf3'] });
    expect(c.headline).toMatch(/Knightly Ned can play \*\*e5\*\*/);
    expect(c.sections.some((s) => s.title === 'Better' && s.text.includes('O-O'))).toBe(true);
    expect(c.sections.some((s) => s.title === 'Rule of thumb')).toBe(true);
    expect(c.replay?.from).toBe('reply');
  });

  it("talks to the user when the opponent misses a chance to punish the user's mistake", () => {
    const c = coachCard({ fen: fenAt([...opening, 'Nh4']), san: 'Nd7', cls: 'miss', mine: false, opp: 'Knightly Ned', best: 'e5', bestPv: ['e5', 'Nf3'], replyPv: [], prevSan: 'Nh4' });
    const text = all(c);
    expect(text).toMatch(/You got away with one/);
    expect(text).toMatch(/Your \*\*Nh4\*\*/);
    expect(text).not.toMatch(/Your opponent's/);
    expect(text).toMatch(/Knightly Ned could have played \*\*e5\*\*/);
  });

  it("frames the opponent's mistake as the user's chance", () => {
    // 1.e4 e5 2.Nf3 Qg5?? — the queen walks into the knight.
    const fen = fenAt(['e4', 'e5', 'Nf3']);
    const c = coachCard({ fen, san: 'Qg5', cls: 'blunder', mine: false, opp: 'Bot', bestPv: [], replyPv: ['Nxg5'] });
    expect(c.headline).toMatch(/chance for you/);
    expect(c.sections[0].text).toMatch(/You can play \*\*Nxg5\*\* and take their queen on g5 for free/);
  });

  it('praises the user for a good move without mentioning the opponent', () => {
    const c = coachCard({ fen: fenAt(['e4', 'e5']), san: 'Nf3', cls: 'best', mine: true, opp: 'Bot', best: 'Nf3', bestPv: ['Nf3'], replyPv: [] });
    expect(c.headline).toMatch(/Best move/);
    expect(c.headline).toMatch(/Nf3 attacks/);
  });
});
