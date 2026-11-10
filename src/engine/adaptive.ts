import type { Attempt, Level } from './types';

/** Elo-style ability ratings. 1000 ≈ comfortable at Medium (level 3). */
export const LEVEL_RATING: Record<Level, number> = { 1: 700, 2: 850, 3: 1000, 4: 1150, 5: 1300 };
export const DEFAULT_RATING = 950;

export const expected = (rating: number, level: Level) => 1 / (1 + 10 ** ((LEVEL_RATING[level] - rating) / 400));

/** Outcome score: correct & on time = 1; correct but slow = 0.8; wrong = 0. */
export const outcome = (a: Pick<Attempt, 'correct' | 'timeMs' | 'targetSec' | 'hintsUsed'>) => {
  if (!a.correct) return 0;
  const ratio = a.timeMs / 1000 / Math.max(10, a.targetSec);
  let s = ratio > 1.6 ? 0.8 : 1;
  if (a.hintsUsed) s *= Math.max(0.5, 1 - 0.2 * a.hintsUsed);
  return s;
};

export function updateRating(r: number, n: number, a: Pick<Attempt, 'correct' | 'timeMs' | 'targetSec' | 'hintsUsed' | 'level'>): number {
  const K = n < 10 ? 48 : n < 30 ? 32 : 20;
  return r + K * (outcome(a) - expected(r, a.level));
}

/** Replay attempts to compute ratings per unit, per category and global. */
export function computeRatings(attempts: Attempt[]): Record<string, number> {
  const r: Record<string, number> = {};
  const n: Record<string, number> = {};
  for (const a of attempts) {
    if (a.skipped) continue;
    for (const k of [a.unit, `cat:${a.category}`, '_global']) {
      const cur = r[k] ?? DEFAULT_RATING;
      r[k] = updateRating(cur, n[k] ?? 0, a);
      n[k] = (n[k] ?? 0) + 1;
    }
  }
  return r;
}

/** Level whose expected success rate is closest to the target (default 70% — the "desirable difficulty" zone). */
export function targetLevel(rating: number, targetP = 0.7): Level {
  let best: Level = 3, bestD = Infinity;
  for (const l of [1, 2, 3, 4, 5] as Level[]) {
    const d = Math.abs(expected(rating, l) - targetP);
    if (d < bestD) { bestD = d; best = l; }
  }
  return best;
}

/** Diagnose speed/accuracy quadrant from attempts. */
export type Quadrant = 'fast-accurate' | 'slow-accurate' | 'fast-inaccurate' | 'slow-inaccurate' | 'insufficient';
export function quadrant(attempts: Attempt[]): { q: Quadrant; accuracy: number; timeRatio: number } {
  const as = attempts.filter((a) => !a.skipped);
  if (as.length < 5) return { q: 'insufficient', accuracy: 0, timeRatio: 0 };
  const acc = as.filter((a) => a.correct).length / as.length;
  const tr = as.reduce((s, a) => s + a.timeMs / 1000 / Math.max(10, a.timeLimitSec ?? a.targetSec), 0) / as.length;
  const fast = tr <= 1, accurate = acc >= 0.75;
  return { q: fast ? (accurate ? 'fast-accurate' : 'fast-inaccurate') : accurate ? 'slow-accurate' : 'slow-inaccurate', accuracy: acc, timeRatio: tr };
}

export const QUADRANT_ADVICE: Record<Quadrant, { title: string; advice: string }> = {
  'fast-accurate': { title: 'Fast and accurate', advice: 'Excellent exam profile. Push difficulty up and keep timed mixed sets in rotation so the skill stays automatic.' },
  'slow-accurate': { title: 'Accurate but slow', advice: 'Your reasoning is sound; the cost is time. Practise recognising the approach in the first 15 seconds, estimate when choices are far apart, and backsolve when choices are numbers.' },
  'fast-inaccurate': { title: 'Fast but inaccurate', advice: 'You are rushing. Re-read what the question asks, write the equation before computing, and use the last 10 seconds to sanity-check units and signs.' },
  'slow-inaccurate': { title: 'Slow and inaccurate', advice: 'Concept gaps are driving both problems. Return to the Learn lessons for these topics, then do untimed practice before adding time pressure again.' },
  insufficient: { title: 'Not enough data', advice: 'Complete at least 5 timed questions to see your speed/accuracy profile.' },
};
