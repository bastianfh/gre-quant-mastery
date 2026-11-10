# PROJECT_STATUS — GRE Quant Mastery

## State: feature-complete, tested
- Unit tests: **70/70** (`npm test`) — bank validation, engine, persistence, lesson content, independent recomputation.
- End-to-end: **47/47** (`npm run e2e` against `npm start`) — every route, practice/tutor/calculator, persistence across reload, SRS review, daily/speed/QC/boss, full two-section diagnostic, interrupted-exam recovery, lessons, formulas, theming, mobile layout, zero console errors.
- Bank: 1,158 questions from 137 generators; unlimited variants.

## How to resume
1. `npm install && npm run build && npm start` → http://localhost:8787
2. `npm test`; with the server running, `npm run e2e`.
3. Generators live in `src/engine/generators/*`; add a generator to the exported array and the bank/validators pick it up automatically.

## Known issues / limitations
- Claude endpoints (`server/index.mjs`) are untested live (no API key in the build environment); offline tutor is default.
- No cloud sync (export/import instead).

## Recent fixes
- Pythagorean-triple scaling bug in 4 geometry generators (per-side multipliers) — fixed and covered by `tests/independent.test.ts`.
- Segmented controls wrapped in `<label>` mislabeled buttons for assistive tech — replaced with `role="group"` containers.
- First SRS review moved to "immediately" (was +5 min) per spec.
