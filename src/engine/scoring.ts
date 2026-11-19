import type { Attempt, ExamResult, Level } from './types';

/** Rasch difficulty per level (logits). */
export const LEVEL_B: Record<Level, number> = { 1: -2.2, 2: -1.1, 3: 0, 4: 1.1, 5: 2.2 };
/** Linear map from ability (logits) to the 130–170 scale. Calibrated so ~75% Medium accuracy ≈ 157 (≈ GRE mean). */
export const thetaToScore = (t: number) => Math.max(130, Math.min(170, Math.round(150 + 6.5 * t)));

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** MAP ability estimate (prior N(0, σ²)) with optional per-item weights. Returns θ and standard error. */
export function estimateTheta(items: { b: number; y: number; w?: number }[], priorSd = 1.5): { theta: number; se: number } {
  let t = 0;
  for (let it = 0; it < 50; it++) {
    let g = -t / (priorSd * priorSd), h = -1 / (priorSd * priorSd);
    for (const { b, y, w = 1 } of items) {
      const p = sigmoid(t - b);
      g += w * (y - p);
      h -= w * p * (1 - p);
    }
    const step = g / h;
    t -= Math.max(-1, Math.min(1, step));
    if (Math.abs(step) < 1e-6) break;
  }
  let info = 1 / (priorSd * priorSd);
  for (const { b, w = 1 } of items) { const p = sigmoid(t - b); info += w * p * (1 - p); }
  return { theta: t, se: 1 / Math.sqrt(info) };
}

/** Scaled-score estimate for a simulated exam. Explicitly an approximation — not ETS's algorithm. */
export function scoreExam(items: { level: Level; correct: boolean }[]): { scaled: number; range: [number, number]; theta: number } {
  const { theta, se } = estimateTheta(items.map((i) => ({ b: LEVEL_B[i.level], y: i.correct ? 1 : 0 })), 1.6);
  const scaled = thetaToScore(theta);
  const half = Math.max(2, Math.min(6, Math.round(6.5 * se * 0.8)));
  return { scaled, theta, range: [Math.max(130, scaled - half), Math.min(170, scaled + half)] };
}

export interface ScoreEstimate {
  score: number | null;
  range: [number, number] | null;
  practiceScore: number | null;
  mockScore: number | null;
  confidence: 'none' | 'low' | 'medium' | 'high';
  components: { label: string; value: string }[];
}

/**
 * Overall estimate blends:
 *  - practice ability (recency-weighted Rasch over the last 250 attempts; slow answers count as partial credit),
 *  - timed / exam-mode performance,
 *  - full simulations (weight grows with the number of mocks),
 *  - a coverage penalty when major topics have little data.
 */
/** An official practice-test result (e.g. ETS POWERPREP), with the app's own estimate at the moment it was entered. */
export interface OfficialScore { id: string; ts: number; date: string; score: number; source: string; modelScore: number | null }

/**
 * Calibration offset from official results: mean of (official − model estimate at that time) over the last 3,
 * shrunk toward 0 when there are few results (n/(n+1)) and capped at ±12.
 */
export function calibrationOffset(official: OfficialScore[]): { offset: number; n: number } {
  const usable = official.filter((o) => o.modelScore !== null).slice(-3);
  if (!usable.length) return { offset: 0, n: 0 };
  const meanResidual = usable.reduce((a, o) => a + (o.score - (o.modelScore as number)), 0) / usable.length;
  const shrink = usable.length / (usable.length + 1);
  return { offset: Math.max(-12, Math.min(12, Math.round(meanResidual * shrink))), n: usable.length };
}

/** Score estimate, calibrated by any official practice-test results entered on or before `now`. */
export function estimateScore(attempts: Attempt[], exams: ExamResult[], coverage: number, now = Date.now(), official: OfficialScore[] = []): ScoreEstimate {
  const model = modelEstimate(attempts, exams, coverage, now);
  const prior = official.filter((o) => o.ts <= now).sort((a, b) => a.ts - b.ts);
  if (!prior.length) return model;
  const latest = prior[prior.length - 1];
  const components = [...model.components, { label: `Latest official test (${latest.source}, ${latest.date})`, value: String(latest.score) }];
  if (model.score === null) {
    // no practice data yet: the official result is the best available estimate
    return { ...model, score: latest.score, range: [Math.max(130, latest.score - 4), Math.min(170, latest.score + 4)], confidence: 'low', components };
  }
  const { offset, n } = calibrationOffset(prior);
  if (!offset) return { ...model, components: [...components, { label: 'Calibration', value: n ? 'model already matches your official results' : 'enter official results to calibrate' }] };
  const score = Math.max(130, Math.min(170, model.score + offset));
  const [lo, hi] = model.range!;
  const half = Math.max(2, Math.round((hi - lo) / 2) - (n >= 2 ? 1 : 0));
  return {
    ...model, score, range: [Math.max(130, score - half), Math.min(170, score + half)],
    components: [...components, { label: `Calibration from ${n} official result${n > 1 ? 's' : ''}`, value: `${offset > 0 ? '+' : ''}${offset}` }],
  };
}

function modelEstimate(attempts: Attempt[], exams: ExamResult[], coverage: number, now = Date.now()): ScoreEstimate {
  const recent = attempts.filter((a) => !a.skipped).slice(-250);
  const components: ScoreEstimate['components'] = [];
  if (recent.length < 10 && exams.length === 0) return { score: null, range: null, practiceScore: null, mockScore: null, confidence: 'none', components: [{ label: 'Data', value: `${recent.length}/10 questions needed` }] };
  let practiceScore: number | null = null, se = 1;
  if (recent.length >= 10) {
    const items = recent.map((a) => {
      const ratio = a.timeMs / 1000 / Math.max(10, a.targetSec);
      const y = a.correct ? (ratio > 2 ? 0.7 : ratio > 1.5 ? 0.85 : 1) * (a.hintsUsed ? Math.max(0.5, 1 - 0.25 * a.hintsUsed) : 1) : 0;
      const age = (now - a.ts) / 86400000;
      const w = 0.5 ** (age / 14) * (a.mode === 'mock' || a.mode === 'diagnostic' ? 1.5 : a.timeLimitSec ? 1.2 : 1);
      return { b: LEVEL_B[a.level], y, w };
    });
    const est = estimateTheta(items, 1.5);
    se = est.se;
    practiceScore = thetaToScore(est.theta);
    components.push({ label: 'Practice ability (recency-weighted)', value: String(practiceScore) });
    const timed = recent.filter((a) => a.timeLimitSec || a.mode === 'mock' || a.mode === 'diagnostic');
    if (timed.length >= 5) components.push({ label: 'Timed accuracy', value: `${Math.round((timed.filter((a) => a.correct).length / timed.length) * 100)}% on ${timed.length} timed items` });
  }
  const mocks = exams.slice(-3);
  const mockScore = mocks.length ? Math.round(mocks.reduce((s, e) => s + e.scaled, 0) / mocks.length) : null;
  if (mockScore !== null) components.push({ label: `Simulation average (last ${mocks.length})`, value: String(mockScore) });
  let score: number;
  if (practiceScore !== null && mockScore !== null) {
    const wm = Math.min(0.65, 0.35 + 0.1 * mocks.length);
    score = Math.round(wm * mockScore + (1 - wm) * practiceScore);
  } else score = (practiceScore ?? mockScore)!;
  // coverage penalty: unknown topics are risky on a mixed exam
  const penalty = coverage < 0.5 ? Math.round((0.5 - coverage) * 8) : 0;
  if (penalty) components.push({ label: 'Topic coverage penalty', value: `−${penalty} (only ${Math.round(coverage * 100)}% of topics practised)` });
  score = Math.max(130, Math.min(170, score - penalty));
  const n = recent.length + 27 * exams.length;
  let half = Math.round(6.5 * se * 1.1) + (coverage < 0.6 ? 2 : 0);
  half = Math.max(2, Math.min(10, half));
  const confidence = n >= 200 && exams.length >= 1 ? 'high' : n >= 60 ? 'medium' : 'low';
  return { score, range: [Math.max(130, score - half), Math.min(170, score + half)], practiceScore, mockScore, confidence, components };
}
