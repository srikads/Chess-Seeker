// Stockfish 19 (lite, single-threaded WASM) running in a Web Worker, fully on-device.

export interface PvLine {
  multipv: number;
  depth: number;
  /** centipawns from side-to-move POV (null when mate) */
  cp: number | null;
  /** moves to mate from side-to-move POV (null when not mate) */
  mate: number | null;
  pv: string[]; // UCI
}

export interface AnalysisResult {
  bestmove: string; // UCI ("(none)" when no legal move)
  lines: PvLine[];
}

export interface SearchOptions {
  depth?: number;
  movetime?: number;
  nodes?: number;
  multipv?: number;
  /** 0..20 — Stockfish "Skill Level" */
  skill?: number;
  /** UCI_Elo (enables UCI_LimitStrength) */
  elo?: number;
  onInfo?: (lines: PvLine[]) => void;
}

type Job = { run: () => Promise<void> };

class StockfishEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private listeners: ((line: string) => void)[] = [];
  private chain: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private searching = false;

  init(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      try {
        const url = new URL(`${import.meta.env.BASE_URL}engine/stockfish.js`, location.href);
        this.worker = new Worker(url);
      } catch (e) {
        reject(e);
        return;
      }
      this.worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : String(e.data);
        for (const l of this.listeners.slice()) l(line);
      };
      this.worker.onerror = (e) => reject(e);
      this.waitFor((l) => l === 'uciok').then(async () => {
        this.send('setoption name Hash value 32');
        this.send('isready');
        await this.waitFor((l) => l === 'readyok');
        resolve();
      });
      this.send('uci');
    });
    return this.ready;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitFor(pred: (l: string) => boolean): Promise<string> {
    return new Promise((res) => {
      const l = (line: string) => {
        if (pred(line)) {
          this.listeners = this.listeners.filter((x) => x !== l);
          res(line);
        }
      };
      this.listeners.push(l);
    });
  }

  /** Stop the running search (its promise still resolves with what it has). */
  stop() {
    if (this.searching) this.send('stop');
  }

  /** Cancel all queued (not yet started) jobs and stop the current one. */
  cancelAll() {
    this.generation++;
    this.stop();
  }

  /**
   * Analyse a position. Jobs are serialised; results are from side-to-move POV.
   * Pass `moves` (UCI) to analyse the position after those moves.
   */
  analyse(fen: string, opts: SearchOptions = {}): Promise<AnalysisResult> {
    const gen = this.generation;
    let result!: AnalysisResult;
    const job: Job = {
      run: async () => {
        if (gen !== this.generation) {
          result = { bestmove: '(cancelled)', lines: [] };
          return;
        }
        await this.init();
        result = await this.search(fen, opts);
      },
    };
    const p = this.chain.then(() => job.run()).then(() => result);
    this.chain = p.catch(() => undefined);
    return p;
  }

  private async search(fen: string, o: SearchOptions): Promise<AnalysisResult> {
    const multipv = o.multipv ?? 1;
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send(`setoption name Skill Level value ${o.skill ?? 20}`);
    if (o.elo) {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${o.elo}`);
    } else {
      this.send('setoption name UCI_LimitStrength value false');
    }
    this.send(`position fen ${fen}`);
    this.send('isready');
    await this.waitFor((l) => l === 'readyok');

    const lines = new Map<number, PvLine>();
    const onLine = (line: string) => {
      if (!line.startsWith('info') || !line.includes(' pv ')) return;
      const t = line.split(' ');
      const get = (k: string) => {
        const i = t.indexOf(k);
        return i >= 0 ? t[i + 1] : undefined;
      };
      const mpv = Number(get('multipv') ?? 1);
      const depth = Number(get('depth') ?? 0);
      const scoreIdx = t.indexOf('score');
      const kind = t[scoreIdx + 1];
      const val = Number(t[scoreIdx + 2]);
      const pv = line.slice(line.indexOf(' pv ') + 4).trim().split(' ');
      lines.set(mpv, { multipv: mpv, depth, cp: kind === 'cp' ? val : null, mate: kind === 'mate' ? val : null, pv });
      o.onInfo?.([...lines.values()].sort((a, b) => a.multipv - b.multipv));
    };
    this.listeners.push(onLine);
    let go = 'go';
    if (o.depth) go += ` depth ${o.depth}`;
    if (o.movetime) go += ` movetime ${o.movetime}`;
    if (o.nodes) go += ` nodes ${o.nodes}`;
    if (go === 'go') go += ' depth 14';
    this.searching = true;
    this.send(go);
    const best = await this.waitFor((l) => l.startsWith('bestmove'));
    this.searching = false;
    this.listeners = this.listeners.filter((x) => x !== onLine);
    return { bestmove: best.split(' ')[1], lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv) };
  }
}

export const engine = new StockfishEngine();

/** Convert a side-to-move score into a single number (mate folded to ±10000). */
export function scoreNum(l: { cp: number | null; mate: number | null }): number {
  if (l.mate !== null) return l.mate > 0 ? 10000 - l.mate : l.mate < 0 ? -10000 - l.mate : -10000;
  return l.cp ?? 0;
}

/** Lichess win% model: centipawns → winning chances for that side (0..100). */
export function winPct(cp: number): number {
  const c = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

export function fmtEval(cp: number, mate: number | null): string {
  if (mate !== null) return mate === 0 ? '#' : `${mate > 0 ? '' : '-'}M${Math.abs(mate)}`;
  const v = cp / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}
