# GRE Quant Mastery — Implementation Roadmap

Legend: `[ ]` todo · `[~]` in progress · `[x]` implemented **and tested**

## Milestone 1 — Foundation
- [x] Project scaffold, config, design system (dark default + light theme; validated chart palette)
- [x] Curriculum taxonomy (6 categories, 43 units)
- [x] Core types, seeded RNG, exact fraction math
- [x] Generators: arithmetic (34), algebra (28), word problems (14), geometry (23, SVG diagrams), data (23, DI charts), strategy & multi-concept (15)
- [x] Bank: 1,265 validated questions + unlimited variants (`tests/bank.test.ts`)
- [x] Grading: QC, MCQ, multi-select, numeric incl. fractions (`tests/engine.test.ts`)
- [x] Persistence: Dexie store, autosave, recovery, export/import (`tests/store.test.ts`, E2E)
- [x] App shell + 13 screens; question player; explanations with distractor diagnosis
- [x] Dashboard

## Milestone 2 — Learning intelligence
- [x] Transparent mastery model with multi-difficulty evidence caps
- [x] Elo adaptive difficulty; speed/accuracy quadrants
- [x] Wrong Answer Lab + SRS (immediate / later today / 1 d / 3 d / 7 d, lapse acceleration, concept variants)
- [x] Error classification (auto-suggested + user tags)
- [x] Practice (all filters, timed/untimed, immediate/delayed, hints, skip, save, flag, report)
- [x] Analytics (overview, topics, time, errors, progress, day history)
- [x] Diagnostic exam

## Milestone 3 — Exam + game layer
- [x] Full simulation (section-adaptive, navigation, mark, review screen, calculator, 8 forms, results)
- [x] Score estimation (Rasch, labelled approximate)
- [x] Learn: 43 lessons + inline practice + mastery checks (`tests/content.test.ts`)
- [x] Daily challenge, Speed training, QC Arena, Boss challenges
- [x] XP, 10 levels, 30 achievements, streaks, daily objectives
- [x] Adaptive 30-day plan (auto-ticking blocks)
- [x] AI tutor (offline engine + optional Claude server endpoint); verified AI question generation (two-call check)
- [x] Calculator (order of operations, memory, √, %, Transfer Display) + formula reference with bookmarks

## Milestone 4 — Polish & QA
- [x] Responsive/mobile layout (no horizontal overflow; slide-out menu)
- [x] E2E: every route + core flows, 47 checks, zero console errors (`scripts/e2e.mjs`)
- [x] Manual math audit of 40 sampled questions (found & fixed a Pythagorean-triple scaling bug)
- [x] Independent-recomputation tests (`tests/independent.test.ts`)
- [x] README, PROJECT_STATUS.md

## Milestone 5 — Extensions
- [x] Score calibration from official POWERPREP results (shrunken offset, capped ±12)
- [x] Timing-strategy analytics (time sinks, pacing by section, over-cap misses)
- [x] Shared-chart data-interpretation sets (bar/table/line/pie × 3 questions; one per mock section 2)
- [x] 12 Expert multi-concept generators with varied wording (brute-force verified)
- [x] Mental-math drills (7 types, 60-second rounds)
- [x] Installable PWA + offline (service worker, manifest, icons)
- [x] Simple sign-in + cross-device sync (Worker + D1, client-side merge)
- [x] Friends leaderboard (friend codes, opt-in sharing, today/7-day)
- [x] Bundle splitting + axe-core accessibility audit (0 violations)

## Possible future work
- [ ] Live verification of the Claude endpoints with an API key
- [ ] Tombstones for deletions in sync (bookmarks, official scores)
- [ ] Optional passphrase change / recovery codes
