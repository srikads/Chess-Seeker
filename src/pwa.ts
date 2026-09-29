import { registerSW } from 'virtual:pwa-register';
import { toast } from './ui/dom';

export function initPwa() {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onOfflineReady() {
      toast('Ready to work offline ✓', 'good');
    },
    onNeedRefresh() {
      toast('Update installed — it will apply next time you open the app.', 'info', 4000);
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
