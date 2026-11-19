// Timing-strategy analysis for simulated exams: where the clock went and what it cost.
import type { ExamResult, Question } from './types';

export interface TimedItem { section: number; index: number; q: Question; timeSec: number; correct: boolean; blank: boolean; ratio: number }
export interface TimingReport {
  items: TimedItem[];
  sinks: TimedItem[];              // biggest time consumers
  wastedSec: number;               // time spent on questions answered wrong or left blank
  wastedShare: number;             // share of total time
  overCapWrong: number;            // wrong answers that took longer than the cap
  capSec: number;                  // suggested per-question cap
  pacing: { n: number; you: number; even: number }[][]; // per section: cumulative minutes vs even pace
  blanksAtEnd: number;             // unanswered questions in sections where time ran out
  advice: string[];
}

const EVEN_PACE = [21 * 60 / 12, 26 * 60 / 15]; // ≈ 105 s and 104 s per question

export function analyzeTiming(exam: ExamResult, getQ: (id: string) => Question | null, isBlank: (q: Question, a: unknown) => boolean): TimingReport {
  const items: TimedItem[] = [];
  exam.sections.forEach((s, si) => s.qids.forEach((id, i) => {
    const q = getQ(id);
    if (!q) return;
    const timeSec = (s.timeMs[i] ?? 0) / 1000;
    items.push({ section: si, index: i, q, timeSec, correct: s.correct[i], blank: isBlank(q, s.answers[i]), ratio: timeSec / Math.max(10, q.timeSec) });
  }));
  const total = items.reduce((a, x) => a + x.timeSec, 0) || 1;
  const wrong = items.filter((x) => !x.correct);
  const wastedSec = wrong.reduce((a, x) => a + x.timeSec, 0);
  const capSec = 150;
  const overCapWrong = wrong.filter((x) => x.timeSec > capSec).length;
  const sinks = [...items].sort((a, b) => b.timeSec - a.timeSec).slice(0, 5).filter((x) => x.timeSec > 0);
  const pacing = exam.sections.map((s, si) => {
    let cum = 0;
    return s.qids.map((_, i) => { cum += (s.timeMs[i] ?? 0) / 1000; return { n: i + 1, you: +(cum / 60).toFixed(2), even: +(((i + 1) * (EVEN_PACE[si] ?? 105)) / 60).toFixed(2) }; });
  });
  const blanksAtEnd = exam.sections.reduce((a, s, si) => a + (s.timeUsedSec >= s.limitSec - 1 ? items.filter((x) => x.section === si && x.blank).length : 0), 0);
  const advice: string[] = [];
  if (blanksAtEnd) advice.push(`${blanksAtEnd} question${blanksAtEnd > 1 ? 's were' : ' was'} left blank when time ran out. Never leave a blank: with about 90 seconds left, enter a guess on every unanswered question.`);
  if (overCapWrong) advice.push(`${overCapWrong} wrong answer${overCapWrong > 1 ? 's' : ''} took longer than ${Math.floor(capSec / 60)} min ${capSec % 60} s. Set a hard cap: at 2:30, make your best guess, mark the question, and move on.`);
  if (wastedSec / total > 0.4 && wrong.length >= 3) advice.push(`${Math.round((wastedSec / total) * 100)}% of your time went to questions you missed. Skipping the hardest one or two per section and returning at the end usually buys more points.`);
  const slowRight = items.filter((x) => x.correct && x.ratio > 1.8).length;
  if (slowRight >= 3) advice.push(`${slowRight} correct answers took nearly twice the target time — accurate but slow. Speed Training at 90 s will tighten these.`);
  const unusedSec = exam.sections.reduce((a, s) => a + Math.max(0, s.limitSec - s.timeUsedSec), 0);
  if (unusedSec > 300 && wrong.length >= 5) advice.push(`You finished with ${Math.round(unusedSec / 60)} minutes unused but missed ${wrong.length}. Use spare time to re-check marked questions — especially Quantitative Comparison and multi-select.`);
  if (!advice.length) advice.push('Pacing was balanced: no major time sinks and no questions lost to the clock. Keep it up.');
  return { items, sinks, wastedSec, wastedShare: wastedSec / total, overCapWrong, capSec, pacing, blanksAtEnd, advice };
}
