// Accessibility audit: runs axe-core (WCAG 2.1 A/AA rules) on every route in dark and light themes.
// Usage: npm run build && (node server/index.mjs &) && node scripts/a11y.mjs [baseUrl]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.argv[2] ?? 'http://localhost:8787';
const routes = ['/', '/plan', '/learn', '/learn/ar.percents', '/practice', '/daily', '/speed', '/drills', '/qc', '/boss', '/lab', '/mock', '/analytics', '/formulas', '/settings', '/friends'];
const browser = await chromium.launch();
let total = 0;
const seen = new Map();
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, colorScheme: theme });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(600);
  await page.evaluate((t) => new Promise((res) => { const r = indexedDB.open('gre-quant-mastery'); r.onsuccess = () => { const tx = r.result.transaction('profile', 'readwrite'); const st = tx.objectStore('profile'); const g = st.get('me'); g.onsuccess = () => { const p = g.result; if (p) { p.settings.theme = t; st.put(p); } }; tx.oncomplete = res; }; }), theme);
  const audit = async (label) => {
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }));
    for (const v of r.violations) {
      const key = `${v.id}`;
      const targets = v.nodes.slice(0, 4).map((n) => n.target.join(' ') + (n.any?.[0]?.message ? `  [${n.any[0].message.slice(0, 110)}]` : ''));
      if (!seen.has(key)) seen.set(key, { impact: v.impact, help: v.help, where: [] });
      seen.get(key).where.push(`${theme} ${label}: ${v.nodes.length} node(s)\n        ${targets.join('\n        ')}`);
      total += v.nodes.length;
    }
  };
  for (const r of routes) { await page.goto(`${BASE}/#${r}`); await page.reload(); await page.waitForTimeout(900); await audit(r); }
  // a live question screen
  await page.goto(`${BASE}/#/practice`); await page.waitForTimeout(600);
  await page.getByTestId('start-practice').click(); await page.waitForTimeout(800);
  await audit('practice-question');
  const choices = page.locator('.q-card .choice:not([disabled])');
  if (await choices.count()) await choices.first().click(); else await page.locator('.q-card .numeric-entry input').first().fill('3');
  await page.getByTestId('submit').click(); await page.waitForTimeout(600);
  await audit('practice-feedback');
  await page.goto(`${BASE}/#/drills`); await page.waitForTimeout(500);
  await page.getByTestId('start-drill').click(); await page.waitForTimeout(500);
  await audit('drill-round');
  await page.goto(`${BASE}/#/mock`); await page.waitForTimeout(500);
  await page.getByTestId('start-diagnostic').click(); await page.waitForTimeout(800);
  await audit('exam-question');
  await page.getByTestId('review-screen').click(); await page.waitForTimeout(400);
  await audit('exam-review');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Open menu' }).click(); await page.waitForTimeout(400);
  await audit('mobile-menu');
  await ctx.close();
}
await browser.close();
for (const [id, v] of seen) console.log(`\n[${v.impact}] ${id}: ${v.help}\n    ${v.where.join('\n    ')}`);
console.log(`\n${seen.size} rule(s) violated, ${total} node(s) total`);
process.exit(seen.size ? 1 : 0);
