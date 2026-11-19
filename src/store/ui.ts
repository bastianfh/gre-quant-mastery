// Presentation-only UI state (never persisted, never touches study data).
import { useEffect } from 'react';
import { create } from 'zustand';

/** How many question players (practice sessions / mock exams) are mounted right now. */
export const useUi = create<{ answering: number }>(() => ({ answering: 0 }));

/** Call from a question player: while mounted, the right rail shows formulas + scratchpad. */
export function useAnsweringMode() {
  useEffect(() => {
    useUi.setState((s) => ({ answering: s.answering + 1 }));
    return () => useUi.setState((s) => ({ answering: Math.max(0, s.answering - 1) }));
  }, []);
}
