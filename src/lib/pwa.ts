// Service-worker registration + "install app" prompt plumbing.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export function initPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker registration failed', err)); });
  }
}

export const canInstall = () => !!deferred;
export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
export const onInstallChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; emit();
  return outcome === 'accepted';
}
