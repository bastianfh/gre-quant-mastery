# PROJECT_STATUS — GRE Quant Mastery

## State: feature-complete, tested
- Unit tests: **107/107** (`npm test`) — bank validation, engine, persistence, lesson content, independent recomputation (incl. brute-force checks of the Expert generators and DI sets), score calibration, timing analysis, mental-math drills, sync merge.
- End-to-end: **59/59** against `npm start`, **63/63** against `npm run dev:worker` (`scripts/e2e.mjs`) — every route, practice/tutor/calculator, persistence, SRS review, daily/speed/QC/boss, full diagnostic with timing strategy, exam recovery, official-score calibration, drill round, PWA install + offline, account creation, two-device sync, friends leaderboard, mobile layout, zero console errors.
- Worker API: **34/34** (`npm run test:api` against `wrangler dev`).
- Accessibility: **0 axe-core violations** (WCAG 2.1 A/AA) across all routes, both themes and interactive states (`npm run a11y`).
- Bank: 1,265 questions from 161 generators; unlimited variants. Main JS chunk 498 KB (charts and vendors split out).

## How to resume
1. `npm install && npm run build && npm start` → http://localhost:8787 (or `npm run dev:worker` → http://localhost:8788 for the Cloudflare setup with sync).
2. `npm test`; with a server running, `npm run e2e`, `npm run a11y`, `npm run test:api -- http://localhost:8788`.
3. Generators live in `src/engine/generators/*`; add one to the exported array and the bank/validators pick it up automatically.
4. Worker: `worker/index.ts` (accounts, sync, friends, leaderboard). After changing `wrangler.jsonc`, run `npx wrangler types worker/worker-configuration.d.ts`.

## Known issues / limitations
- Claude endpoints (`server/index.mjs`) are untested live (no API key in the build environment); the offline tutor is the default, and the Cloudflare deployment runs without them.
- Sync merges are union-based: deleting a bookmark/official score on one device can be undone by another device's copy.
- PBKDF2 iterations are modest to fit the Workers free-plan CPU budget (mitigated by lockout and sign-up caps); raise `PBKDF2_ITER` on a paid plan — existing users keep working because iterations are stored per user.

## Recent work
- Official-score calibration, timing-strategy analytics, DI sets, 12 Expert generators.
- Mental-math drills; installable PWA with offline support.
- Cloudflare Worker + D1 (auto-provisioned): accounts, sync, friends leaderboard.
- Bundle splitting; accessibility fixes (light-theme contrast, focusable formula scrollers, QC table ARIA, inert page behind the mobile drawer).
