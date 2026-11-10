import type { Attempt, Level } from './types';

export type Band = 'critical' | 'developing' | 'intermediate' | 'strong' | 'mastered' | 'unrated';
export const BAND_LABEL: Record<Band, string> = {
  critical: 'Critical weakness', developing: 'Developing', intermediate: 'Intermediate', strong: 'Strong', mastered: 'Mastered', unrated: 'Not started',
};
export const bandOf = (score: number, n: number): Band => {
  if (n === 0) return 'unrated';
  if (score < 40) return 'critical';
  if (score < 60) return 'developing';
  if (score < 75) return 'intermediate';
  if (score < 90) return 'strong';
  return 'mastered';
};

const LEVEL_W: Record<Level, number> = { 1: 0.6, 2: 0.8, 3: 1, 4: 1.25, 5: 1.5 };
const DAY = 86400000;

export interface MasteryResult {
  score: number;            // 0..100
  raw: number;              // uncapped weighted score
  band: Band;
  n: number;
  accuracy: number;         // simple accuracy (0..1)
  recentAccuracy: number;   // last 10
  avgTimeRatio: number;     // time / target
  avgTimeSec: number;
  byLevel: Record<Level, { n: number; correct: number }>;
  cap: number;
  capReason?: string;
  consistency: number;      // 0..1: 1 - stdev of daily accuracy
}

/** Credit for one attempt: correctness, discounted for slow answers and hints. */
export function attemptCredit(a: Attempt): number {
  if (!a.correct) return 0;
  const ratio = a.timeMs / 1000 / Math.max(10, a.targetSec);
  const time = ratio <= 1.25 ? 1 : ratio >= 2.5 ? 0.75 : 1 - ((ratio - 1.25) / 1.25) * 0.25;
  const hint = Math.max(0.4, 1 - 0.2 * a.hintsUsed);
  return time * hint;
}

/**
 * Transparent mastery model:
 *  1. Weighted credit: each attempt weighted by difficulty (harder counts more) and recency (half-life 21 days).
 *     Three pseudo-attempts at 30% credit act as a prior so a handful of answers cannot spike the score.
 *  2. Evidence caps: high bands require volume AND demonstrated accuracy at harder levels.
 */
export function computeMastery(attempts: Attempt[], now = Date.now()): MasteryResult {
  const as = attempts.filter((a) => !a.skipped);
  const byLevel = { 1: { n: 0, correct: 0 }, 2: { n: 0, correct: 0 }, 3: { n: 0, correct: 0 }, 4: { n: 0, correct: 0 }, 5: { n: 0, correct: 0 } } as MasteryResult['byLevel'];
  let wSum = 3, cSum = 0.9; // prior
  let tRatio = 0, tSec = 0;
  for (const a of as) {
    const age = Math.max(0, now - a.ts) / DAY;
    const w = LEVEL_W[a.level] * 0.5 ** (age / 21) * (a.isReview ? 1.1 : 1);
    // missing an easy question is a stronger negative signal than missing a hard one
    const wMiss = a.correct ? w : w * (a.level <= 2 ? 1.3 : a.level >= 4 ? 0.8 : 1);
    wSum += wMiss;
    cSum += wMiss * attemptCredit(a);
    byLevel[a.level].n++;
    if (a.correct) byLevel[a.level].correct++;
    tRatio += a.timeMs / 1000 / Math.max(10, a.targetSec);
    tSec += a.timeMs / 1000;
  }
  const n = as.length;
  const raw = (cSum / wSum) * 100;
  const correctAtOrAbove = (L: number) => ([1, 2, 3, 4, 5] as Level[]).filter((l) => l >= L).reduce((s, l) => s + byLevel[l].correct, 0);
  const nAtOrAbove = (L: number) => ([1, 2, 3, 4, 5] as Level[]).filter((l) => l >= L).reduce((s, l) => s + byLevel[l].n, 0);
  const accAtOrAbove = (L: number) => (nAtOrAbove(L) ? correctAtOrAbove(L) / nAtOrAbove(L) : 0);
  const recent = as.slice(-10);
  const recentAccuracy = recent.length ? recent.filter((a) => a.correct).length / recent.length : 0;

  let cap = 100, capReason: string | undefined;
  const setCap = (c: number, r: string) => { if (c < cap) { cap = c; capReason = r; } };
  if (n < 5) setCap(59, `Answer at least 5 questions to rate this topic above Developing (${n}/5).`);
  if (correctAtOrAbove(3) < 2) setCap(64, 'Answer at least 2 Medium-or-harder questions correctly to pass Intermediate.');
  if (correctAtOrAbove(4) < 2 || accAtOrAbove(4) < 0.6) setCap(82, 'Strong+ requires ≥2 correct Hard/Expert answers with ≥60% accuracy at that level.');
  if (n < 12) setCap(89, `Mastery requires at least 12 attempts (${n}/12).`);
  if (correctAtOrAbove(4) < 4 || accAtOrAbove(4) < 0.75) setCap(89, 'Mastery requires ≥4 correct Hard/Expert answers with ≥75% accuracy at that level.');
  if (recent.length >= 5 && recentAccuracy < 0.85) setCap(89, 'Mastery requires ≥85% accuracy on your last 10 attempts.');

  // consistency across days
  const days = new Map<string, { n: number; c: number }>();
  for (const a of as) {
    const d = new Date(a.ts).toDateString();
    const e = days.get(d) ?? { n: 0, c: 0 };
    e.n++; if (a.correct) e.c++;
    days.set(d, e);
  }
  const accs = [...days.values()].filter((d) => d.n >= 3).map((d) => d.c / d.n);
  let consistency = 1;
  if (accs.length >= 2) {
    const m = accs.reduce((x, y) => x + y, 0) / accs.length;
    consistency = Math.max(0, 1 - Math.sqrt(accs.reduce((s, x) => s + (x - m) ** 2, 0) / accs.length) * 2);
  }

  const score = n === 0 ? 0 : Math.round(Math.min(raw, cap));
  return {
    score, raw, band: bandOf(score, n), n,
    accuracy: n ? as.filter((a) => a.correct).length / n : 0,
    recentAccuracy, avgTimeRatio: n ? tRatio / n : 0, avgTimeSec: n ? tSec / n : 0,
    byLevel, cap, capReason, consistency,
  };
}
