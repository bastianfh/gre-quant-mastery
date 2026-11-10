import type { Attempt, CategoryId, DailyLog, ErrorType, ExamResult, Format, SrsItem } from '../engine/types';
import { computeMastery, type MasteryResult } from '../engine/mastery';
import { estimateScore, type ScoreEstimate } from '../engine/scoring';
import { CATEGORIES, MAIN_CATEGORIES, UNITS } from '../content/curriculum';
import type { QStat } from '../engine/selection';
import { dayKey, streaks } from '../engine/gamification';
import { isDue } from '../engine/srs';

export interface Derived {
  unitMastery: Record<string, MasteryResult>;
  categoryMastery: Record<CategoryId, MasteryResult>;
  qstats: Map<string, QStat>;
  totals: { n: number; correct: number; incorrect: number; skipped: number; accuracy: number; avgTimeSec: number; reviewTimeSec: number };
  estimate: ScoreEstimate;
  coverage: number;
  weakUnits: { unit: string; score: number; n: number }[];
  errors: { type: ErrorType; count: number }[];
  errorsByUnit: { unit: string; count: number }[];
  formatStats: Record<Format | 'di', { n: number; correct: number; avgTimeSec: number }>;
  levelStats: Record<number, { n: number; correct: number }>;
  daily: { date: string; n: number; correct: number; accuracy: number; avgTimeSec: number; est: number | null }[];
  weekly: { week: string; n: number; accuracy: number }[];
  streak: ReturnType<typeof streaks>;
  due: SrsItem[];
  timeLimitStats: { limit: number; n: number; correct: number }[];
}

interface Src { attempts: Attempt[]; exams: ExamResult[]; srs: Record<string, SrsItem>; daily: Record<string, DailyLog>; version: number }
let cacheKey = '', cache: Derived | null = null;

export function computeDerived(s: Src, now = Date.now()): Derived {
  const k = `${s.version}|${s.attempts.length}|${s.exams.length}|${Object.keys(s.srs).length}|${Math.floor(now / 60000)}`;
  if (k === cacheKey && cache) return cache;
  const at = s.attempts;
  const byUnit = new Map<string, Attempt[]>(), byCat = new Map<string, Attempt[]>();
  const qstats = new Map<string, QStat>();
  for (const a of at) {
    if (!byUnit.has(a.unit)) byUnit.set(a.unit, []);
    byUnit.get(a.unit)!.push(a);
    if (!byCat.has(a.category)) byCat.set(a.category, []);
    byCat.get(a.category)!.push(a);
    if (!a.skipped) {
      const st = qstats.get(a.qid) ?? { n: 0, correct: 0, last: 0, lastCorrect: false };
      st.n++; if (a.correct) st.correct++; st.last = a.ts; st.lastCorrect = a.correct;
      qstats.set(a.qid, st);
    }
  }
  const unitMastery: Record<string, MasteryResult> = {};
  for (const u of UNITS) unitMastery[u.id] = computeMastery(byUnit.get(u.id) ?? [], now);
  const categoryMastery = {} as Record<CategoryId, MasteryResult>;
  for (const c of CATEGORIES) {
    const m = computeMastery(byCat.get(c.id) ?? [], now);
    // a category cannot be "mastered" while any of its units is untouched
    const untouched = UNITS.filter((u) => u.category === c.id && !(byUnit.get(u.id)?.length)).length;
    if (untouched && m.score > 89) { m.score = 89; m.cap = 89; m.capReason = `${untouched} unit(s) in this category have no attempts yet.`; m.band = 'strong'; }
    categoryMastery[c.id] = m;
  }
  const answered = at.filter((a) => !a.skipped);
  const correct = answered.filter((a) => a.correct).length;
  const reviewTimeSec = at.filter((a) => a.isReview).reduce((x, a) => x + a.timeMs / 1000, 0);
  const mainUnits = UNITS.filter((u) => MAIN_CATEGORIES.includes(u.category));
  const coverage = mainUnits.filter((u) => (byUnit.get(u.id)?.length ?? 0) >= 3).length / mainUnits.length;
  const estimate = estimateScore(at, s.exams, coverage, now);

  const weakUnits = UNITS.map((u) => ({ unit: u.id, score: unitMastery[u.id].score, n: unitMastery[u.id].n }))
    .filter((x) => x.n >= 3).sort((a, b) => a.score - b.score);

  const errCount = new Map<ErrorType, number>(), errUnit = new Map<string, number>();
  for (const a of answered) if (!a.correct) {
    const t = a.errorType ?? a.autoErrorType ?? 'concept';
    errCount.set(t, (errCount.get(t) ?? 0) + 1);
    errUnit.set(a.unit, (errUnit.get(a.unit) ?? 0) + 1);
  }
  const fs = {} as Derived['formatStats'];
  for (const f of ['qc', 'mcq', 'multi', 'numeric', 'di'] as const) {
    const xs = answered.filter((a) => (f === 'di' ? a.di : a.format === f && !a.di));
    fs[f] = { n: xs.length, correct: xs.filter((a) => a.correct).length, avgTimeSec: xs.length ? xs.reduce((x, a) => x + a.timeMs, 0) / xs.length / 1000 : 0 };
  }
  const levelStats: Derived['levelStats'] = {};
  for (const l of [1, 2, 3, 4, 5]) { const xs = answered.filter((a) => a.level === l); levelStats[l] = { n: xs.length, correct: xs.filter((a) => a.correct).length }; }

  // per-day history, including the estimated score as it stood at the end of each day
  const days = new Map<string, Attempt[]>();
  for (const a of answered) { const d = dayKey(a.ts); if (!days.has(d)) days.set(d, []); days.get(d)!.push(a); }
  const dayKeys = [...days.keys()].sort();
  const daily = dayKeys.map((d) => {
    const xs = days.get(d)!;
    const end = xs[xs.length - 1].ts;
    const upto = at.filter((a) => a.ts <= end);
    const ex = s.exams.filter((e) => e.finishedAt <= end);
    const est = estimateScore(upto, ex, coverage, end).score;
    return { date: d, n: xs.length, correct: xs.filter((a) => a.correct).length, accuracy: xs.filter((a) => a.correct).length / xs.length, avgTimeSec: xs.reduce((x, a) => x + a.timeMs, 0) / xs.length / 1000, est };
  });
  const weeksMap = new Map<string, Attempt[]>();
  for (const a of answered) {
    const d = new Date(a.ts); const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    const wk = dayKey(monday);
    if (!weeksMap.has(wk)) weeksMap.set(wk, []);
    weeksMap.get(wk)!.push(a);
  }
  const weekly = [...weeksMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([week, xs]) => ({ week, n: xs.length, accuracy: xs.filter((a) => a.correct).length / xs.length }));
  const limits = [30, 45, 60, 90, 120];
  const timeLimitStats = limits.map((limit) => { const xs = answered.filter((a) => a.timeLimitSec === limit); return { limit, n: xs.length, correct: xs.filter((a) => a.correct).length }; });

  cache = {
    unitMastery, categoryMastery, qstats,
    totals: { n: answered.length, correct, incorrect: answered.length - correct, skipped: at.length - answered.length, accuracy: answered.length ? correct / answered.length : 0, avgTimeSec: answered.length ? answered.reduce((x, a) => x + a.timeMs, 0) / answered.length / 1000 : 0, reviewTimeSec },
    estimate, coverage, weakUnits,
    errors: [...errCount.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    errorsByUnit: [...errUnit.entries()].map(([unit, count]) => ({ unit, count })).sort((a, b) => b.count - a.count),
    formatStats: fs, levelStats, daily, weekly,
    streak: streaks(Object.values(s.daily)),
    due: Object.values(s.srs).filter((i) => isDue(i, now)).sort((a, b) => a.due - b.due),
    timeLimitStats,
  };
  cacheKey = k;
  return cache;
}
