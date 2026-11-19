import { describe, expect, it } from 'vitest';
import { contentSignature, gunzipJson, gzipJson, mergeExports, type ExportData } from '../src/engine/merge';
import { defaultProfile } from '../src/store/store';
import type { Attempt, DailyLog, Profile, SessionResult, SrsItem } from '../src/engine/types';

const att = (qid: string, ts: number, correct = true, sessionId = 's'): Attempt => ({ qid, generatorId: qid.split('~')[0], unit: 'ar.percents', category: 'arithmetic', format: 'mcq', di: false, level: 3, mode: 'practice', correct, skipped: false, timeMs: 30000, targetSec: 90, answer: { kind: 'mcq', choice: 0 } as any, ts, hintsUsed: 0, sessionId });
const log = (date: string, q: number, extra: Partial<DailyLog> = {}): DailyLog => ({ date, questions: q, correct: Math.floor(q / 2), timeMs: q * 1000, xp: q * 5, reviews: 0, speedDrills: 0, modes: { practice: q }, planDone: {}, objectivesClaimed: [], ...extra });
const srs = (qid: string, stage: number, lastReviewed?: number): SrsItem => ({ qid, generatorId: 'g', unit: 'u', stage, due: 1e13, lapses: 0, missCount: 1, createdAt: 1000, lastReviewed, graduated: false });
const sess = (id: string, ts: number): SessionResult => ({ id, mode: 'practice', ts, total: 10, correct: 7 });

function exp(over: Omit<Partial<ExportData>, 'profile'> & { profile?: Partial<Profile> } = {}): ExportData {
  return { app: 'gre-quant-mastery', schema: 1, profile: { ...defaultProfile(), ...(over.profile ?? {}) }, attempts: [], srs: [], exams: [], sessions: [], daily: [], aiQuestions: [], ...over, ...(over.profile ? { profile: { ...defaultProfile(), ...over.profile } } : {}) } as ExportData;
}

const laptop = exp({
  profile: { xp: 500, name: 'Laptop name', targetScore: 165, editedAt: 2000, achievements: { first10: 100 }, bookmarks: ['q1'], officialScores: [{ id: 'o1', ts: 5, date: '2026-11-01', score: 158, source: 'POWERPREP Online', modelScore: 155 }], ratings: { _global: 1600 } },
  attempts: [att('a~3~1', 100), att('a~3~2', 200, false), att('b~2~1', 300)],
  srs: [srs('a~3~2', 1, 250)],
  sessions: [sess('s1', 150)],
  daily: [log('2026-11-18', 3, { planDone: { x: true }, dailyChallengeScore: 120 })],
});
const phone = exp({
  profile: { xp: 300, name: 'Phone name', targetScore: 160, editedAt: 1000, achievements: { first10: 50, streak3: 400 }, bookmarks: ['q2'], ratings: { _global: 1550, 'ar.percents': 1500 } },
  attempts: [att('a~3~1', 100), att('c~4~1', 400)], // first one is the same attempt synced earlier
  srs: [srs('a~3~2', 2, 450), srs('c~4~1', 0, 410)],
  sessions: [sess('s1', 150), sess('s2', 420)],
  daily: [log('2026-11-18', 5, { planDone: { y: true } }), log('2026-11-19', 2)],
});

describe('progress merge', () => {
  const m = mergeExports(laptop, phone);

  it('keeps every distinct attempt exactly once, in time order', () => {
    expect(m.attempts.map((a) => `${a.qid}@${a.ts}`)).toEqual(['a~3~1@100', 'a~3~2@200', 'b~2~1@300', 'c~4~1@400']);
  });
  it('unions sessions and daily logs (max per field, OR plan ticks)', () => {
    expect(m.sessions.map((s) => s.id)).toEqual(['s1', 's2']);
    const d = m.daily.find((x) => x.date === '2026-11-18')!;
    expect(d.questions).toBe(5);
    expect(d.planDone).toEqual({ x: true, y: true });
    expect(d.dailyChallengeScore).toBe(120);
    expect(m.daily.map((x) => x.date)).toEqual(['2026-11-18', '2026-11-19']);
  });
  it('takes the most recently reviewed SRS state', () => {
    expect(m.srs.find((i) => i.qid === 'a~3~2')!.stage).toBe(2);
    expect(m.srs).toHaveLength(2);
  });
  it('profile: settings from the last-edited side, progress fields merged', () => {
    expect(m.profile.name).toBe('Laptop name');
    expect(m.profile.targetScore).toBe(165);
    expect(m.profile.xp).toBe(500);
    expect(m.profile.achievements).toEqual({ first10: 50, streak3: 400 });
    expect(m.profile.bookmarks).toEqual(['q1', 'q2']);
    expect(m.profile.officialScores).toHaveLength(1);
    // phone has the latest attempt, so its ratings win where both have a value
    expect(m.profile.ratings).toEqual({ _global: 1550, 'ar.percents': 1500 });
  });
  it('a fresh device never overrides the cloud settings', () => {
    const fresh = exp();
    const r = mergeExports(fresh, laptop);
    expect(r.profile.name).toBe('Laptop name');
    expect(r.attempts).toHaveLength(3);
  });
  it('is commutative for the study record and idempotent', () => {
    const m2 = mergeExports(phone, laptop);
    expect(contentSignature(m2)).toBe(contentSignature(m));
    expect(m2.attempts).toEqual(m.attempts);
    const again = mergeExports(m, phone);
    expect(contentSignature(again)).toBe(contentSignature(m));
    expect(again.attempts).toEqual(m.attempts);
    expect(again.daily).toEqual(m.daily);
  });
  it('signature changes when anything new is studied', () => {
    const more = { ...m, attempts: [...m.attempts, att('d~1~1', 999)] };
    expect(contentSignature(more)).not.toBe(contentSignature(m));
  });
  it('gzip round-trips and compresses', async () => {
    const big = { ...m, attempts: Array.from({ length: 3000 }, (_, i) => att(`g${i % 50}~3~${i}`, 1000 + i, i % 3 > 0)) };
    const z = await gzipJson(big);
    expect(z.length).toBeLessThan(JSON.stringify(big).length / 5);
    const back = await gunzipJson<ExportData>(z);
    expect(back.attempts).toHaveLength(3000);
    expect(back.attempts[17]).toEqual(big.attempts[17]);
  });
});
