// Tracks active study time per 20/40/40 bucket. Counts only while the app is visible
// and the learner interacted within the last 2 minutes.
import { addStudyTime, type StudyBucket } from './db';

const IDLE_MS = 120_000;
let bucket: StudyBucket | null = null;
let lastTick = 0;
let lastActivity = Date.now();
let pending = 0;

function tick() {
  const now = Date.now();
  if (bucket && document.visibilityState === 'visible' && now - lastActivity < IDLE_MS) pending += (now - lastTick) / 1000;
  lastTick = now;
  if (pending >= 15 && bucket) flush();
}

function flush() {
  if (bucket && pending >= 1) {
    const s = Math.round(pending);
    pending = 0;
    void addStudyTime(bucket, s);
  }
}

export function trackStudy(b: StudyBucket | null) {
  tick();
  flush();
  bucket = b;
  lastTick = Date.now();
}

export function initTracker() {
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, () => (lastActivity = Date.now()), { passive: true });
  document.addEventListener('visibilitychange', () => {
    tick();
    flush();
  });
  setInterval(tick, 5000);
}
