// PGN import (chess.com, lichess, any PGN). Parsed entirely on-device.
import { Chess } from 'chess.js';

export interface ParsedGame {
  headers: Record<string, string>;
  startFen: string;
  sans: string[];
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  termination: string;
  timeControl: string; // "10+0" style
  date: number;
}

/** chess.com/lichess TimeControl header ("600", "900+10", "180+2", "-") → "10+0" style. */
export function normaliseTimeControl(tc: string | undefined): string {
  if (!tc || tc === '-' || tc === '?') return 'none';
  const m = tc.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return 'none';
  const base = Math.round(Number(m[1]) / 60);
  return `${base}+${Number(m[2] ?? 0)}`;
}

/** 15 minutes or more per side counts as a long game. */
export function isLongTimeControl(tc: string): boolean {
  if (tc === 'none') return true;
  const m = tc.match(/^(\d+)\+(\d+)$/);
  return !!m && Number(m[1]) + (Number(m[2]) * 40) / 60 >= 15;
}

/** Only the first game is imported when several are pasted. */
function firstGame(text: string): string {
  const t = text.replace(/\r\n?/g, '\n').trim();
  const starts = [...t.matchAll(/^\[Event /gm)].map((m) => m.index!);
  return starts.length > 1 ? t.slice(0, starts[1]).trim() : t;
}

export function parsePgn(text: string): ParsedGame {
  const src = firstGame(text);
  if (!src) throw new Error('Paste a PGN first.');
  const g = new Chess();
  try {
    g.loadPgn(src, { strict: false });
  } catch (e) {
    throw new Error(`Couldn't read this PGN: ${(e as Error).message}`);
  }
  const headers = g.getHeaders() as Record<string, string>;
  const sans = g.history();
  if (!sans.length) throw new Error('No moves found in this PGN.');
  const startFen = headers.SetUp === '1' && headers.FEN ? headers.FEN : new Chess().fen();
  const name = (n: string | undefined, elo: string | undefined, fallback: string) =>
    `${n && n !== '?' ? n : fallback}${elo && elo !== '?' ? ` (${elo})` : ''}`;

  let result = (['1-0', '0-1', '1/2-1/2'].includes(headers.Result) ? headers.Result : '*') as ParsedGame['result'];
  let termination = headers.Termination && headers.Termination !== '*' ? headers.Termination : '';
  if (g.isCheckmate()) {
    termination = 'checkmate';
    result = g.turn() === 'w' ? '0-1' : '1-0';
  } else if (g.isStalemate()) (termination = 'stalemate'), (result = '1/2-1/2');
  else if (g.isDraw()) (termination ||= 'draw'), (result = '1/2-1/2');
  // chess.com writes e.g. "RealVagabond won by resignation" — keep the short reason.
  termination = termination.replace(/^.*\bwon\s+/i, '').replace(/^by\s+/i, '') || (result === '*' ? 'unfinished' : 'imported');

  const d = (headers.UTCDate ?? headers.Date ?? '').replace(/\./g, '-');
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(`${d}T12:00:00Z`) : NaN;
  return {
    headers,
    startFen,
    sans,
    white: name(headers.White, headers.WhiteElo, 'White'),
    black: name(headers.Black, headers.BlackElo, 'Black'),
    result,
    termination,
    timeControl: normaliseTimeControl(headers.TimeControl),
    date: Number.isNaN(parsedDate) ? Date.now() : parsedDate,
  };
}
