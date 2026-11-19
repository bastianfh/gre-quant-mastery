import { isCorrect, parseNumeric, diagnose } from '../src/engine/grading';
import { computeMastery } from '../src/engine/mastery';
import { onMiss, onReview, SRS_INTERVALS, isDue, reviewUsesVariant } from '../src/engine/srs';
import { estimateTheta, scoreExam, estimateScore, calibrationOffset } from '../src/engine/scoring';
import { xpForAttempt, levelOf, streaks, dayKey, addDays, ACHIEVEMENTS } from '../src/engine/gamification';
import { computeRatings, targetLevel, expected, quadrant } from '../src/engine/adaptive';
import { evaluate, press, initCalc, type CalcState } from '../src/lib/calc';
import { buildSection, routeSection2, pickQuestions } from '../src/engine/selection';
import { getBank, getQuestion } from '../src/engine/bank';
import { planForDay } from '../src/engine/plan';
import { defaultProfile } from '../src/store/store';
import { analyzeQc } from '../src/engine/generators/qc';
import type { Attempt, Level, Question } from '../src/engine/types';

const mkAttempt = (o: Partial<Attempt>): Attempt => ({ qid: 'x', generatorId: 'g', unit: 'al.linear', category: 'algebra', format: 'mcq', di: false, level: 3, mode: 'practice', correct: true, skipped: false, timeMs: 60000, targetSec: 85, answer: 0, ts: Date.now(), hintsUsed: 0, sessionId: 's', ...o });
const bank = getBank();

describe('grading', () => {
  it('parses numeric entries', () => {
    expect(parseNumeric('3.5')).toBe(3.5);
    expect(parseNumeric('-2')).toBe(-2);
    expect(parseNumeric('1,200')).toBe(1200);
    expect(parseNumeric('7/8')).toBe(0.875);
    expect(parseNumeric('.5')).toBe(0.5);
    expect(parseNumeric('abc')).toBeNull();
    expect(parseNumeric('3/0')).toBeNull();
    expect(parseNumeric('')).toBeNull();
  });
  it('grades every bank question correctly with its own answer and rejects a wrong one', () => {
    for (const q of bank) {
      let right: any, wrong: any;
      if (q.format === 'qc' || q.format === 'mcq') { right = q.answer; wrong = ((q.answer as number) + 1) % (q.format === 'qc' ? 4 : q.choices!.length); }
      else if (q.format === 'multi') { right = [...(q.answer as number[])].reverse(); wrong = (q.answer as number[]).slice(1).length ? (q.answer as number[]).slice(1) : [...(q.answer as number[]), (q.choices!.length - 1 === (q.answer as number[])[0] ? 0 : q.choices!.length - 1)]; }
      else { const a = q.answer as any; right = a.kind === 'fraction' ? `${a.num * 2}/${a.den * 2}` : String(a.value); wrong = a.kind === 'fraction' ? `${a.num + 1}/${a.den}` : String(a.value + 1); }
      expect(isCorrect(q, right), q.id).toBe(true);
      expect(isCorrect(q, wrong), q.id).toBe(false);
    }
  });
  it('multi-select requires the exact set', () => {
    const q = bank.find((x) => x.format === 'multi' && (x.answer as number[]).length >= 2)!;
    expect(isCorrect(q, (q.answer as number[]).slice(0, 1))).toBe(false);
    expect(isCorrect(q, [])).toBe(false);
  });
  it('diagnoses QC (D) misconceptions', () => {
    const q = bank.find((x) => x.format === 'qc' && x.answer === 3)!;
    expect(diagnose(q, 0).join(' ')).toMatch(/different outcomes/);
  });
});

describe('QC engine', () => {
  it('detects (D) with witnesses — x² vs x', () => {
    const r = analyzeQc([{ name: 'x', kind: 'real' }], () => true, (v) => v.x ** 2, (v) => v.x);
    expect(r.rel).toBe('D');
    expect(r.witness.A && r.witness.B && r.witness.C).toBeTruthy();
  });
  it('proves determinate relations — x > 1: x² > x', () => {
    expect(analyzeQc([{ name: 'x', kind: 'real' }], (v) => v.x > 1, (v) => v.x ** 2, (v) => v.x).rel).toBe('A');
  });
  it('tests fractions: 0 < x < 1 → x² < x', () => {
    expect(analyzeQc([{ name: 'x', kind: 'real' }], (v) => v.x > 0 && v.x < 1, (v) => v.x ** 2, (v) => v.x).rel).toBe('B');
  });
  it('tests negatives: integer x, x² ≥ x is never B but can be A or C → D', () => {
    expect(analyzeQc([{ name: 'x', kind: 'int' }], () => true, (v) => v.x ** 2, (v) => v.x).rel).toBe('D');
  });
});

describe('mastery model', () => {
  it('three easy correct answers are not mastery', () => {
    const m = computeMastery([1, 2, 3].map(() => mkAttempt({ level: 1 })));
    expect(m.score).toBeLessThan(60);
    expect(m.band).not.toBe('mastered');
  });
  it('many easy correct answers cap below Strong without hard evidence', () => {
    const m = computeMastery(Array.from({ length: 30 }, () => mkAttempt({ level: 2 })));
    expect(m.score).toBeLessThanOrEqual(64);
  });
  it('broad hard evidence reaches Mastered', () => {
    const as = [...Array.from({ length: 8 }, () => mkAttempt({ level: 3 })), ...Array.from({ length: 10 }, () => mkAttempt({ level: 4 })), ...Array.from({ length: 6 }, () => mkAttempt({ level: 5 }))];
    const m = computeMastery(as);
    expect(m.score).toBeGreaterThanOrEqual(90);
    expect(m.band).toBe('mastered');
  });
  it('slow correct answers earn less than fast ones', () => {
    const fast = computeMastery(Array.from({ length: 12 }, () => mkAttempt({ level: 4, timeMs: 60000, targetSec: 110 })));
    const slow = computeMastery(Array.from({ length: 12 }, () => mkAttempt({ level: 4, timeMs: 330000, targetSec: 110 })));
    expect(slow.raw).toBeLessThan(fast.raw);
  });
  it('wrong answers lower mastery', () => {
    const good = computeMastery(Array.from({ length: 12 }, () => mkAttempt({ level: 3 })));
    const mixed = computeMastery(Array.from({ length: 12 }, (_, i) => mkAttempt({ level: 3, correct: i % 2 === 0 })));
    expect(mixed.score).toBeLessThan(good.score);
  });
});

describe('spaced repetition', () => {
  const now = 1_700_000_000_000;
  it('schedules immediate → same day → 1d → 3d → 7d → graduated', () => {
    let it = onMiss(undefined, { qid: 'q', generatorId: 'g', unit: 'u' }, now);
    expect(it.due - now).toBe(SRS_INTERVALS[0]);
    const deltas: number[] = [];
    let t = now;
    for (let k = 0; k < 5; k++) { t = it.due; it = onReview(it, true, t); deltas.push(it.graduated ? -1 : it.due - t); }
    expect(deltas).toEqual([SRS_INTERVALS[1], SRS_INTERVALS[2], SRS_INTERVALS[3], SRS_INTERVALS[4], -1]);
    expect(it.graduated).toBe(true);
  });
  it('repeated mistakes increase review frequency', () => {
    let it = onMiss(undefined, { qid: 'q', generatorId: 'g', unit: 'u' }, now);
    it = onReview(it, false, now);
    const first = it.due - now;
    it = onReview(it, false, now);
    const second = it.due - now;
    expect(second).toBeLessThan(first);
    expect(it.lapses).toBe(2);
  });
  it('switches to concept variants after the first stages', () => {
    let it = onMiss(undefined, { qid: 'q', generatorId: 'g', unit: 'u' }, now);
    expect(reviewUsesVariant(it)).toBe(false);
    it = onReview(onReview(it, true, now), true, now);
    expect(reviewUsesVariant(it)).toBe(true);
    expect(isDue(it, now)).toBe(false);
  });
});

describe('scoring', () => {
  it('ability increases with accuracy and difficulty', () => {
    const easy = estimateTheta(Array.from({ length: 20 }, () => ({ b: -1, y: 1 })));
    const hard = estimateTheta(Array.from({ length: 20 }, () => ({ b: 1.5, y: 1 })));
    expect(hard.theta).toBeGreaterThan(easy.theta);
  });
  it('exam scores stay within 130–170 and are monotone in correct answers', () => {
    const items = (k: number): { level: Level; correct: boolean }[] => Array.from({ length: 27 }, (_, i) => ({ level: 4 as Level, correct: i < k }));
    let prev = 0;
    for (let k = 0; k <= 27; k++) { const s = scoreExam(items(k)).scaled; expect(s).toBeGreaterThanOrEqual(130); expect(s).toBeLessThanOrEqual(170); expect(s).toBeGreaterThanOrEqual(prev); prev = s; }
    expect(scoreExam(items(27)).scaled).toBeGreaterThanOrEqual(167);
    expect(scoreExam(items(0)).scaled).toBeLessThanOrEqual(135);
  });
  it('the harder path is rewarded for the same raw score', () => {
    const mk = (lv: Level) => Array.from({ length: 27 }, (_, i) => ({ level: (i < 12 ? 3 : lv) as Level, correct: i % 4 !== 0 }));
    expect(scoreExam(mk(5)).scaled).toBeGreaterThan(scoreExam(mk(2)).scaled);
  });
  it('requires data before estimating', () => {
    expect(estimateScore([], [], 0).score).toBeNull();
    const at = Array.from({ length: 40 }, (_, i) => mkAttempt({ level: 3, correct: i % 4 !== 0 }));
    const e = estimateScore(at, [], 1);
    expect(e.score).toBeGreaterThan(140);
    expect(e.range![0]).toBeLessThanOrEqual(e.score!);
  });
});

describe('adaptive difficulty', () => {
  it('consistent success raises the target level; failure lowers it', () => {
    const up = computeRatings(Array.from({ length: 25 }, () => mkAttempt({ level: 3, timeMs: 40000 })));
    const down = computeRatings(Array.from({ length: 25 }, () => mkAttempt({ level: 3, correct: false })));
    expect(targetLevel(up['al.linear'])).toBeGreaterThan(3);
    expect(targetLevel(down['al.linear'])).toBeLessThan(3);
    expect(expected(1000, 3)).toBeCloseTo(0.5);
  });
  it('classifies speed/accuracy quadrants', () => {
    expect(quadrant(Array.from({ length: 10 }, () => mkAttempt({ timeMs: 30000, targetSec: 85 }))).q).toBe('fast-accurate');
    expect(quadrant(Array.from({ length: 10 }, () => mkAttempt({ timeMs: 200000, targetSec: 85, correct: false }))).q).toBe('slow-inaccurate');
  });
});

describe('gamification', () => {
  it('awards more XP for harder questions and little for farming easy ones', () => {
    const base = { correct: true, hintsUsed: 0, isReview: false, skipped: false };
    expect(xpForAttempt({ ...base, level: 5 }, 0, 4)).toBeGreaterThan(xpForAttempt({ ...base, level: 3 }, 0, 4));
    expect(xpForAttempt({ ...base, level: 1 }, 0, 5)).toBeLessThanOrEqual(2);
    expect(xpForAttempt({ ...base, level: 3, hintsUsed: 2 }, 0, 3)).toBeLessThan(xpForAttempt({ ...base, level: 3 }, 0, 3));
    expect(xpForAttempt({ ...base, level: 3, isReview: true }, 0, 3)).toBeGreaterThan(xpForAttempt({ ...base, level: 3 }, 0, 3));
    expect(xpForAttempt({ ...base, correct: false, level: 5 }, 0, 3)).toBe(1);
  });
  it('maps XP to the 10 named levels', () => {
    expect(levelOf(0).name).toBe('Beginner');
    expect(levelOf(22000).name).toBe('GRE 170 Candidate');
    expect(levelOf(1000).level).toBe(3);
  });
  it('computes current and longest streaks', () => {
    const today = dayKey();
    const logs = [0, 1, 2, 5, 6].map((d) => ({ date: addDays(today, -d), questions: 10, correct: 8, timeMs: 0, xp: 0, reviews: 0, speedDrills: 0, modes: {}, planDone: {}, objectivesClaimed: [] }));
    const s = streaks(logs, today);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });
  it('achievement ids are unique', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('calculator', () => {
  const run = (keys: string[]) => keys.reduce<CalcState>((s, k) => press(s, k), initCalc()).entry;
  it('respects order of operations and parentheses', () => {
    expect(evaluate('2+3*4')).toBe(14);
    expect(evaluate('(2+3)*4')).toBe(20);
    expect(evaluate('10/4-1')).toBe(1.5);
    expect(evaluate('-3*-2')).toBe(6);
    expect(() => evaluate('1/0')).toThrow();
  });
  it('handles key sequences', () => {
    expect(run(['1', '2', '+', '3', '*', '2', '='])).toBe('18');
    expect(run(['(', '1', '2', '+', '3', ')', '*', '2', '='])).toBe('30');
    expect(run(['1', '.', '5', '*', '4', '='])).toBe('6');
    expect(run(['8', '1', '√'])).toBe('9');
    expect(run(['2', '5', '%'])).toBe('0.25');
    expect(run(['5', '±', '+', '2', '='])).toBe('-3');
    expect(run(['7', 'M+', 'C', 'MR', '*', '3', '='])).toBe('21');
    expect(run(['1', '/', '0', '='])).toBe('Error');
    expect(run(['1', '/', '3', '='])).toBe('0.33333333');
  });
});

describe('exam builder', () => {
  it('builds 12- and 15-question sections with all formats and categories', () => {
    const s1 = buildSection(1, 'medium', 1, new Set());
    expect(s1).toHaveLength(12);
    expect(new Set(s1.map((q) => q.id)).size).toBe(12);
    for (const path of ['easier', 'medium', 'harder'] as const) {
      const s2 = buildSection(2, path, 1, new Set(s1.map((q) => q.id)));
      expect(s2).toHaveLength(15);
      const cats = new Set(s2.map((q) => (q.category === 'strategy' ? 'x' : q.category)));
      for (const c of ['arithmetic', 'algebra', 'geometry', 'data']) expect(cats.has(c as any), `${path} ${c}`).toBe(true);
      expect(s2.some((q) => q.format === 'qc')).toBe(true);
      expect(s2.some((q) => q.di)).toBe(true);
      expect(s2.some((q) => q.format === 'numeric')).toBe(true);
      expect(s2.some((q) => q.format === 'multi')).toBe(true);
    }
    const avg = (qs: Question[]) => qs.reduce((a, q) => a + q.level, 0) / qs.length;
    expect(avg(buildSection(2, 'harder', 2, new Set()))).toBeGreaterThan(avg(buildSection(2, 'easier', 2, new Set())) + 1);
  });
  it('routes section 2 by section 1 performance', () => {
    expect(routeSection2(10)).toBe('harder');
    expect(routeSection2(7)).toBe('medium');
    expect(routeSection2(3)).toBe('easier');
  });
  it('different forms produce different questions', () => {
    const a = buildSection(1, 'medium', 1, new Set()).map((q) => q.id), b = buildSection(1, 'medium', 2, new Set()).map((q) => q.id);
    expect(a.filter((x) => b.includes(x)).length).toBeLessThan(4);
  });
});

describe('selection', () => {
  const ctx = { qstats: new Map(), ratings: {}, mastery: {}, recent: [] };
  it('respects filters', () => {
    const qs = pickQuestions({ units: ['ge.circles'], formats: ['mcq'] }, 5, ctx, { seed: 3 });
    expect(qs.length).toBe(5);
    for (const q of qs) { expect(q.unit).toBe('ge.circles'); expect(q.format).toBe('mcq'); }
  });
  it('tops up with fresh variants when the bank runs out', () => {
    const qs = pickQuestions({ units: ['ar.primes'], levels: [4] }, 25, ctx, { seed: 5 });
    expect(qs.length).toBe(25);
    expect(qs.some((q) => q.source === 'variant')).toBe(true);
    for (const q of qs) expect(getQuestion(q.id)?.stem).toBe(q.stem);
  });
  it('untouched filter excludes attempted questions', () => {
    const first = pickQuestions({ units: ['al.linear'] }, 3, ctx, { seed: 1 });
    const qstats = new Map(first.map((q) => [q.id, { n: 1, correct: 1, last: 1, lastCorrect: true }]));
    const next = pickQuestions({ units: ['al.linear'], status: 'untouched' }, 50, { ...ctx, qstats }, { seed: 1 });
    expect(next.filter((q) => q.source === 'bank').some((q) => qstats.has(q.id))).toBe(false);
  });
});

describe('study plan', () => {
  it('starts with the diagnostic, then targets weakest units', () => {
    const p = defaultProfile();
    const d1 = planForDay(p, {}, 0, p.startDate);
    expect(d1.blocks[0].kind).toBe('diagnostic');
    const d2 = planForDay({ ...p, diagnosticDone: true }, {}, 7, addDays(p.startDate, 1));
    expect(d2.blocks.some((b) => b.kind === 'review')).toBe(true);
    expect(d2.week).toBe(1);
    const late = planForDay({ ...p, diagnosticDone: true }, {}, 0, addDays(p.startDate, 26));
    expect(late.week).toBe(4);
    expect(late.blocks.some((b) => b.kind === 'mock')).toBe(true);
    const mins = late.blocks.reduce((a, b) => a + b.minutes, 0);
    expect(mins).toBeGreaterThan(50);
    expect(mins).toBeLessThan(160);
  });
});

describe('official-score calibration', () => {
  const at = Array.from({ length: 60 }, (_, i) => mkAttempt({ level: 3, correct: i % 4 !== 0, ts: Date.now() - 1000 }));
  const base = estimateScore(at, [], 1).score!;
  const off = (score: number, model: number | null, ts = Date.now() - 500) => ({ id: String(score) + ts, ts, date: '2026-11-01', score, source: 'POWERPREP Online', modelScore: model });
  it('no official results leaves the estimate unchanged', () => {
    expect(estimateScore(at, [], 1, Date.now(), []).score).toBe(base);
  });
  it('shifts the estimate toward official results, shrunk for few results', () => {
    const one = estimateScore(at, [], 1, Date.now(), [off(base + 8, base)]);
    expect(one.score).toBe(base + 4); // 8 × 1/2
    const three = estimateScore(at, [], 1, Date.now(), [off(base + 8, base, Date.now() - 900), off(base + 8, base, Date.now() - 800), off(base + 8, base, Date.now() - 700)]);
    expect(three.score).toBe(base + 6); // 8 × 3/4
  });
  it('caps the correction and stays within 130–170', () => {
    expect(calibrationOffset([off(170, 130), off(170, 130)]).offset).toBe(12);
    expect(estimateScore(at, [], 1, Date.now(), [off(130, 170)]).score).toBeGreaterThanOrEqual(130);
  });
  it('ignores results entered after the evaluation time (keeps history honest)', () => {
    expect(estimateScore(at, [], 1, Date.now() - 10_000, [off(base + 10, base, Date.now())]).score).toBe(estimateScore(at, [], 1, Date.now() - 10_000).score);
  });
  it('uses the official score when there is no practice data yet', () => {
    expect(estimateScore([], [], 0, Date.now(), [off(158, null)]).score).toBe(158);
  });
});

describe('timing strategy', () => {
  it('finds time sinks, wasted time, over-cap misses and blanks at the buzzer', async () => {
    const { analyzeTiming } = await import('../src/engine/timing');
    const s1 = buildSection(1, 'medium', 3, new Set());
    const s2 = buildSection(2, 'medium', 3, new Set(s1.map((q) => q.id)));
    const mk = (qs: Question[], limit: number, used: number, f: (i: number) => [number, boolean, boolean]) => ({
      qids: qs.map((q) => q.id), answers: qs.map((_, i) => (f(i)[2] ? null : 0)), correct: qs.map((_, i) => f(i)[1]), timeMs: qs.map((_, i) => f(i)[0] * 1000), timeUsedSec: used, limitSec: limit, marked: qs.map(() => false),
    });
    const exam = { id: 'x', kind: 'mock' as const, form: 'A', startedAt: 0, finishedAt: 1, path: 'medium' as const, raw: 0, scaled: 150, range: [148, 152] as [number, number],
      sections: [mk(s1, 1260, 1260, (i) => [i === 0 ? 300 : 80, i > 1 && i < 10, i >= 10]), mk(s2, 1560, 900, (i) => [60, true, false])] };
    const t = analyzeTiming(exam, (id) => getQuestion(id), (_q, a) => a === null);
    expect(t.sinks[0].timeSec).toBe(300);
    expect(t.overCapWrong).toBe(1);
    expect(t.blanksAtEnd).toBe(2);
    expect(t.wastedSec).toBe(300 + 80 + 2 * 80);
    expect(t.pacing[0]).toHaveLength(12);
    expect(t.pacing[1][14].even).toBeCloseTo(26, 0);
    expect(t.advice.join(' ')).toMatch(/left blank/);
  });
});

describe('data-interpretation sets in exams and practice', () => {
  it('mock section 2 contains one complete, consecutive 3-question set', () => {
    for (const path of ['easier', 'medium', 'harder'] as const) for (let f = 1; f <= 8; f++) {
      const s2 = buildSection(2, path, f, new Set());
      const idx = s2.map((q, i) => (q.setId ? i : -1)).filter((i) => i >= 0);
      expect(idx).toHaveLength(3);
      expect(idx[2] - idx[0]).toBe(2);
      expect(new Set(idx.map((i) => s2[i].setId)).size).toBe(1);
      expect(idx.map((i) => s2[i].setIndex)).toEqual([0, 1, 2]);
    }
  });
  it('practice serves a set member together with its siblings, in order', () => {
    const qs = pickQuestions({ units: ['da.interpretation'], levels: [4] }, 12, { qstats: new Map(), ratings: {}, mastery: {}, recent: [] }, { seed: 9 });
    const withSet = qs.filter((q) => q.setId);
    expect(withSet.length).toBeGreaterThan(0);
    for (const id of new Set(withSet.map((q) => q.setId))) {
      const members = qs.filter((q) => q.setId === id);
      if (members.length === 3) expect(members.map((q) => q.setIndex)).toEqual([0, 1, 2]);
    }
  });
});
