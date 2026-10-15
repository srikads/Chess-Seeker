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
    // A short band-passed noise burst + low body tone ≈ a wooden piece landing on the board.
    const knock = (start: number, freq: number, vol: number, dur = 0.06) => {
      const len = Math.ceil(ctx!.sampleRate * dur);
      const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = ctx!.createBufferSource();
      src.buffer = buf;
      const bp = ctx!.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 1.4;
      const g = ctx!.createGain();
      g.gain.value = vol;
      src.connect(bp).connect(g).connect(ctx!.destination);
      src.start(t + start);
      tone(freq / 6, start, dur * 1.4, 'sine', vol * 0.35);
    };
    switch (kind) {
      case 'move': knock(0, 1700, 0.9); break;
      case 'capture': knock(0, 1400, 1.1, 0.08); knock(0.035, 2300, 0.6, 0.05); break;
      case 'check': knock(0, 1700, 0.8); tone(740, 0.05, 0.09, 'triangle', 0.12); tone(990, 0.12, 0.12, 'triangle', 0.12); break;
      case 'good': tone(523, 0, 0.1); tone(659, 0.09, 0.1); tone(784, 0.18, 0.18); break;
      case 'bad': tone(300, 0, 0.14, 'sawtooth', 0.08); tone(220, 0.12, 0.2, 'sawtooth', 0.08); break;
      case 'end': tone(392, 0, 0.15); tone(523, 0.15, 0.3); break;
    }
  } catch {
    /* audio unavailable */
  }
}
