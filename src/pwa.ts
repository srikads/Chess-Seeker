import { registerSW } from 'virtual:pwa-register';
import { toast } from './ui/dom';

const BUILD_KEY = 'cs.build';

export function initPwa() {
  // Tell the user when a freshly deployed version has just taken over.
  let firstRun = false;
  try {
    firstRun = !localStorage.getItem(BUILD_KEY);
    const prev = localStorage.getItem(BUILD_KEY);
    if (prev && prev !== __BUILD_ID__) toast('Updated to the latest version ✓', 'good');
    localStorage.setItem(BUILD_KEY, __BUILD_ID__);
  } catch {
    /* storage blocked */
  }
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onOfflineReady() {
      if (firstRun) toast('Ready to work offline ✓', 'good');
    },
    // With autoUpdate the new version activates and the page reloads by itself;
    // we just make sure the check happens often (installed apps can stay open for days).
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine) void reg.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      setInterval(check, 30 * 60_000);
    },
  });
}

/** Capture the Android "install app" prompt so we can offer an Install button. */
let deferred: any = null;
const listeners = new Set<() => void>();
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  listeners.forEach((l) => l());
});
export const canInstall = () => !!deferred;
export const onInstallable = (fn: () => void) => listeners.add(fn);
export async function promptInstall() {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
}
