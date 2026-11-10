# PROJECT_STATUS — GRE Quant Mastery

_Resume point for development. Keep this current at each milestone._

## Current state
- **Engine complete & tested** (`npm test`):
  - 137 parametric generators → fixed bank of 1,155 validated questions (`src/engine/bank.ts`), unlimited variants.
  - QC engine (`generators/qc.ts`) determines relationships by exhaustive edge-case testing with explicit boundary samples; (D) answers carry concrete witnesses.
  - Grading, mastery (evidence-capped), Elo adaptivity, SRS, Rasch scoring, XP/levels/achievements/objectives, 30-day plan, exam-form builder, calculator.
  - Persistence: Dexie/IndexedDB store with write-through, export/import, snapshots (`src/store`).
- **UI:** not started yet (next milestone).

## Next steps
1. App shell (HashRouter, sidebar nav, dark theme), Math/Diagram renderers, QuestionPlayer.
2. Pages: Dashboard, Learn (+ lesson content), Practice, Daily, Speed, QC Arena, Boss, Wrong Answer Lab, Mock/Diagnostic, Analytics, Formulas, Settings.
3. Server (`server/index.mjs`) for static hosting + optional Claude tutor/generator.
4. Playwright E2E, mobile check, README.

## Known issues
- None open in the engine.
