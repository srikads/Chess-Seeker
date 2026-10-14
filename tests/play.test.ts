import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { BOTS, BOT_GROUPS } from '../src/engine/bots';
import { BOT_CHAT, CHAT_EVENTS, ChatPicker, chatEventFor } from '../src/engine/botchat';
import { MODE_ASSIST, modeOf, normalizeAssist, isPure } from '../src/chess/playmodes';
import { feedbackLine } from '../src/chess/feedback';

describe('bot roster', () => {
  it('keeps 11 bots in rating order, each in a group', () => {
    expect(BOTS).toHaveLength(11);
    BOTS.forEach((b, i) => {
      expect(b.level).toBe(i);
      if (i) expect(b.elo).toBeGreaterThan(BOTS[i - 1].elo);
      expect(BOT_GROUPS).toContain(b.group);
    });
  });
});

describe('bot chat', () => {
  it('has at least two lines for every bot and every event', () => {
    for (const b of BOTS) {
      const lines = BOT_CHAT[b.avatar];
      expect(lines, b.name).toBeDefined();
      for (const ev of CHAT_EVENTS) expect(lines[ev].length, `${b.name} ${ev}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses short, emoji-free, friendly lines', () => {
    const all = Object.values(BOT_CHAT).flatMap((l) => Object.values(l).flat());
    for (const line of all) {
      expect(line.length).toBeLessThanOrEqual(80);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(line.toLowerCase()).not.toMatch(/\b(stupid|idiot|dumb|loser|hate|kill)\b/);
    }
  });

  it('does not repeat the same line twice in a row', () => {
    const p = new ChatPicker('pip', () => 0);
    expect(p.line('greet')).not.toBe(p.line('greet'));
  });

  it('reacts to big eval swings first', () => {
    const base = { captured: 0, givesCheck: false, quietPlies: 0, said: new Set<never>(), rng: () => 0 };
    expect(chatEventFor({ ...base, prevCp: 0, cp: 400 })).toBe('userBlunder');
    expect(chatEventFor({ ...base, prevCp: 100, cp: -300 })).toBe('botBlunder');
    expect(chatEventFor({ ...base, prevCp: 0, cp: 20 })).toBeNull(); // too soon after the last line
    expect(chatEventFor({ ...base, prevCp: 0, cp: 20, quietPlies: 4, captured: 3 })).toBe('capture');
    expect(chatEventFor({ ...base, prevCp: 300, cp: 400, quietPlies: 4 })).toBe('winning');
    expect(chatEventFor({ ...base, prevCp: 300, cp: 400, quietPlies: 4, said: new Set(['winning'] as const) })).toBeNull();
  });
});

describe('game modes', () => {
  it('maps presets both ways', () => {
    expect(modeOf(MODE_ASSIST.challenge)).toBe('challenge');
    expect(modeOf(MODE_ASSIST.friendly)).toBe('friendly');
    expect(modeOf(MODE_ASSIST.assisted)).toBe('assisted');
    expect(modeOf({ ...MODE_ASSIST.friendly, evalBar: true })).toBe('custom');
  });
  it('treats Challenge as pure mode and fills missing aids with off', () => {
    expect(isPure(MODE_ASSIST.challenge)).toBe(true);
    expect(isPure(MODE_ASSIST.friendly)).toBe(false);
    expect(normalizeAssist({ hints: true })).toMatchObject({ hints: true, takebacks: false, safetyCheck: false });
  });
});

describe('coach feedback line', () => {
  const START = new Chess().fen();
  it('praises a good move with its idea', () => {
    const m = new Chess().move('Nf3');
    const t = feedbackLine({ cls: 'best', fenBefore: START, move: m, bestSan: 'Nf3', replyPv: [], replyMate: null });
    expect(t).toBe('Best move! **Nf3** develops the knight toward the centre.');
  });
  it('explains a blunder in one idea and names the better move', () => {
    const fen = 'rnbqkbnr/p1pppppp/8/1p6/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    const m = new Chess(fen).move('Bc4');
    const t = feedbackLine({ cls: 'blunder', fenBefore: fen, move: m, bestSan: 'Bxb5', replyPv: ['b5c4'], replyMate: null });
    expect(t).toMatch(/^Blunder\. Now the opponent answers \*\*bxc4\*\* and wins your bishop\. \*\*Bxb5\*\* was better\.$/);
  });
});
