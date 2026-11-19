import { create } from 'zustand';
import { db, type KV } from './db';
import type { Attempt, DailyLog, ErrorType, ExamResult, Mode, Profile, Question, SessionResult, SrsItem, UserAnswer } from '../engine/types';
import { computeRatings, DEFAULT_RATING, targetLevel, updateRating } from '../engine/adaptive';
import { onMiss, onReview } from '../engine/srs';
import { ACHIEVEMENTS, dayKey, addDays, xpForAttempt, XP_EVENTS, streaks, levelOf } from '../engine/gamification';
import { diagnose, parseNumeric, numericValue } from '../engine/grading';
import { registerExtra } from '../engine/bank';
import { validateQuestion } from '../engine/validate';
import { computeDerived } from './derived';

export const SCHEMA_VERSION = 1;

export function defaultProfile(): Profile {
  const today = dayKey();
  return {
    id: 'me', name: 'Candidate', targetScore: 167, examDate: addDays(today, 30), startDate: today,
    dailyMinutes: 75, dailyQuestionGoal: 30, xp: 0, achievements: {}, lessonsCompleted: {}, lessonMastery: {},
    bookmarks: [], flagged: [], formulaBookmarks: [], reports: [], officialScores: [], ratings: {}, diagnosticDone: false,
    settings: { feedback: 'immediate', showTimer: true, sound: false, reduceMotion: false, confidencePrompt: false, theme: 'dark' },
    createdAt: Date.now(), version: SCHEMA_VERSION,
  };
}

const emptyLog = (date: string): DailyLog => ({ date, questions: 0, correct: 0, timeMs: 0, xp: 0, reviews: 0, speedDrills: 0, modes: {}, planDone: {}, objectivesClaimed: [] });

export interface Toast { id: number; kind: 'xp' | 'achievement' | 'level' | 'info' | 'error'; text: string; sub?: string }

export interface RecordInput {
  q: Question; answer: UserAnswer; correct: boolean; timeMs: number; mode: Mode; sessionId: string;
  hintsUsed?: number; timeLimitSec?: number; isReview?: boolean; confidence?: 1 | 2 | 3; skipped?: boolean;
  /** SRS item being reviewed (its original qid), when this attempt is a spaced-repetition review. */
  srsKey?: string;
}

interface State {
  ready: boolean;
  error: string | null;
  profile: Profile;
  attempts: Attempt[];
  srs: Record<string, SrsItem>;
  exams: ExamResult[];
  sessions: SessionResult[];
  daily: Record<string, DailyLog>;
  run: number;      // current consecutive-correct run
  bestRun: number;
  toasts: Toast[];
  version: number;  // bumps on every data change (memo key for derived data)
  init: () => Promise<void>;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
  updateSettings: (s: Partial<Profile['settings']>) => Promise<void>;
  recordAttempt: (r: RecordInput) => Promise<{ attempt: Attempt; xp: number }>;
  setErrorType: (attemptId: number, t: ErrorType) => Promise<void>;
  finishSession: (s: Omit<SessionResult, 'id' | 'ts'> & { id?: string }, xpBonus?: number, planBlock?: string) => Promise<SessionResult>;
  saveExam: (e: ExamResult) => Promise<void>;
  toggleList: (list: 'bookmarks' | 'flagged' | 'formulaBookmarks', id: string) => Promise<void>;
  reportQuestion: (qid: string, note: string) => Promise<void>;
  completeLesson: (unit: string) => Promise<void>;
  setLessonMastery: (unit: string, pct: number) => Promise<void>;
  markPlanBlock: (blockId: string) => Promise<void>;
  claimObjective: (id: string) => Promise<void>;
  saveAiQuestion: (q: Question) => Promise<void>;
  addOfficialScore: (o: { date: string; score: number; source: string }) => Promise<void>;
  removeOfficialScore: (id: string) => Promise<void>;
  addXp: (xp: number, why?: string) => Promise<void>;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<{ ok: boolean; message: string }>;
  resetAll: () => Promise<void>;
  snapshot: (key: string, value: unknown) => Promise<void>;
  loadSnapshot: <T>(key: string) => Promise<T | null>;
  clearSnapshot: (key: string) => Promise<void>;
}

let toastId = 1;

/** Wrap DB writes: surface failures instead of silently losing progress. */
async function safe<T>(p: Promise<T>, onError: (e: unknown) => void): Promise<T | undefined> {
  try { return await p; } catch (e) { onError(e); return undefined; }
}

function autoErrorType(q: Question, ans: UserAnswer, timeMs: number, timeLimitSec?: number): ErrorType {
  const ratio = timeMs / 1000 / Math.max(10, q.timeSec);
  if ((timeLimitSec && timeMs / 1000 >= timeLimitSec - 0.5) || ratio > 2.2) return 'time';
  if (q.format === 'qc' && typeof ans === 'number' && (ans === 3) !== (q.answer === 3)) return 'strategy';
  if (q.format === 'numeric' && typeof ans === 'string') {
    const v = parseNumeric(ans), t = numericValue(q.answer as any);
    if (v !== null && t !== 0 && (Math.abs(v + t) < 1e-9 || [10, 100, 0.1, 0.01, 2, 0.5].some((k) => Math.abs(v - t * k) < 1e-9) || Math.abs(v - t) <= Math.max(2, Math.abs(t) * 0.05))) return 'calculation';
  }
  if (ratio < 0.25) return 'careless';
  if (diagnose(q, ans).length) return 'concept';
  return 'concept';
}

export const useStore = create<State>((set, get) => {
  const fail = (e: unknown) => {
    console.error(e);
    get().pushToast({ kind: 'error', text: 'Could not save progress', sub: String((e as Error)?.message ?? e) });
  };
  const bump = () => set((s) => ({ version: s.version + 1 }));
  const saveProfile = async (p: Profile) => { set({ profile: p }); bump(); await safe(db.profile.put(p), fail); };
  const touchLog = (date = dayKey()) => get().daily[date] ?? emptyLog(date);
  const saveLog = async (l: DailyLog) => { set((s) => ({ daily: { ...s.daily, [l.date]: l } })); await safe(db.daily.put(l), fail); };

  const checkAchievements = async () => {
    const s = get();
    const d = computeDerived(s);
    const stats = {
      attempts: s.attempts, exams: s.exams, sessions: s.sessions, logs: Object.values(s.daily), bestRun: s.bestRun,
      streak: streaks(Object.values(s.daily)).current,
      categoryMastery: Object.fromEntries(Object.entries(d.categoryMastery).map(([k, v]) => [k, v.score])),
      lessonsCompleted: Object.keys(s.profile.lessonsCompleted).length,
      reviewsCorrect: s.attempts.filter((a) => a.isReview && a.correct).length,
    };
    const unlocked = { ...s.profile.achievements };
    const fresh = ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.test(stats));
    if (!fresh.length) return;
    for (const a of fresh) { unlocked[a.id] = Date.now(); get().pushToast({ kind: 'achievement', text: `Achievement unlocked: ${a.name}`, sub: a.desc }); }
    await saveProfile({ ...get().profile, achievements: unlocked });
  };

  const gainXp = async (xp: number) => {
    if (xp <= 0) return;
    const before = levelOf(get().profile.xp).level;
    const p = { ...get().profile, xp: get().profile.xp + xp };
    const log = touchLog();
    await saveLog({ ...log, xp: log.xp + xp });
    await saveProfile(p);
    const after = levelOf(p.xp);
    if (after.level > before) get().pushToast({ kind: 'level', text: `Level ${after.level}: ${after.name}`, sub: 'New rank reached' });
  };

  return {
    ready: false, error: null, profile: defaultProfile(), attempts: [], srs: {}, exams: [], sessions: [], daily: {}, run: 0, bestRun: 0, toasts: [], version: 0,

    async init() {
      try {
        await db.open();
        let profile = await db.profile.get('me');
        if (!profile) { profile = defaultProfile(); await db.profile.put(profile); }
        else profile = { ...defaultProfile(), ...profile, settings: { ...defaultProfile().settings, ...profile.settings } };
        const [attempts, srsArr, exams, sessions, daily, ai] = await Promise.all([
          db.attempts.orderBy('ts').toArray(), db.srs.toArray(), db.exams.orderBy('finishedAt').toArray(), db.sessions.orderBy('ts').toArray(), db.daily.toArray(), db.aiQuestions.toArray(),
        ]);
        for (const q of ai) if (!validateQuestion(q).length) registerExtra(q);
        // ratings are always recomputed from history so they can never drift from the record
        profile.ratings = computeRatings(attempts);
        let run = 0, bestRun = 0;
        for (const a of attempts) { if (a.skipped) continue; run = a.correct ? run + 1 : 0; bestRun = Math.max(bestRun, run); }
        set({ ready: true, profile, attempts, srs: Object.fromEntries(srsArr.map((i) => [i.qid, i])), exams, sessions, daily: Object.fromEntries(daily.map((d) => [d.date, d])), run, bestRun, version: 1 });
      } catch (e) {
        console.error(e);
        set({ ready: true, error: 'Persistent storage is unavailable (private browsing or blocked storage). Progress will not be saved this session.' });
      }
    },

    async updateProfile(p) { await saveProfile({ ...get().profile, ...p }); },
    async updateSettings(st) { await saveProfile({ ...get().profile, settings: { ...get().profile.settings, ...st } }); },

    async recordAttempt(r) {
      const s = get();
      const now = Date.now();
      const q = r.q;
      const attempt: Attempt = {
        qid: q.id, generatorId: q.generatorId, unit: q.unit, category: q.category, format: q.format, di: q.di, level: q.level, mode: r.mode,
        correct: r.correct && !r.skipped, skipped: !!r.skipped, timeMs: Math.round(r.timeMs), targetSec: q.timeSec, timeLimitSec: r.timeLimitSec,
        answer: r.answer, ts: now, hintsUsed: r.hintsUsed ?? 0, confidence: r.confidence, sessionId: r.sessionId, isReview: r.isReview,
      };
      if (!attempt.correct && !attempt.skipped) attempt.autoErrorType = autoErrorType(q, r.answer, r.timeMs, r.timeLimitSec);
      const id = await safe(db.attempts.add(attempt), fail);
      if (typeof id === 'number') attempt.id = id;
      // ratings (incremental)
      const ratings = { ...s.profile.ratings };
      const countFor = (k: string) => s.attempts.filter((a) => !a.skipped && (k === '_global' || a.unit === k || `cat:${a.category}` === k)).length;
      if (!attempt.skipped) for (const k of [q.unit, `cat:${q.category}`, '_global']) ratings[k] = updateRating(ratings[k] ?? DEFAULT_RATING, countFor(k), attempt);
      // spaced repetition: misses enter the queue; reviews advance or reset it
      const srs = { ...s.srs };
      const reviewItem = r.srsKey ? srs[r.srsKey] : undefined;
      if (reviewItem) {
        // a review (original question or a concept variant) advances or resets the item
        srs[reviewItem.qid] = onReview(reviewItem, attempt.correct, now, attempt.autoErrorType);
        await safe(db.srs.put(srs[reviewItem.qid]), fail);
      } else if (!attempt.correct && !attempt.skipped) {
        // every miss (including exam misses, which are revealed after the exam) enters the review queue
        srs[q.id] = onMiss(srs[q.id], { qid: q.id, generatorId: q.generatorId, unit: q.unit }, now, attempt.autoErrorType);
        await safe(db.srs.put(srs[q.id]), fail);
      }
      const run = attempt.skipped ? s.run : attempt.correct ? s.run + 1 : 0;
      const tl = targetLevel(ratings[q.unit] ?? ratings._global ?? DEFAULT_RATING);
      const xp = r.mode === 'mock' || r.mode === 'diagnostic' ? 0 : xpForAttempt(attempt, run, tl);
      const log = touchLog();
      const newLog: DailyLog = { ...log, questions: log.questions + (attempt.skipped ? 0 : 1), correct: log.correct + (attempt.correct ? 1 : 0), timeMs: log.timeMs + attempt.timeMs, reviews: log.reviews + (r.isReview ? 1 : 0), modes: { ...log.modes, [r.mode]: (log.modes[r.mode] ?? 0) + 1 } };
      set({ attempts: [...s.attempts, attempt], srs, run, bestRun: Math.max(s.bestRun, run), profile: { ...s.profile, ratings } });
      await saveLog(newLog);
      await saveProfile({ ...get().profile, ratings });
      if (xp) await gainXp(xp);
      await checkAchievements();
      return { attempt, xp };
    },

    async setErrorType(attemptId, t) {
      const attempts = get().attempts.map((a) => (a.id === attemptId ? { ...a, errorType: t } : a));
      set({ attempts }); bump();
      const a = attempts.find((x) => x.id === attemptId);
      if (a) {
        await safe(db.attempts.put(a), fail);
        const item = get().srs[a.qid];
        if (item) { const ni = { ...item, lastErrorType: t }; set((s) => ({ srs: { ...s.srs, [a.qid]: ni } })); await safe(db.srs.put(ni), fail); }
      }
    },

    async finishSession(sr, xpBonus = 0, planBlock) {
      const res: SessionResult = { ...sr, id: sr.id ?? `${sr.mode}-${Date.now()}`, ts: Date.now() };
      set((s) => ({ sessions: [...s.sessions, res] })); bump();
      await safe(db.sessions.put(res), fail);
      const log = touchLog();
      const nl = { ...log };
      if (sr.mode === 'speed') nl.speedDrills = log.speedDrills + 1;
      if (sr.mode === 'daily') nl.dailyChallengeScore = Math.max(log.dailyChallengeScore ?? 0, sr.score ?? 0);
      if (planBlock) nl.planDone = { ...nl.planDone, [planBlock]: true };
      const kind = ({ daily: 'daily', boss: 'boss', review: 'review', speed: 'speed', qc: 'qc', mastery: 'lesson' } as Record<string, string>)[sr.mode];
      if (kind) nl.planDone = { ...nl.planDone, [`${log.date}:${kind}`]: true };
      await saveLog(nl);
      if (xpBonus) { await gainXp(xpBonus); get().pushToast({ kind: 'xp', text: `+${xpBonus} XP`, sub: 'Session complete' }); }
      await checkAchievements();
      return res;
    },

    async saveExam(e) {
      set((s) => ({ exams: [...s.exams, e] })); bump();
      await safe(db.exams.put(e), fail);
      if (e.kind === 'diagnostic') await saveProfile({ ...get().profile, diagnosticDone: true });
      const log = touchLog();
      await saveLog({ ...log, planDone: { ...log.planDone, [`${log.date}:${e.kind}`]: true } });
      await gainXp(e.kind === 'mock' ? XP_EVENTS.mock + e.raw * 4 : XP_EVENTS.diagnostic);
      await checkAchievements();
    },

    async toggleList(list, id) {
      const p = get().profile;
      const cur = p[list];
      await saveProfile({ ...p, [list]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
    },
    async reportQuestion(qid, note) {
      const p = get().profile;
      await saveProfile({ ...p, reports: [...p.reports, { qid, note, ts: Date.now() }], flagged: p.flagged.includes(qid) ? p.flagged : [...p.flagged, qid] });
      get().pushToast({ kind: 'info', text: 'Report saved', sub: 'The question was flagged for review in Practice → Flagged.' });
    },
    async completeLesson(unit) {
      const p = get().profile;
      if (p.lessonsCompleted[unit]) return;
      await saveProfile({ ...p, lessonsCompleted: { ...p.lessonsCompleted, [unit]: Date.now() } });
      const log = touchLog();
      await saveLog({ ...log, planDone: { ...log.planDone, [`${log.date}:lesson`]: true } });
      await gainXp(XP_EVENTS.lesson);
      get().pushToast({ kind: 'xp', text: `+${XP_EVENTS.lesson} XP`, sub: 'Lesson completed' });
      await checkAchievements();
    },
    async setLessonMastery(unit, pct) {
      const p = get().profile;
      const prev = p.lessonMastery[unit] ?? 0;
      await saveProfile({ ...p, lessonMastery: { ...p.lessonMastery, [unit]: Math.max(prev, pct) } });
      if (pct >= 80 && prev < 80) { await gainXp(XP_EVENTS.masteryCheck); get().pushToast({ kind: 'xp', text: `+${XP_EVENTS.masteryCheck} XP`, sub: 'Mastery check passed' }); }
    },
    async markPlanBlock(blockId) { const log = touchLog(); await saveLog({ ...log, planDone: { ...log.planDone, [blockId]: true } }); bump(); },
    async claimObjective(id) {
      const log = touchLog();
      if (log.objectivesClaimed.includes(id)) return;
      await saveLog({ ...log, objectivesClaimed: [...log.objectivesClaimed, id] });
      await gainXp(XP_EVENTS.objective);
      get().pushToast({ kind: 'xp', text: `+${XP_EVENTS.objective} XP`, sub: 'Daily objective complete' });
    },
    async addOfficialScore(o) {
      const s = get();
      // remember what the model predicted at this moment (uncalibrated), so the gap can calibrate future estimates
      const d = computeDerived({ ...s, profile: { officialScores: [] } } as any);
      const entry = { id: `off-${Date.now()}`, ts: Date.now(), date: o.date, score: Math.round(o.score), source: o.source || 'Official practice test', modelScore: d.estimate.score };
      await saveProfile({ ...s.profile, officialScores: [...(s.profile.officialScores ?? []), entry] });
    },
    async removeOfficialScore(id) { const p = get().profile; await saveProfile({ ...p, officialScores: (p.officialScores ?? []).filter((x) => x.id !== id) }); },
    async saveAiQuestion(q) { registerExtra(q); await safe(db.aiQuestions.put(q), fail); bump(); },
    async addXp(xp, why) { await gainXp(xp); if (why) get().pushToast({ kind: 'xp', text: `+${xp} XP`, sub: why }); },

    pushToast(t) { const id = toastId++; set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id }] })); setTimeout(() => get().dismissToast(id), t.kind === 'error' ? 8000 : 4200); },
    dismissToast(id) { set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })); },

    async exportData() {
      const [profile, attempts, srs, exams, sessions, daily, aiQuestions] = await Promise.all([db.profile.get('me'), db.attempts.toArray(), db.srs.toArray(), db.exams.toArray(), db.sessions.toArray(), db.daily.toArray(), db.aiQuestions.toArray()]);
      return JSON.stringify({ app: 'gre-quant-mastery', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), profile: profile ?? get().profile, attempts, srs, exams, sessions, daily, aiQuestions }, null, 1);
    },

    async importData(json) {
      let data: any;
      try { data = JSON.parse(json); } catch { return { ok: false, message: 'File is not valid JSON.' }; }
      if (data?.app !== 'gre-quant-mastery' || typeof data.schema !== 'number') return { ok: false, message: 'This file is not a GRE Quant Mastery export.' };
      if (data.schema > SCHEMA_VERSION) return { ok: false, message: 'This export comes from a newer version of the app.' };
      const arr = (x: unknown) => (Array.isArray(x) ? x : []);
      const attempts = arr(data.attempts).filter((a: any) => a && typeof a.qid === 'string' && typeof a.ts === 'number' && typeof a.correct === 'boolean' && typeof a.level === 'number');
      const srs = arr(data.srs).filter((i: any) => i && typeof i.qid === 'string' && typeof i.stage === 'number').map((i: any) => ({ ...i, due: typeof i.due === 'number' ? i.due : 8.64e15 }));
      const profile: Profile = { ...defaultProfile(), ...(data.profile ?? {}), id: 'me', settings: { ...defaultProfile().settings, ...(data.profile?.settings ?? {}) } };
      try {
        await db.transaction('rw', [db.profile, db.attempts, db.srs, db.exams, db.sessions, db.daily, db.aiQuestions], async () => {
          await Promise.all([db.profile.clear(), db.attempts.clear(), db.srs.clear(), db.exams.clear(), db.sessions.clear(), db.daily.clear(), db.aiQuestions.clear()]);
          await db.profile.put(profile);
          await db.attempts.bulkAdd(attempts.map(({ id, ...a }: any) => a));
          await db.srs.bulkPut(srs);
          await db.exams.bulkPut(arr(data.exams));
          await db.sessions.bulkPut(arr(data.sessions));
          await db.daily.bulkPut(arr(data.daily));
          await db.aiQuestions.bulkPut(arr(data.aiQuestions).filter((q: any) => q && !validateQuestion(q).length));
        });
      } catch (e) { return { ok: false, message: `Import failed: ${(e as Error).message}` }; }
      await get().init();
      return { ok: true, message: `Imported ${attempts.length} attempts, ${srs.length} review items and ${arr(data.exams).length} exams.` };
    },

    async resetAll() {
      await Promise.all([db.profile.clear(), db.attempts.clear(), db.srs.clear(), db.exams.clear(), db.sessions.clear(), db.daily.clear(), db.kv.clear(), db.aiQuestions.clear()]);
      set({ profile: defaultProfile(), attempts: [], srs: {}, exams: [], sessions: [], daily: {}, run: 0, bestRun: 0 });
      bump();
      await db.profile.put(get().profile);
    },

    async snapshot(key, value) { await safe(db.kv.put({ key, value, ts: Date.now() } as KV), fail); },
    async loadSnapshot<T>(key: string) { const r = await safe(db.kv.get(key), fail); return (r?.value as T) ?? null; },
    async clearSnapshot(key) { await safe(db.kv.delete(key), fail); },
  };
});
