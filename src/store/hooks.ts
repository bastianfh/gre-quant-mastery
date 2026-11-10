import { useMemo } from 'react';
import { useStore } from './store';
import { computeDerived } from './derived';
import type { PickCtx } from '../engine/selection';

export function useDerived() {
  const s = useStore();
  return computeDerived(s);
}

export function usePickCtx(): PickCtx {
  const s = useStore();
  const d = computeDerived(s);
  return useMemo(() => ({
    qstats: d.qstats,
    ratings: s.profile.ratings,
    mastery: Object.fromEntries(Object.entries(d.unitMastery).filter(([, m]) => m.n > 0).map(([k, m]) => [k, m.score])),
    recent: s.attempts.slice(-80).map((a) => a.qid),
    saved: s.profile.bookmarks,
    flagged: s.profile.flagged,
  }), [d, s.profile.ratings, s.attempts, s.profile.bookmarks, s.profile.flagged]);
}
