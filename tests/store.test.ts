import { useStore } from '../src/store/store';
import { db } from '../src/store/db';
import { getBank } from '../src/engine/bank';
import { computeDerived } from '../src/store/derived';

const S = () => useStore.getState();
const bank = getBank();

beforeAll(async () => {
  await S().init();
  await S().resetAll();
});

describe('persistent store', () => {
  it('records attempts, awards XP, and queues misses for review', async () => {
    const q = bank.find((x) => x.format === 'mcq' && x.level === 3)!;
    const wrong = ((q.answer as number) + 1) % 5;
    const r1 = await S().recordAttempt({ q, answer: wrong, correct: false, timeMs: 50000, mode: 'practice', sessionId: 't1' });
    expect(r1.attempt.correct).toBe(false);
    expect(r1.attempt.autoErrorType).toBeTruthy();
    expect(S().srs[q.id]).toBeTruthy();
    expect(S().srs[q.id].stage).toBe(0);
    const before = S().profile.xp;
    const q2 = bank.find((x) => x.format === 'qc' && x.level === 4)!;
    const r2 = await S().recordAttempt({ q: q2, answer: q2.answer as number, correct: true, timeMs: 40000, mode: 'practice', sessionId: 't1' });
    expect(r2.xp).toBeGreaterThan(0);
    expect(S().profile.xp).toBe(before + r2.xp);
  });

  it('survives a reload (re-initialising from IndexedDB)', async () => {
    const n = S().attempts.length, xp = S().profile.xp, srsKeys = Object.keys(S().srs);
    useStore.setState({ attempts: [], srs: {}, ready: false });
    await S().init();
    expect(S().attempts.length).toBe(n);
    expect(S().profile.xp).toBe(xp);
    expect(Object.keys(S().srs)).toEqual(srsKeys);
    expect(await db.attempts.count()).toBe(n);
  });

  it('advances spaced repetition on a correct review', async () => {
    const key = Object.keys(S().srs)[0];
    const q = bank.find((x) => x.id === key)!;
    await S().recordAttempt({ q, answer: q.answer as number, correct: true, timeMs: 30000, mode: 'review', sessionId: 't2', isReview: true, srsKey: key });
    expect(S().srs[key].stage).toBe(1);
    expect(S().srs[key].due).toBeGreaterThan(Date.now() + 3 * 3600 * 1000);
  });

  it('unlocks achievements from real activity', async () => {
    for (const q of bank.filter((x) => x.level === 2).slice(0, 10)) {
      await S().recordAttempt({ q, answer: q.format === 'numeric' ? 'x' : (q.answer as any), correct: true, timeMs: 20000, mode: 'practice', sessionId: 't3' });
    }
    expect(S().profile.achievements.first10).toBeTruthy();
    expect(S().bestRun).toBeGreaterThanOrEqual(10);
    expect(S().profile.achievements.run10).toBeTruthy();
  });

  it('derived analytics reflect recorded data', () => {
    const d = computeDerived(S());
    expect(d.totals.n).toBe(S().attempts.length);
    expect(d.totals.correct).toBe(S().attempts.filter((a) => a.correct).length);
    expect(d.errors.reduce((a, e) => a + e.count, 0)).toBe(d.totals.incorrect);
    expect(d.estimate.score).not.toBeNull();
    expect(d.daily.length).toBeGreaterThanOrEqual(1);
  });

  it('lets the user tag an error type', async () => {
    const miss = S().attempts.find((a) => !a.correct)!;
    await S().setErrorType(miss.id!, 'misread');
    expect(S().attempts.find((a) => a.id === miss.id)!.errorType).toBe('misread');
    expect((await db.attempts.get(miss.id!))!.errorType).toBe('misread');
  });

  it('exports and re-imports all progress', async () => {
    const json = await S().exportData();
    const n = S().attempts.length, xp = S().profile.xp;
    await S().resetAll();
    expect(S().attempts.length).toBe(0);
    const res = await S().importData(json);
    expect(res.ok).toBe(true);
    expect(S().attempts.length).toBe(n);
    expect(S().profile.xp).toBe(xp);
  });

  it('rejects invalid imports without touching data', async () => {
    const n = S().attempts.length;
    expect((await S().importData('not json')).ok).toBe(false);
    expect((await S().importData(JSON.stringify({ app: 'other' }))).ok).toBe(false);
    expect(S().attempts.length).toBe(n);
  });

  it('stores and restores session snapshots (interrupted-session recovery)', async () => {
    await S().snapshot('mock', { section: 1, idx: 4 });
    expect(await S().loadSnapshot('mock')).toEqual({ section: 1, idx: 4 });
    await S().clearSnapshot('mock');
    expect(await S().loadSnapshot('mock')).toBeNull();
  });
});

describe('official scores', () => {
  it('records the model estimate at entry time and calibrates derived estimates', async () => {
    const before = computeDerived(S()).estimate.score!;
    await S().addOfficialScore({ date: '2026-11-20', score: Math.min(170, before + 10), source: 'POWERPREP Online' });
    const o = S().profile.officialScores.at(-1)!;
    expect(o.modelScore).toBe(before);
    const after = computeDerived(S()).estimate.score!;
    expect(after).toBeGreaterThan(before);
    await S().removeOfficialScore(o.id);
    expect(computeDerived(S()).estimate.score).toBe(before);
  });
});
