export type Side = 'white' | 'black';

export interface TimeControl {
  id: string;
  label: string;
  baseMin: number; // 0 = untimed
  incSec: number;
  long: boolean;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'none', label: 'Untimed', baseMin: 0, incSec: 0, long: true },
  { id: '10+0', label: '10 min', baseMin: 10, incSec: 0, long: false },
  { id: '10+5', label: '10 | 5', baseMin: 10, incSec: 5, long: false },
  { id: '15+10', label: '15 | 10', baseMin: 15, incSec: 10, long: true },
  { id: '30+0', label: '30 min', baseMin: 30, incSec: 0, long: true },
  { id: '30+20', label: '30 | 20', baseMin: 30, incSec: 20, long: true },
  { id: '45+45', label: '45 | 45', baseMin: 45, incSec: 45, long: true },
  { id: '60+30', label: '60 | 30', baseMin: 60, incSec: 30, long: true },
];

export const tcById = (id: string) => TIME_CONTROLS.find((t) => t.id === id) ?? TIME_CONTROLS[3];

/** Chess clock with Fischer increment. */
export class Clock {
  remaining: Record<Side, number>;
  running: Side | null = null;
  private startedAt = 0;
  private timer: number | null = null;

  constructor(private tc: TimeControl, private onTick: () => void, private onFlag: (side: Side) => void, init?: Record<Side, number>) {
    const ms = tc.baseMin * 60_000;
    this.remaining = init ? { ...init } : { white: ms, black: ms };
  }

  get timed() {
    return this.tc.baseMin > 0;
  }

  now(side: Side): number {
    if (this.running === side) return Math.max(0, this.remaining[side] - (performance.now() - this.startedAt));
    return this.remaining[side];
  }

  start(side: Side) {
    if (!this.timed) return;
    this.running = side;
    this.startedAt = performance.now();
    this.timer ??= window.setInterval(() => {
      if (this.running && this.now(this.running) <= 0) {
        const s = this.running;
        this.remaining[s] = 0;
        this.stop();
        this.onFlag(s);
      }
      this.onTick();
    }, 100);
  }

  /** Called when `side` completes a move: bank time, add increment, start the other clock. */
  switch(side: Side) {
    if (!this.timed) return;
    if (this.running === side) this.remaining[side] = this.now(side) + this.tc.incSec * 1000;
    this.start(side === 'white' ? 'black' : 'white');
  }

  stop() {
    if (this.running) this.remaining[this.running] = this.now(this.running);
    this.running = null;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
