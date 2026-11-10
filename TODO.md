# GRE Quant Mastery — Implementation Roadmap

Legend: `[ ]` todo · `[~]` in progress · `[x]` implemented **and tested**

## Architecture decisions
- **Frontend:** Vite + React 18 + TypeScript, react-router (HashRouter), zustand state.
- **Persistence:** local-first IndexedDB via Dexie (write-through from in-memory store), JSON export/import, session-recovery snapshots.
- **Question engine:** parametric generators (code computes every answer) → deterministic seeded bank of 1,000+ questions with stable IDs; unlimited variations with fresh seeds; automated validator over the whole bank.
- **Math:** KaTeX for notation, custom SVG for geometry diagrams and data charts (rendered from the same data the answer is computed from).
- **Charts:** Recharts for analytics.
- **AI layer:** optional Node server (`server/index.mjs`) proxies Claude when `ANTHROPIC_API_KEY` is set (key never reaches the browser). Offline tutor (3-level hints, concept summaries, similar-question generation) always works.
- **Tests:** Vitest (bank validation, grading, mastery, SRS, XP, achievements, calculator, scoring, persistence with fake-indexeddb) + Playwright smoke/E2E script.

## Milestone 1 — Foundation (Priority 1)
- [ ] Project scaffold, config, design system (dark terminal aesthetic)
- [ ] Curriculum taxonomy (6 categories, all subtopics)
- [ ] Core types, seeded RNG, exact fraction math helpers
- [ ] Generators: Arithmetic
- [ ] Generators: Algebra
- [ ] Generators: Word problems
- [ ] Generators: Geometry (+ SVG diagrams)
- [ ] Generators: Data analysis (+ data-interpretation charts)
- [ ] Generators: Strategy / advanced (QC traps, multi-concept)
- [ ] Bank builder (≥1,000 validated, balanced) + validator test
- [ ] Answer grading (QC, MCQ, multi-select, numeric incl. fractions)
- [ ] Persistence layer (Dexie) + store + autosave + recovery
- [ ] App shell + navigation (12 sections)
- [ ] Question player component (exam-like) + explanations + distractor diagnosis
- [ ] Dashboard

## Milestone 2 — Learning intelligence (Priority 2)
- [ ] Mastery model (transparent, multi-difficulty gating)
- [ ] Elo-style adaptive difficulty selection
- [ ] Wrong Answer Lab + spaced repetition (0m / same day / 1d / 3d / 7d, lapse acceleration, concept-variant reviews)
- [ ] Error classification (auto + user tags)
- [ ] Practice mode (filters, timed/untimed, immediate/delayed feedback, hints, skip, save, flag, report)
- [ ] Analytics (overall, topic, time, errors, progress history)
- [ ] Diagnostic exam

## Milestone 3 — Exam + game layer (Priority 3)
- [ ] Full GRE simulation (12q/21m + 15q/26m, section-adaptive, nav, mark, review screen, calculator, multiple forms)
- [ ] Score estimation model (Rasch-based, labeled as approximate)
- [ ] Learn mode lessons (all units) + mastery checks
- [ ] Daily challenge (personalized, streak, history)
- [ ] Speed training (30/45/60/90/120 s, quadrant diagnosis)
- [ ] QC Arena
- [ ] Boss challenges (multi-concept, ranks, rewards)
- [ ] XP, levels, achievements, streaks, daily objectives
- [ ] Personalized 30-day plan (adaptive daily schedule)
- [ ] AI tutor (offline + optional Claude), verified AI question generation
- [ ] Calculator + formula reference with bookmarks

## Milestone 4 — Polish & QA (Priority 4)
- [ ] Responsive/mobile layout pass
- [ ] E2E browser test of every route, no console errors
- [ ] Mathematical sample audit of question bank
- [ ] README, PROJECT_STATUS.md, final report
