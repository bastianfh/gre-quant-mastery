import { UNITS, UNIT_BY_ID, MAIN_CATEGORIES } from '../content/curriculum';
import { addDays, dayKey, daysBetween } from './gamification';
import type { MasteryResult } from './mastery';
import type { Profile } from './types';

export type BlockKind = 'diagnostic' | 'lesson' | 'practice' | 'timed' | 'review' | 'speed' | 'qc' | 'mock' | 'boss' | 'formulas' | 'daily';
export interface PlanBlock { id: string; kind: BlockKind; title: string; detail: string; minutes: number; to: string; questions?: number }
export interface PlanDay { day: number; total: number; date: string; week: 1 | 2 | 3 | 4; phase: string; focus: string; blocks: PlanBlock[] }

export const PHASES: Record<1 | 2 | 3 | 4, { name: string; focus: string }> = {
  1: { name: 'Foundations', focus: 'Diagnostic, arithmetic and algebra fundamentals, daily mixed practice' },
  2: { name: 'Expansion', focus: 'Geometry, data analysis, word problems, quantitative comparison; rising difficulty' },
  3: { name: 'Advanced & Timed', focus: 'Hard GRE-style items, timed drills, mixed challenges, first simulations, intensive review' },
  4: { name: 'Exam Mode', focus: 'Full simulations, targeted weakness elimination, speed, formula review' },
};

const qs = (o: Record<string, string | number | undefined>) => '?' + Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

/**
 * Build today's plan. Weak topics (by mastery) get the targeted blocks; topics already ≥75% are skipped
 * for lessons; the review block scales with the spaced-repetition backlog.
 */
export function planForDay(profile: Profile, mastery: Record<string, MasteryResult>, dueReviews: number, today = dayKey(), lastMockDaysAgo: number | null = null): PlanDay {
  const start = profile.startDate;
  const exam = profile.examDate && daysBetween(start, profile.examDate) > 0 ? profile.examDate : addDays(start, 30);
  const total = Math.max(7, Math.min(60, daysBetween(start, exam)));
  const day = Math.max(1, Math.min(total, daysBetween(start, today) + 1));
  const frac = day / total;
  const week = (frac <= 0.25 ? 1 : frac <= 0.5 ? 2 : frac <= 0.8 ? 3 : 4) as 1 | 2 | 3 | 4;
  const M = profile.dailyMinutes;
  const scale = (m: number) => Math.max(5, Math.round((m * M) / 75 / 5) * 5);
  const blocks: PlanBlock[] = [];
  const id = (k: string) => `${today}:${k}`;

  const weekUnits = UNITS.filter((u) => (week === 1 ? u.week === 1 : week === 2 ? u.week === 2 : true) && MAIN_CATEGORIES.includes(u.category));
  const scoreOf = (u: string) => (mastery[u]?.n ? mastery[u].score : 30);
  const weakest = [...weekUnits].sort((a, b) => scoreOf(a.id) - scoreOf(b.id));
  const lessonUnit = weakest.find((u) => !profile.lessonsCompleted[u.id] && scoreOf(u.id) < 75) ?? weakest.find((u) => scoreOf(u.id) < 75);
  const practiceUnit = weakest[0];
  const second = weakest.find((u) => u.category !== practiceUnit?.category) ?? weakest[1];

  if (!profile.diagnosticDone) {
    blocks.push({ id: id('diagnostic'), kind: 'diagnostic', title: 'Diagnostic exam', detail: 'A full-length adaptive baseline (27 questions, 47 minutes). Everything else adapts to this result.', minutes: 50, to: '/mock?kind=diagnostic' });
    blocks.push({ id: id('review'), kind: 'review', title: 'Review diagnostic mistakes', detail: 'Read every explanation; tag why you missed each one.', minutes: scale(15), to: '/lab' });
    return { day, total, date: today, week, phase: PHASES[week].name, focus: PHASES[week].focus, blocks };
  }

  const reviewMin = Math.min(scale(20), Math.max(5, Math.ceil(dueReviews * 1.5 / 5) * 5));
  if (day === total) {
    blocks.push({ id: id('formulas'), kind: 'formulas', title: 'Formula & strategy review', detail: 'Light review only — scan bookmarked formulas and QC strategies. Rest well.', minutes: 20, to: '/formulas' });
    blocks.push({ id: id('warmup'), kind: 'practice', title: 'Confidence warm-up', detail: '10 medium questions, untimed.', minutes: 15, to: '/practice' + qs({ levels: '2,3', n: 10, mode: 'untimed', block: id('warmup') }), questions: 10 });
    return { day, total, date: today, week, phase: 'Final preparation', focus: 'Stay sharp, avoid fatigue', blocks };
  }

  if (week <= 2 && lessonUnit) blocks.push({ id: id('lesson'), kind: 'lesson', title: `Lesson: ${lessonUnit.name}`, detail: `Your mastery here is ${mastery[lessonUnit.id]?.n ? mastery[lessonUnit.id].score + '%' : 'unrated'}. Study the concepts and pass the mastery check.`, minutes: scale(15), to: `/learn/${lessonUnit.id}` });
  if (practiceUnit) blocks.push({ id: id('practice'), kind: 'practice', title: `Targeted practice: ${practiceUnit.name}`, detail: 'Adaptive difficulty, immediate feedback.', minutes: scale(15), to: '/practice' + qs({ units: practiceUnit.id, n: 12, block: id('practice') }), questions: 12 });
  if (week >= 2 && second) blocks.push({ id: id('practice2'), kind: 'practice', title: `Targeted practice: ${second.name}`, detail: 'Second-weakest area in a different category.', minutes: scale(10), to: '/practice' + qs({ units: second.id, n: 8, block: id('practice2') }), questions: 8 });
  if (week === 2 || (week >= 3 && day % 2 === 0)) blocks.push({ id: id('qc'), kind: 'qc', title: 'Quantitative Comparison Arena', detail: 'Edge cases, hidden constraints, and when the answer is (D).', minutes: scale(10), to: '/qc' + qs({ block: id('qc') }) });
  blocks.push({ id: id('timed'), kind: 'timed', title: 'Timed mixed set', detail: week >= 3 ? 'Exam pace: ~1:45 per question, hard-leaning difficulty.' : 'All topics, adaptive difficulty, exam pace.', minutes: scale(week >= 3 ? 20 : 15), to: '/practice' + qs({ n: week >= 3 ? 12 : 10, mode: 'timed', levels: week >= 3 ? '3,4,5' : undefined, block: id('timed') }), questions: week >= 3 ? 12 : 10 });
  if (week >= 3 && day % 3 === 0) blocks.push({ id: id('boss'), kind: 'boss', title: 'Boss challenge', detail: 'Multi-concept hard questions.', minutes: scale(15), to: '/boss' });
  if (week >= 3) blocks.push({ id: id('speed'), kind: 'speed', title: 'Speed drill', detail: 'Calibrate when to calculate, estimate, or backsolve.', minutes: scale(10), to: '/speed' + qs({ block: id('speed') }) });
  const mockDue = week === 4 ? (lastMockDaysAgo === null || lastMockDaysAgo >= 2) : week === 3 ? (lastMockDaysAgo === null || lastMockDaysAgo >= 4) : false;
  if (mockDue) blocks.push({ id: id('mock'), kind: 'mock', title: 'Full GRE Quant simulation', detail: '2 sections, 47 minutes, section-adaptive. Treat it like test day.', minutes: 50, to: '/mock' });
  blocks.push({ id: id('review'), kind: 'review', title: 'Wrong Answer Lab', detail: dueReviews ? `${dueReviews} review${dueReviews > 1 ? 's' : ''} due (spaced repetition).` : 'No reviews due — revisit recent mistakes by type.', minutes: Math.max(5, reviewMin), to: '/lab' });
  if (week === 4) blocks.push({ id: id('formulas'), kind: 'formulas', title: 'Formula review', detail: 'Scan the reference sheet; bookmark anything you hesitated on.', minutes: 5, to: '/formulas' });
  blocks.push({ id: id('daily'), kind: 'daily', title: 'Daily challenge', detail: '12 personalized questions, rising difficulty.', minutes: scale(10), to: '/daily' });
  void UNIT_BY_ID;
  return { day, total, date: today, week, phase: PHASES[week].name, focus: PHASES[week].focus, blocks };
}
