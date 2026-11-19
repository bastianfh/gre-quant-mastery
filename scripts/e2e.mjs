// End-to-end smoke test: drives every route and the core flows in Chromium.
// Usage: npm run build && (node server/index.mjs &) && node scripts/e2e.mjs [baseUrl] [screenshotDir]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const BASE = process.argv[2] ?? 'http://localhost:8787';
const SHOTS = process.argv[3] ?? 'e2e-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const errors = [];
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const go = async (hash) => { await page.goto(`${BASE}/#${hash}`); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300); };
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false });

async function answerCurrent() {
  const choices = page.locator('.q-card .choice:not([disabled])');
  if (await choices.count()) { await choices.first().click(); return; }
  const inputs = page.locator('.q-card .numeric-entry input');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) await inputs.nth(i).fill(i === 0 ? '3' : '4');
}
async function answerAndSubmit() {
  await answerCurrent();
  await page.getByTestId('submit').click();
  await page.waitForTimeout(250);
}

// 1. every route renders
const routes = ['/', '/plan', '/learn', '/learn/ar.percents', '/learn/ge.circles', '/practice', '/daily', '/speed', '/qc', '/boss', '/lab', '/mock', '/analytics', '/formulas', '/settings', '/drills'];
for (const r of routes) {
  await go(r);
  const txt = await page.locator('main').innerText();
  check(`route ${r} renders`, txt.length > 50 && !/Something went wrong/.test(txt));
}
await go('/'); await shot('01-dashboard-empty');

// 2. practice flow with immediate feedback, hints, calculator
await go('/practice');
await page.getByTestId('start-practice').click();
await page.waitForTimeout(300);
await shot('02-practice-question');
await page.getByRole('button', { name: 'Hints & tutor' }).click();
await page.getByRole('button', { name: /Show hint 1/ }).click();
check('hint 1 shows', await page.locator('.callout:has-text("Hint 1")').count() > 0);
await page.getByRole('button', { name: 'Explain concept' }).click();
await page.waitForTimeout(300);
check('offline tutor replies', await page.locator('.tutor-msg').count() >= 2);
await page.getByRole('button', { name: 'Calculator' }).click();
for (const k of ['1', '2', '×', '3', '=']) await page.locator('.calc-keys button', { hasText: new RegExp(`^${k === '×' ? '×' : k}$`) }).first().click();
check('calculator computes 12×3', (await page.getByTestId('calc-display').innerText()) === '36');
await page.getByRole('button', { name: 'Close calculator' }).click();
await answerAndSubmit();
check('feedback after submit', await page.getByTestId('feedback').count() === 1);
await shot('03-practice-feedback');
for (let i = 0; i < 4; i++) { await page.getByTestId('next').click(); await page.waitForTimeout(200); await answerAndSubmit(); }
const katexCount = await page.locator('.katex').count();
check('math renders with KaTeX', katexCount > 0, `${katexCount} nodes`);
await page.getByRole('button', { name: 'End' }).click();
await page.waitForTimeout(400);
check('practice summary shown', await page.locator('text=complete').count() > 0);

// 3. persistence across reload
const before = await page.evaluate(() => indexedDB.databases ? 1 : 1);
void before;
await page.reload(); await page.waitForTimeout(800);
await go('/analytics');
const attemptedTxt = await page.locator('.stat:has-text("Attempted") .value').innerText().catch(() => '0');
check('attempts persist after reload', Number(attemptedTxt.replace(/,/g, '')) >= 5, `attempted=${attemptedTxt}`);
for (const t of ['Topics', 'Time', 'Errors', 'Progress', 'History']) { await page.getByRole('tab', { name: t }).click(); await page.waitForTimeout(150); }
check('analytics tabs work', true);
await page.getByRole('tab', { name: 'Overview' }).click();
await shot('04-analytics');

// 4. wrong answer lab
await go('/lab');
const due = await page.getByTestId('start-review').isEnabled();
check('mistakes enter the review queue', (await page.locator('.stat:has-text("Active mistakes") .value').innerText()) !== '0');
check('reviews are due immediately after a miss', due);
if (due) {
  await page.getByTestId('start-review').click(); await page.waitForTimeout(300);
  await answerAndSubmit();
  check('review question answered', await page.getByTestId('feedback').count() === 1);
}
await go('/lab'); await shot('05-lab');

// 5. daily, speed, QC, boss
await go('/daily'); await page.getByTestId('start-daily').click(); await page.waitForTimeout(300); await answerAndSubmit();
check('daily challenge playable', await page.getByTestId('feedback').count() === 1);
await go('/speed'); await page.getByTestId('start-speed').click(); await page.waitForTimeout(300);
check('speed timer shows', await page.locator('.timer').count() > 0); await answerAndSubmit();
await go('/qc'); await page.getByTestId('start-qc').click(); await page.waitForTimeout(300);
check('QC arena shows QC table', await page.locator('.qc-table').count() === 1); await shot('06-qc'); await answerAndSubmit();
await go('/boss'); await page.getByRole('button', { name: 'Fight' }).first().click(); await page.waitForTimeout(300);
check('boss challenge starts', await page.locator('.q-card').count() === 1);

// 6. full diagnostic exam: both sections, mark, review, submit
await go('/mock');
await page.getByTestId('start-diagnostic').click(); await page.waitForTimeout(400);
check('exam timer shows 21:00-ish', /^2[01]:/.test(await page.getByTestId('exam-timer').innerText()));
await page.waitForTimeout(2600);
check('exam countdown runs', (await page.getByTestId('exam-timer').innerText()) <= '20:58', await page.getByTestId('exam-timer').innerText());
await answerCurrent();
await page.getByTestId('mark').click();
await page.getByTestId('exam-next').click(); await answerCurrent();
await shot('07-exam');
await page.getByTestId('review-screen').click();
check('review screen lists 12', (await page.locator('.qcell').count()) === 12);
check('mark shows flag', (await page.locator('.qcell .flag').count()) === 1);
await page.locator('.qcell').nth(0).click();
check('revisit question 1', (await page.locator('.exam-bar').innerText()).includes('Question 1 of 12'));
await page.getByTestId('review-screen').click();
await page.getByTestId('submit-section').click(); await page.getByTestId('confirm-submit').click(); await page.waitForTimeout(500);
check('section 2 has 15 questions', (await page.locator('.exam-bar').innerText()).includes('of 15'));
await answerCurrent();
await page.getByTestId('review-screen').click();
await page.getByTestId('submit-section').click(); await page.getByTestId('confirm-submit').click();
await page.waitForSelector('[data-testid=exam-score]', { timeout: 15000 });
const score = Number(await page.getByTestId('exam-score').innerText());
check('exam produces a scaled score', score >= 130 && score <= 170, `score=${score}`);
await shot('08-exam-results');
check('exam results show timing strategy', (await page.getByTestId('timing-advice').count()) === 1);

// 6b. interrupted-exam recovery
await go('/'); await go('/mock'); await page.getByTestId('start-mock').click(); await page.waitForTimeout(400);
await answerCurrent(); await page.getByTestId('exam-next').click(); await page.waitForTimeout(1200);
await page.reload(); await page.waitForTimeout(800); await go('/mock');
check('interrupted exam detected after reload', await page.locator('text=Interrupted exam found').count() === 1);
await page.getByRole('button', { name: 'Resume' }).click(); await page.waitForTimeout(300);
check('exam resumes at the saved question', (await page.locator('.exam-bar').innerText()).includes('Question 2 of 12'));
await page.getByTestId('review-screen').click();
check('saved answer survived the reload', (await page.locator('.qcell.answered').count()) >= 1);
page.once('dialog', (d) => d.accept());
await page.getByRole('button', { name: 'Quit exam' }).click(); await page.waitForTimeout(300);

// 7. lesson + formulas bookmark + settings theme
await go('/learn/al.quadratics'); await page.getByRole('button', { name: 'Show solution' }).first().click();
check('lesson worked example expands', await page.locator('text=Answer:').count() > 0);
await go('/formulas'); await page.getByRole('button', { name: 'Bookmark' }).first().click();
check('formula bookmark', (await page.getByRole('radio', { name: /Bookmarked \(1\)/ }).count()) === 1);
await go('/settings'); await page.getByRole('radio', { name: 'Light', exact: true }).click(); await page.waitForTimeout(200);
check('light theme applies', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
await go('/'); await shot('09-dashboard-light');
await go('/settings'); await page.getByRole('radio', { name: 'Dark', exact: true }).click();
await go('/'); await shot('10-dashboard-data');

// 7b. official score calibration
await go('/analytics');
await page.getByTestId('official-score-input').first().fill('158');
await page.getByTestId('official-score-add').first().click(); await page.waitForTimeout(400);
check('official score recorded', /calibration|first result/i.test(await page.getByTestId('calibration-status').first().innerText()), await page.getByTestId('calibration-status').first().innerText());

// 7c. mental-math drill round (fake clock to finish the 60 s round instantly)
{
  const dp = await ctx.newPage();
  dp.on('pageerror', (e) => errors.push(`drill pageerror: ${e.message}`));
  await dp.clock.install();
  await dp.goto(`${BASE}/#/drills`); await dp.waitForTimeout(500);
  await dp.getByTestId('drill-kind-squares').click();
  await dp.getByTestId('start-drill').click(); await dp.waitForTimeout(200);
  let solved = 0;
  for (let i = 0; i < 3; i++) {
    const prompt = await dp.getByTestId('drill-prompt').innerText();
    const ann = await dp.locator('[data-testid=drill-prompt] annotation').first().textContent().catch(() => prompt);
    const sq = (ann ?? '').match(/^(\d+)\^2$/), rt = (ann ?? '').match(/\\sqrt\{(\d+)\}/);
    const ans = sq ? String(Number(sq[1]) ** 2) : rt ? String(Math.round(Math.sqrt(Number(rt[1])))) : '0';
    if (sq || rt) solved++;
    await dp.getByTestId('drill-input').fill(ans);
    await dp.getByTestId('drill-input').press('Enter');
    await dp.clock.runFor(1200); await dp.waitForTimeout(100);
  }
  await dp.screenshot({ path: `${SHOTS}/14-drill.png` });
  await dp.clock.runFor(61000); await dp.waitForTimeout(400);
  const res = dp.getByTestId('drill-result');
  check('drill round ends with a result', (await res.count()) === 1);
  const txt = (await res.innerText().catch(() => '')).replace(/\s+/g, ' ');
  check('drill counts correct answers', txt.startsWith(`${solved} correct`), txt);
  await dp.screenshot({ path: `${SHOTS}/15-drill-result.png` });
  await dp.close();
}

// 8. mobile layout
const m = await browser.newContext({ ...devices['iPhone 13'] });
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
await mp.goto(`${BASE}/#/`); await mp.waitForTimeout(800);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile: no horizontal overflow on dashboard', overflow <= 1, `overflow=${overflow}px`);
await mp.screenshot({ path: `${SHOTS}/11-mobile-dashboard.png` });
await mp.goto(`${BASE}/#/practice`); await mp.waitForTimeout(500);
await mp.getByTestId('start-practice').click(); await mp.waitForTimeout(500);
const overflowQ = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile: no horizontal overflow on question', overflowQ <= 1, `overflow=${overflowQ}px`);
await mp.screenshot({ path: `${SHOTS}/12-mobile-question.png` });
await mp.getByRole('button', { name: 'Open menu' }).click(); await mp.waitForTimeout(300);
check('mobile: menu opens', await mp.locator('.app-sidebar.open').count() === 1);
await mp.locator('.app-sidebar').getByRole('link', { name: 'Analytics' }).click(); await mp.waitForTimeout(500);
check('mobile: tapping a menu item navigates', mp.url().endsWith('#/analytics') && (await mp.locator('.app-sidebar.open').count()) === 0, mp.url());
await mp.screenshot({ path: `${SHOTS}/13-mobile-menu.png` });

// 9. installable PWA: manifest, service worker, offline reload
{
  const oc = await browser.newContext();
  const op = await oc.newPage();
  op.on('pageerror', (e) => errors.push(`offline pageerror: ${e.message}`));
  await op.goto(`${BASE}/#/`); await op.waitForLoadState('networkidle');
  const manifest = await op.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); if (!l) return null; const r = await fetch(l.href); return r.ok ? r.json() : null; });
  check('PWA: manifest with 192/512 icons', !!manifest && ['192x192', '512x512'].every((sz) => manifest.icons.some((i) => i.sizes === sz)));
  const swOk = await op.evaluate(async () => { if (!('serviceWorker' in navigator)) return false; const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 10000))]); return !!r?.active; });
  check('PWA: service worker active', swOk);
  await op.waitForTimeout(1500); // let precache finish
  await oc.setOffline(true);
  await op.reload(); await op.waitForTimeout(1200);
  const offlineTxt = await op.locator('main').innerText().catch(() => '');
  check('PWA: app loads offline', offlineTxt.length > 50, `${offlineTxt.length} chars`);
  await op.goto(`${BASE}/#/drills`); await op.waitForTimeout(800);
  check('PWA: lazy route works offline', (await op.getByTestId('start-drill').count()) === 1);
  await op.goto(`${BASE}/#/practice`); await op.waitForTimeout(800);
  await op.getByTestId('start-practice').click(); await op.waitForTimeout(600);
  check('PWA: questions work offline', (await op.locator('.q-card').count()) === 1);
  await oc.close();
}

check('no console/page errors', errors.length === 0, errors.slice(0, 8).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
