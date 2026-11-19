import type { Attempt, DailyLog, ExamResult, Level, Mode, SessionResult } from './types';

// ---------- XP ----------
export const XP_BY_LEVEL: Record<Level, number> = { 1: 4, 2: 7, 3: 11, 4: 16, 5: 24 };

/**
 * XP for one answer. Harder questions pay more; easy questions far below the learner's level
 * pay little (prevents farming); hints reduce XP; correct reviews of past mistakes pay a bonus.
 */
export function xpForAttempt(a: Pick<Attempt, 'correct' | 'level' | 'hintsUsed' | 'isReview' | 'skipped'>, streak: number, targetLevel: Level): number {
  if (a.skipped) return 0;
  if (!a.correct) return 1; // effort credit
  let xp = XP_BY_LEVEL[a.level];
  const gap = targetLevel - a.level;
  if (gap >= 2) xp *= 0.3; else if (gap === 1) xp *= 0.7;
  xp *= Math.max(0.3, 1 - 0.3 * a.hintsUsed);
  if (a.isReview) xp *= 1.5;
  xp += Math.min(streak, 10); // consecutive-correct bonus
  return Math.max(1, Math.round(xp));
}

export const XP_EVENTS = {
  lesson: 40,
  masteryCheck: 60,
  dailyChallenge: 50,
  speedDrill: 25,
  boss: 80,
  mock: 150,
  diagnostic: 120,
  objective: 30,
} as const;

// ---------- Levels ----------
export const LEVELS = [
  { level: 1, name: 'Beginner', xp: 0 },
  { level: 2, name: 'Arithmetic Apprentice', xp: 300 },
  { level: 3, name: 'Algebra Specialist', xp: 900 },
  { level: 4, name: 'Quantitative Analyst', xp: 1800 },
  { level: 5, name: 'Advanced Problem Solver', xp: 3200 },
  { level: 6, name: 'GRE Contender', xp: 5200 },
  { level: 7, name: 'Quant Master', xp: 8000 },
  { level: 8, name: 'Elite Quant', xp: 11500 },
  { level: 9, name: 'GRE 165+', xp: 16000 },
  { level: 10, name: 'GRE 170 Candidate', xp: 22000 },
];
export function levelOf(xp: number) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) cur = l;
  const next = LEVELS.find((l) => l.xp > xp) ?? null;
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { ...cur, next, progress };
}

// ---------- Streaks ----------
export const dayKey = (ts: number | Date = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
};
export const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000);
};

/** A day counts toward the streak if at least 5 questions were answered. */
export const ACTIVE_DAY_MIN = 5;
export function streaks(logs: DailyLog[], today = dayKey()) {
  const active = new Set(logs.filter((l) => l.questions >= ACTIVE_DAY_MIN).map((l) => l.date));
  let current = 0;
  let d = active.has(today) ? today : addDays(today, -1); // streak survives until the day ends
  while (active.has(d)) { current++; d = addDays(d, -1); }
  const sorted = [...active].sort();
  let longest = 0, run = 0, prev: string | null = null;
  for (const k of sorted) {
    run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).filter((k) => active.has(k)).length;
  return { current, longest, last7, activeDays: active.size };
}

// ---------- Achievements ----------
export interface AchStats {
  attempts: Attempt[];
  exams: ExamResult[];
  sessions: SessionResult[];
  logs: DailyLog[];
  bestRun: number;
  streak: number;
  categoryMastery: Record<string, number>;
  lessonsCompleted: number;
  reviewsCorrect: number;
}
export interface Achievement { id: string; name: string; desc: string; icon: string; test: (s: AchStats) => boolean }

const doneMode = (s: AchStats, m: Mode) => s.sessions.some((x) => x.mode === m);
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first10', name: 'Warm-Up', desc: 'Answer 10 questions.', icon: 'play', test: (s) => s.attempts.length >= 10 },
  { id: 'first100', name: 'First 100 Questions', desc: 'Answer 100 questions.', icon: 'hash', test: (s) => s.attempts.length >= 100 },
  { id: 'q500', name: 'Volume Trader', desc: 'Answer 500 questions.', icon: 'layers', test: (s) => s.attempts.length >= 500 },
  { id: 'q1000', name: 'Thousand Club', desc: 'Answer 1,000 questions.', icon: 'award', test: (s) => s.attempts.length >= 1000 },
  { id: 'run10', name: '10 in a Row', desc: 'Answer 10 consecutive questions correctly.', icon: 'zap', test: (s) => s.bestRun >= 10 },
  { id: 'run25', name: 'Unbreakable', desc: 'Answer 25 consecutive questions correctly.', icon: 'shield', test: (s) => s.bestRun >= 25 },
  { id: 'perfect10', name: 'Perfect 10', desc: 'Finish a session of 10+ questions with 100% accuracy.', icon: 'target', test: (s) => s.sessions.some((x) => x.total >= 10 && x.correct === x.total) },
  { id: 'expert5', name: 'Expert Territory', desc: 'Answer 5 Expert-level questions correctly.', icon: 'mountain', test: (s) => s.attempts.filter((a) => a.level === 5 && a.correct).length >= 5 },
  { id: 'speed', name: 'Speed Demon', desc: '10 correct answers in speed drills at 45 seconds or less.', icon: 'gauge', test: (s) => s.attempts.filter((a) => a.mode === 'speed' && a.correct && (a.timeLimitSec ?? 999) <= 45).length >= 10 },
  { id: 'nomistakes', name: 'No Mistakes Today', desc: 'Answer at least 20 questions in a day without a miss.', icon: 'check-circle', test: (s) => s.logs.some((l) => l.questions >= 20 && l.correct === l.questions) },
  { id: 'streak3', name: 'Momentum', desc: 'Study 3 days in a row.', icon: 'flame', test: (s) => s.streak >= 3 },
  { id: 'streak7', name: 'Seven-Day Streak', desc: 'Study 7 days in a row.', icon: 'flame', test: (s) => s.streak >= 7 },
  { id: 'streak21', name: 'Habit Formed', desc: 'Study 21 days in a row.', icon: 'flame', test: (s) => s.streak >= 21 },
  { id: 'arith', name: 'Arithmetic Master', desc: 'Reach 90% mastery in Arithmetic.', icon: 'sigma', test: (s) => (s.categoryMastery.arithmetic ?? 0) >= 90 },
  { id: 'alg', name: 'Algebra Master', desc: 'Reach 90% mastery in Algebra.', icon: 'function', test: (s) => (s.categoryMastery.algebra ?? 0) >= 90 },
  { id: 'geo', name: 'Geometry Master', desc: 'Reach 90% mastery in Geometry.', icon: 'triangle', test: (s) => (s.categoryMastery.geometry ?? 0) >= 90 },
  { id: 'data', name: 'Data Analysis Master', desc: 'Reach 90% mastery in Data Analysis.', icon: 'bar-chart', test: (s) => (s.categoryMastery.data ?? 0) >= 90 },
  { id: 'word', name: 'Word Problem Master', desc: 'Reach 90% mastery in Word Problems.', icon: 'book', test: (s) => (s.categoryMastery.word ?? 0) >= 90 },
  { id: 'diag', name: 'Baseline Set', desc: 'Complete the diagnostic exam.', icon: 'compass', test: (s) => s.exams.some((e) => e.kind === 'diagnostic') },
  { id: 'mock1', name: 'Test Day Rehearsal', desc: 'Complete a full GRE simulation.', icon: 'clipboard', test: (s) => s.exams.some((e) => e.kind === 'mock') },
  { id: 'perfectsec', name: 'First Perfect Section', desc: 'Answer every question in a simulation section correctly.', icon: 'star', test: (s) => s.exams.some((e) => e.sections.some((x) => x.correct.length > 0 && x.correct.every(Boolean))) },
  { id: 'sim160', name: '160+ Simulation', desc: 'Score 160 or higher on a simulation.', icon: 'trending-up', test: (s) => s.exams.some((e) => e.scaled >= 160) },
  { id: 'sim165', name: '165+ Simulation', desc: 'Score 165 or higher on a simulation.', icon: 'trending-up', test: (s) => s.exams.some((e) => e.scaled >= 165) },
  { id: 'sim170', name: 'Perfect Scale', desc: 'Score 170 on a simulation.', icon: 'crown', test: (s) => s.exams.some((e) => e.scaled >= 170) },
  { id: 'review10', name: 'Error Hunter', desc: 'Correctly answer 10 spaced-repetition reviews.', icon: 'refresh', test: (s) => s.reviewsCorrect >= 10 },
  { id: 'review50', name: 'Mistake Eliminator', desc: 'Correctly answer 50 spaced-repetition reviews.', icon: 'refresh', test: (s) => s.reviewsCorrect >= 50 },
  { id: 'boss', name: 'Boss Slayer', desc: 'Complete a Boss Challenge.', icon: 'swords', test: (s) => doneMode(s, 'boss') },
  { id: 'daily', name: 'Daily Grinder', desc: 'Complete a Daily Challenge.', icon: 'calendar', test: (s) => doneMode(s, 'daily') },
  { id: 'lessons5', name: 'Scholar', desc: 'Complete 5 lessons.', icon: 'graduation', test: (s) => s.lessonsCompleted >= 5 },
  { id: 'mental25', name: 'Human Calculator', desc: 'Get 25 correct in one 60-second mental-math round.', icon: 'zap', test: (s) => s.sessions.some((x) => x.mode === 'drill' && (x.score ?? 0) >= 25) },
  { id: 'qc50', name: 'Comparison Specialist', desc: 'Answer 50 Quantitative Comparison questions correctly.', icon: 'scale', test: (s) => s.attempts.filter((a) => a.format === 'qc' && a.correct).length >= 50 },
];

// ---------- Daily objectives ----------
export interface Objective { id: string; text: string; progress: number; goal: number; done: boolean }
export function dailyObjectives(log: DailyLog | undefined, goalQuestions: number, weakUnitName: string | null, weakUnitDone: number): Objective[] {
  const l = log ?? { questions: 0, correct: 0, reviews: 0, speedDrills: 0 } as DailyLog;
  const acc = l.questions ? l.correct / l.questions : 0;
  const objs: Objective[] = [
    { id: 'questions', text: `Complete ${goalQuestions} questions`, progress: l.questions, goal: goalQuestions, done: l.questions >= goalQuestions },
    { id: 'accuracy', text: 'Hold 80%+ accuracy over at least 20 questions', progress: l.questions >= 20 ? Math.round(acc * 100) : Math.min(l.questions, 20), goal: l.questions >= 20 ? 80 : 20, done: l.questions >= 20 && acc >= 0.8 },
    { id: 'speed', text: 'Complete one speed drill', progress: l.speedDrills, goal: 1, done: l.speedDrills >= 1 },
    { id: 'reviews', text: 'Review 5 previous mistakes', progress: l.reviews, goal: 5, done: l.reviews >= 5 },
  ];
  if (weakUnitName) objs.push({ id: 'weak', text: `Improve a weak topic: 8 questions in ${weakUnitName}`, progress: weakUnitDone, goal: 8, done: weakUnitDone >= 8 });
  return objs;
}
