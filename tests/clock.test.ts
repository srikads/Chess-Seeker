import { describe, it, expect, vi } from 'vitest';
import { Clock, tcById } from '../src/chess/clock';

describe('clock', () => {
  it('adds increment after a move', () => {
    vi.stubGlobal('window', { setInterval: () => 1 });
    const c = new Clock(tcById('15+10'), () => {}, () => {});
    c.start('white');
    c.switch('white');
    expect(c.remaining.white).toBeGreaterThan(15 * 60_000 + 9_000);
    expect(c.running).toBe('black');
    c.stop();
  });
});
