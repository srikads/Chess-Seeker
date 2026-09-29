// Synthesised move sounds (WebAudio) — no audio files, no network.
import { settings } from '../store/settings';

let ctx: AudioContext | null = null;

type Kind = 'move' | 'capture' | 'check' | 'good' | 'bad' | 'end';

export function playSound(kind: Kind) {
  if (!settings().sound) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + start);
      g.gain.setValueAtTime(vol, t + start);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(t + start);
      o.stop(t + start + dur);
    };
    switch (kind) {
      case 'move': tone(420, 0, 0.07, 'triangle', 0.22); break;
      case 'capture': tone(300, 0, 0.05, 'square', 0.12); tone(180, 0.04, 0.09, 'triangle', 0.2); break;
      case 'check': tone(660, 0, 0.08, 'triangle'); tone(880, 0.08, 0.1, 'triangle'); break;
      case 'good': tone(523, 0, 0.1); tone(659, 0.09, 0.1); tone(784, 0.18, 0.18); break;
      case 'bad': tone(300, 0, 0.14, 'sawtooth', 0.08); tone(220, 0.12, 0.2, 'sawtooth', 0.08); break;
      case 'end': tone(392, 0, 0.15); tone(523, 0.15, 0.3); break;
    }
  } catch {
    /* audio unavailable */
  }
}
