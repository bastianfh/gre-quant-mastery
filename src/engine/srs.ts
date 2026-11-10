import type { ErrorType, SrsItem } from './types';

const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
/** Sentinel due date for graduated items (JSON-safe, unlike Infinity). */
export const NEVER = 8.64e15;
/** Stage → interval before the next review. Stage 0 = immediate (end of session), 1 = later same day, 2 = 1 day, 3 = 3 days, 4 = 7 days. */
export const SRS_INTERVALS = [5 * MIN, 4 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY];
export const SRS_STAGE_NAMES = ['Immediate', 'Later today', 'Tomorrow', 'In 3 days', 'In 7 days', 'Graduated'];

/** Repeated lapses shrink intervals so recurring mistakes come back more often. */
export const lapseFactor = (lapses: number) => (lapses >= 3 ? 0.35 : lapses === 2 ? 0.5 : lapses === 1 ? 0.75 : 1);

export function onMiss(existing: SrsItem | undefined, q: { qid: string; generatorId: string; unit: string }, now: number, errorType?: ErrorType): SrsItem {
  if (!existing) {
    return { qid: q.qid, generatorId: q.generatorId, unit: q.unit, stage: 0, due: now + SRS_INTERVALS[0], lapses: 0, missCount: 1, lastErrorType: errorType, createdAt: now, graduated: false };
  }
  const lapses = existing.lapses + 1;
  return { ...existing, stage: 0, due: now + SRS_INTERVALS[0], lapses, missCount: existing.missCount + 1, lastErrorType: errorType ?? existing.lastErrorType, graduated: false, lastReviewed: now };
}

export function onReview(item: SrsItem, correct: boolean, now: number, errorType?: ErrorType): SrsItem {
  if (!correct) {
    const lapses = item.lapses + 1;
    // back to "later today", with intervals shortened by the lapse factor
    return { ...item, stage: 1, lapses, missCount: item.missCount + 1, due: now + SRS_INTERVALS[1] * lapseFactor(lapses), lastErrorType: errorType ?? item.lastErrorType, lastReviewed: now, graduated: false };
  }
  const stage = item.stage + 1;
  if (stage >= SRS_INTERVALS.length) return { ...item, stage, graduated: true, lastReviewed: now, due: NEVER };
  return { ...item, stage, due: now + SRS_INTERVALS[stage] * lapseFactor(item.lapses), lastReviewed: now };
}

export const isDue = (i: SrsItem, now: number) => !i.graduated && i.due <= now;

/**
 * Review the identical question at early stages (fix that exact error), then switch to
 * concept variants (same generator, new numbers/structure) to test the underlying idea.
 */
export const reviewUsesVariant = (i: SrsItem) => i.stage >= 2 || i.lapses >= 1;
