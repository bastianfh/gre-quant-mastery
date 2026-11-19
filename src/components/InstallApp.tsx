import { useEffect, useState } from 'react';
import { MonitorDown } from 'lucide-react';
import { canInstall, isStandalone, onInstallChange, promptInstall } from '../lib/pwa';

/** Install-as-app button (when the browser offers it) plus offline readiness. */
export function InstallApp() {
  const [, tick] = useState(0);
  const [offline, setOffline] = useState(false);
  useEffect(() => onInstallChange(() => tick((n) => n + 1)), []);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then((r) => setOffline(!!r?.active));
    navigator.serviceWorker.ready.then(() => setOffline(true)).catch(() => {});
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <div className="field" data-testid="install-app">
      Install as an app
      {isStandalone() ? <div className="small good">● Running as an installed app.</div>
        : canInstall() ? <div><button className="btn" onClick={() => promptInstall()}><MonitorDown size={14} /> Install GRE Quant Mastery</button></div>
        : <div className="small muted">{ios ? 'In Safari, tap Share → Add to Home Screen.' : 'Use your browser’s install option (the install icon in the address bar, or the menu → Install app / Add to Home screen).'}</div>}
      <div className="tiny muted">{offline ? 'Offline ready: the app and all questions work without a connection.' : 'Offline support activates after the first visit to the deployed site.'}</div>
    </div>
  );
}
