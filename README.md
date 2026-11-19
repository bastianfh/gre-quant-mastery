# GRE Quant Mastery

An adaptive, gamified training system for the **current (shorter) GRE Quantitative Reasoning** section, built around a 30-day plan toward 165–170.

- **1,265 validated questions** in a fixed bank (161 parametric generators × 5 difficulty levels), plus **unlimited fresh variants** of every concept — including GRE-style **data-interpretation sets** (one chart, three questions) and **Expert multi-concept** items with varied wording.
- Every answer is **computed by code**, every question is **validated automatically**, and Quantitative Comparison answers are determined by **exhaustive edge-case testing** (zero, ±1, negatives, fractions, boundaries) — never from one example.
- Full section-adaptive **mock exams** (12 q / 21 min → 15 q / 26 min), **Wrong Answer Lab** with spaced repetition, transparent **mastery model**, **score estimate**, analytics, lessons for all 43 curriculum units, formula reference, calculator, XP/levels/achievements, and an AI tutor (offline built-in; Claude when configured).
- **Score calibration** from your official POWERPREP results, **timing-strategy** analytics on every mock, and **60-second mental-math drills**.
- **Installable app** that works fully **offline**; optional **account** (username + passphrase, no email) for **cross-device sync** and a **friends leaderboard** on the Cloudflare deployment.

Original GRE-style content — not ETS material. Score estimates are approximations, not official ETS scores.

---

## Launch

Requirements: Node 18+ (tested on Node 22).

```bash
npm install
```

```bash
npm run build
```

```bash
npm start
```

Open **http://localhost:8787**. Progress is saved automatically in your browser (IndexedDB).

Development mode (hot reload; the `/api` calls proxy to the server on 8787):

```bash
npm run dev
```

### Deploying on Cloudflare (accounts, sync, friends leaderboard)

The repo is a Cloudflare Worker with static assets (`wrangler.jsonc`): the Vite build is served as static files and only `/api/` routes run `worker/index.ts`. Connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create → Import a repository) with:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Nothing else to set up: the D1 database (binding `DB`) is **created automatically on the first deploy** because `wrangler.jsonc` lists it without an id, and the Worker creates its tables on the first request. Every push to `main` redeploys. To find the database later: dashboard → Storage & Databases → D1 (named after the Worker).

Local test of the full Cloudflare setup (static site + Worker + local D1):

```bash
npm run build
```

```bash
npm run dev:worker
```

Then open http://localhost:8788 and, in another terminal, `npm run test:api -- http://localhost:8788` (34 API checks) or `node scripts/e2e.mjs http://localhost:8788` (includes the two-device sync test).

Security notes: passphrases are salted and hashed with PBKDF2 (iterations are stored per user so they can be raised; the default is tuned for the free plan's CPU limit), five wrong passphrases lock the account with exponential back-off, sign-up is capped per network per day, and session tokens are stored only as SHA-256 hashes. No email or personal data is collected, so there is no password reset — users should keep their passphrase in a password manager. Deleting the account (Settings) removes all cloud data.

### Optional: enable the Claude AI tutor & verified question generator

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Enables `/api/tutor` and `/api/generate`. Read **only by the server**; never sent to the browser. |
| `GQM_MODEL` | No | Model id (default `claude-opus-5-5`). |
| `PORT` | No | Server port (default `8787`). |
| `GQM_DISABLE_AI` | No | Set to `1` to force offline mode even with a key. |

Without a key everything works; the tutor uses the built-in offline engine (3-level hints, concept explanations from the lessons, answer diagnosis, similar-question generation). Server-side refusal fallback (`fallbacks: "default"`) is enabled on AI requests.

### Tests

```bash
npm test
```

```bash
npm run e2e
```

```bash
npm run a11y
```

`npm run e2e` and `npm run a11y` expect the server running on port 8787 (`npm run build && npm start`). The E2E test drives every route and the core flows in Chromium (59 checks on the Node server; 63 against `npm run dev:worker`, which adds account creation, two-device sync and the friends leaderboard), including mobile layout, offline mode and zero console errors. The accessibility audit runs axe-core (WCAG 2.1 A/AA) on every route in both themes plus question, feedback, drill, exam and mobile-menu states. Export the bank for inspection with `npm run bank:export -- question-bank.json 20` (writes JSON and prints a 20-question readable sample).

---

## Architecture

```
src/
  engine/                 pure TypeScript, no UI — fully unit-tested
    generators/           161 generators: arithmetic, algebra, word, geometry, data, strategy, DI sets, expert (+ qc.ts engine)
    bank.ts               deterministic bank builder, id ⇄ question reconstruction, variants
    validate.ts           structural validator (formats, choices, answers, math delimiters)
    grading.ts            answer checking (QC / MCQ / multi-select / numeric incl. fractions) + diagnosis
    mastery.ts            transparent, evidence-capped mastery model
    adaptive.ts           Elo-style ability ratings, target difficulty, speed/accuracy quadrants
    srs.ts                spaced repetition (immediate → later today → 1 d → 3 d → 7 d)
    scoring.ts            Rasch ability estimate → 130–170 estimate; exam scoring
    selection.ts          adaptive question selection; exam-form builder & section routing
    gamification.ts       XP, levels, streaks, achievements, daily objectives
    plan.ts               adaptive 30-day study plan
    timing.ts             per-exam timing strategy (time sinks, pacing, over-cap misses)
    drills.ts             mental-math drill generators and answer parsing
    merge.ts              cross-device sync merge (idempotent, never drops attempts) + gzip
  store/                  zustand store, Dexie (IndexedDB) persistence, derived analytics
  components/             question player, feedback, tutor, calculator, diagrams/charts, session runner
  pages/                  15 screens (Dashboard … Mental Math, Friends, Settings)
  lib/sync.ts, lib/pwa.ts account/sync client; service-worker registration and install prompt
  content/                curriculum taxonomy, 43 lessons, formula reference
server/index.mjs          static hosting + optional Claude endpoints (Anthropic TypeScript SDK)
worker/index.ts           Cloudflare Worker: accounts, sync, friends leaderboard (D1)
wrangler.jsonc            Worker + static assets + auto-provisioned D1 binding
tests/                    vitest suites (bank, engine, store, content, independent recomputation)
scripts/e2e.mjs           Playwright end-to-end test
scripts/a11y.mjs          axe-core accessibility audit
scripts/api-test.mjs      Worker API test (run against wrangler dev)
```

**UI:** frosted-glass three-column shell (`src/styles/glass-theme.css` + `glass-app.css`, rules in `.claude/skills/glass-ui`): six destinations on the left (Dashboard, Study Plan, Practice, Mock Exams, Wrong Answer Lab, Analytics; practice modes and study resources are tabs inside their section). The Dashboard leads with one recommended action, then a compact metric row; detail panels appear after the first session. The right rail is context-aware: today's training checklist and recent activity normally, quick formulas and a scratchpad while answering questions or reading a lesson.

**Stack:** Vite + React 18 + TypeScript, react-router (hash routing), zustand, Dexie/IndexedDB, KaTeX, Recharts, custom SVG diagrams, lucide icons, Node `http` server, `@anthropic-ai/sdk`, Cloudflare Workers + D1.

## Question generation system

Each generator is a function `(seededRNG, level) → question` that picks parameters, **computes the answer from them**, and writes the stem, choices (with distractors that encode specific mistakes), step-by-step explanation, alternative method, trap, three escalating hints, and — for geometry and data interpretation — an SVG diagram or chart **drawn from the same numbers**. Most generators have several structural variants per level, not just new numbers.

- **Bank:** every generator × level × 3 seeds (de-duplicated) → 1,265 questions with stable ids (`generatorId~level~seed`). Any question can be rebuilt from its id, so attempts store only ids.
- **Variants:** new seeds on demand (unlimited practice, spaced-repetition concept reviews, "similar question").
- **Quality gates** (all enforced by `npm test`):
  1. Structural validation of every question (formats, unique choices, valid answer indices, finite numerics, balanced math, no `NaN`/`undefined`).
  2. Every math segment compiles in KaTeX.
  3. Grading round-trip: each question's own answer grades correct and a perturbed answer grades wrong.
  4. QC relationships are classified by exhaustive testing over special-value pools plus explicit boundary cases; determinate answers must carry a written proof, (D) answers carry concrete counter-examples.
  5. **Independent recomputation:** 13 suites re-derive answers from the rendered question text with a different method (brute force, modular exponentiation, geometry formulas, equation substitution) across 40 fresh variants each.
  6. Distribution checks (all units, formats, levels; QC answers and MCQ answer positions spread out).
- **AI generation (optional):** Claude writes a question to a strict schema → a **second, independent call solves it without the answer** and flags ambiguity / unstated assumptions → only if both answers agree and structural checks pass is it saved (client re-validates before storing). Rejected questions are never shown.

## Adaptive learning engine

- **Mastery (per unit and category):** difficulty- and recency-weighted credit (harder questions count more; slow or hinted answers earn partial credit; misses on easy items weigh more), with a prior so a few answers can't spike it. **Evidence caps**: < 5 attempts → max 59; no correct Medium+ → max 64; Strong (75+) needs ≥ 2 correct Hard/Expert at ≥ 60%; Mastered (90+) needs ≥ 12 attempts, ≥ 4 correct Hard/Expert at ≥ 75%, and ≥ 85% on the last 10. The UI shows what caps each score. Bands: 0–39 critical, 40–59 developing, 60–74 intermediate, 75–89 strong, 90–100 mastered.
- **Adaptive difficulty:** Elo ratings per unit / category / overall (correct-but-slow counts as partial success). Selection targets the level with ≈ 70% expected success, boosts weak and untouched units, de-emphasises mastered ones, and avoids recent repeats.
- **Speed profile:** fast/slow × accurate/inaccurate quadrant with specific advice.
- **Spaced repetition:** misses are due immediately, then later today, tomorrow, in 3 and 7 days; repeated lapses shrink intervals (×0.75 / ×0.5 / ×0.35). Early reviews re-test the exact question; later reviews test the **concept with a fresh variant**.
- **Score estimate:** recency-weighted Rasch ability over the last 250 attempts (timed/exam items weighted more) blended with recent simulation scores (weight grows with the number of mocks), a coverage penalty when topics are unsampled, and a range from the estimate's standard error. Always labelled as an approximation.
- **Study plan:** phases by fraction of the time to the exam (Foundations → Expansion → Advanced & Timed → Exam Mode). Day 1 is the diagnostic; lessons and drills target the weakest units; units ≥ 75% skip lessons; the review block scales with the SRS backlog; mocks are scheduled every 2–4 days late in the plan. Blocks tick off automatically as you complete them.

## Data persistence

- **IndexedDB via Dexie**, written through on every answer: profile & settings, attempts, spaced-repetition items, exams, sessions, daily logs, saved AI questions, and session snapshots.
- **Recovery:** in-progress mock exams and practice/daily sessions are snapshotted continuously and offered for resume after a reload or crash (verified by the E2E test).
- **Export / import** (Settings) as a validated JSON file; import is transactional and rejects foreign or newer-schema files. Elo ratings are recomputed from history on load, so they can never drift from the record.
- **Cloud sync (optional):** when signed in, the whole export is gzip-compressed and stored as one opaque blob per user in D1 (the Worker never parses it). Each device merges the cloud copy into its own data — attempts, exams and sessions are unioned (never lost), review items take the most recent state, settings follow whichever device edited them last — then uploads with optimistic concurrency (a stale write gets HTTP 409 and the client merges again). Sync runs after each finished session or exam, every ~30 s while answering, when the tab is hidden and when the connection returns.
- **Offline:** a build-time service worker precaches the app shell, every route and the fonts; pages load network-first so deploys show up immediately.
- Errors while saving surface as a visible toast; if storage is blocked (e.g. private mode) a warning banner explains that progress won't persist.

## Known limitations

- Cloud sync needs the Cloudflare deployment (the Node server reports sync as unavailable and the app falls back to Export/Import). Removing a bookmark or official score on one device can reappear after syncing with a device that still has it (merges are union-based). Daily totals for a day studied on two devices are merged by maximum, so they can slightly undercount.
- The friends leaderboard compares Daily Challenge points; each person's challenge is matched to their level, so it rewards consistency rather than being a like-for-like contest.
- The AI tutor and AI question generator need `ANTHROPIC_API_KEY` on the server; they were implemented against the SDK but not exercised live in the build environment (no key was available). The offline tutor is the default.
- Score estimates are model-based approximations calibrated by assumption (≈ 75% accuracy on Medium ≈ 157), not ETS's proprietary scaling.
- Generated questions are GRE-style; wording is templated, so very heavy users will recognise structures (numbers and variants change).
- Geometry figures are drawn accurately; the GRE's own figures are "not necessarily to scale", which the app notes where relevant.
