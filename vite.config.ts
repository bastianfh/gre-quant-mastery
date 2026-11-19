import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';

/**
 * Generates /sw.js at build time with a precache list of the built app shell.
 * Skips font formats/subsets the browser never needs (ttf, woff when woff2 exists,
 * non-Latin Inter subsets); those are cached on first use instead.
 */
function serviceWorker(): Plugin {
  return {
    name: 'gqm-service-worker',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const skip = (f: string) => /\.(ttf|woff|map)$/.test(f) || /(cyrillic|greek|vietnamese)/.test(f);
      const built = Object.keys(bundle).filter((f) => !skip(f));
      const pub = readdirSync('public').filter((f) => !f.startsWith('.') && !f.startsWith('_'));
      const files = ['./', ...[...built, ...pub].filter((f) => f !== 'index.html').map((f) => `./${f}`)];
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      const source = `// Generated at build time. Offline cache for GRE Quant Mastery.
const CACHE = 'gqm-${version}';
const PRECACHE = ${JSON.stringify(files)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('gqm-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return; // API always live
  if (req.mode === 'navigate') {
    // network first so deploys show up immediately; fall back to the cached shell offline
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return r; }).catch(() => caches.match('./')));
    return;
  }
  // hashed assets never change: cache first, then network (and remember it)
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // stable vendor chunks: app deploys don't invalidate cached libraries
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('/katex/')) return 'vendor-katex';
          if (id.includes('/dexie/')) return 'vendor-dexie';
          return undefined; // recharts & friends follow the lazy chart chunk
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
