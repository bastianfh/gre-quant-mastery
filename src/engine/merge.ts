// Merges two progress exports (this device + cloud copy) for cross-device sync.
// Properties: commutative for the study record, idempotent (merge(a, merge(a, b)) == merge(a, b)),
// never loses an attempt, exam or session. Settings follow whichever side edited them last.
import type { Attempt, DailyLog, ExamResult, Profile, Question, SessionResult, SrsItem } from './types';

export interface ExportData {
  app: 'gre-quant-mastery';
  schema: number;
  exportedAt?: string;
  profile: Profile;
  attempts: Attempt[];
  srs: SrsItem[];
  exams: ExamResult[];
  sessions: SessionResult[];
  daily: DailyLog[];
  aiQuestions: Question[];
}

const arr = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);
function unionBy<T>(a: T[], b: T[], key: (x: T) => string, pick: (x: T, y: T) => T = (x) => x): T[] {
  const m = new Map<string, T>();
  for (const x of a) m.set(key(x), x);
  for (const y of b) { const k = key(y); const x = m.get(k); m.set(k, x === undefined ? y : pick(x, y)); }
  return [...m.values()];
}
const uniq = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b])].sort();
function mergeRec(a: Record<string, number> = {}, b: Record<string, number> = {}, f: (x: number, y: number) => number) {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? f(out[k], v) : v;
  return out;
}

export const attemptKey = (a: Attempt) => `${a.qid}|${a.ts}|${a.sessionId}`;

function mergeDaily(x: DailyLog, y: DailyLog): DailyLog {
  // Max (not sum) keeps repeated merges idempotent; same-day study on two devices is slightly undercounted.
  const max = (k: 'questions' | 'correct' | 'timeMs' | 'xp' | 'reviews' | 'speedDrills') => Math.max(x[k] ?? 0, y[k] ?? 0);
  const more = (x.questions ?? 0) >= (y.questions ?? 0) ? x : y;
  const dcs = Math.max(x.dailyChallengeScore ?? -1, y.dailyChallengeScore ?? -1);
  return {
    date: x.date,
    questions: max('questions'), correct: max('correct'), timeMs: max('timeMs'), xp: max('xp'), reviews: max('reviews'), speedDrills: max('speedDrills'),
    modes: mergeRec(x.modes, y.modes, Math.max),
    planDone: Object.fromEntries(Object.entries({ ...x.planDone, ...y.planDone }).map(([k]) => [k, !!(x.planDone?.[k] || y.planDone?.[k])])),
    objectivesClaimed: uniq(x.objectivesClaimed, y.objectivesClaimed),
    ...(dcs >= 0 ? { dailyChallengeScore: dcs } : {}),
    ...(more.estScore !== undefined ? { estScore: more.estScore } : {}),
  };
}

function mergeProfile(a: Profile, b: Profile, aLastAttempt: number, bLastAttempt: number): Profile {
  const edited = (a.editedAt ?? 0) >= (b.editedAt ?? 0) ? a : b;
  const fresher = aLastAttempt >= bLastAttempt ? a : b; // ratings evolve with attempts
  return {
    ...edited,
    id: 'me',
    xp: Math.max(a.xp ?? 0, b.xp ?? 0),
    achievements: mergeRec(a.achievements, b.achievements, Math.min),
    lessonsCompleted: mergeRec(a.lessonsCompleted, b.lessonsCompleted, Math.min),
    lessonMastery: mergeRec(a.lessonMastery, b.lessonMastery, Math.max),
    bookmarks: uniq(a.bookmarks, b.bookmarks),
    flagged: uniq(a.flagged, b.flagged),
    formulaBookmarks: uniq(a.formulaBookmarks, b.formulaBookmarks),
    reports: unionBy(arr(a.reports), arr(b.reports), (r) => `${r.qid}|${r.ts}`).sort((x, y) => x.ts - y.ts),
    officialScores: unionBy(arr(a.officialScores), arr(b.officialScores), (o) => o.id).sort((x, y) => x.ts - y.ts),
    ratings: { ...(fresher === a ? b.ratings : a.ratings), ...fresher.ratings },
    diagnosticDone: !!(a.diagnosticDone || b.diagnosticDone),
    createdAt: Math.min(a.createdAt ?? Date.now(), b.createdAt ?? Date.now()),
    version: Math.max(a.version ?? 1, b.version ?? 1),
    editedAt: Math.max(a.editedAt ?? 0, b.editedAt ?? 0) || undefined,
  };
}

export function mergeExports(local: ExportData, remote: ExportData): ExportData {
  const la = arr(local.attempts), ra = arr(remote.attempts);
  const lastTs = (xs: Attempt[]) => xs.reduce((m, a) => Math.max(m, a.ts), 0);
  const attempts = unionBy(la, ra, attemptKey).map(({ id, ...a }) => a as Attempt).sort((x, y) => x.ts - y.ts || attemptKey(x).localeCompare(attemptKey(y)));
  const srsTime = (i: SrsItem) => i.lastReviewed ?? i.createdAt ?? 0;
  return {
    app: 'gre-quant-mastery',
    schema: Math.max(local.schema ?? 1, remote.schema ?? 1),
    exportedAt: new Date().toISOString(),
    profile: mergeProfile(local.profile, remote.profile, lastTs(la), lastTs(ra)),
    attempts,
    srs: unionBy(arr(local.srs), arr(remote.srs), (i) => i.qid, (x, y) => (srsTime(y) > srsTime(x) || (srsTime(y) === srsTime(x) && y.stage > x.stage) ? y : x)).sort((x, y) => x.qid.localeCompare(y.qid)),
    exams: unionBy(arr(local.exams), arr(remote.exams), (e) => e.id).sort((x, y) => x.finishedAt - y.finishedAt),
    sessions: unionBy(arr(local.sessions), arr(remote.sessions), (s) => s.id).sort((x, y) => x.ts - y.ts),
    daily: unionBy(arr(local.daily), arr(remote.daily), (d) => d.date, mergeDaily).sort((x, y) => x.date.localeCompare(y.date)),
    aiQuestions: unionBy(arr(local.aiQuestions), arr(remote.aiQuestions), (q) => q.id),
  };
}

/** Fingerprint of the study record, used to skip uploads/imports when nothing changed. */
export function contentSignature(d: ExportData): string {
  const p = d.profile;
  return [arr(d.attempts).length, arr(d.attempts).reduce((m, a) => Math.max(m, a.ts), 0), arr(d.exams).length, arr(d.sessions).length, arr(d.srs).length,
    arr(d.srs).reduce((m, i) => Math.max(m, i.lastReviewed ?? 0), 0), arr(d.daily).length, p?.xp ?? 0, p?.editedAt ?? 0,
    Object.keys(p?.achievements ?? {}).length, (p?.bookmarks ?? []).length, (p?.officialScores ?? []).length, Object.keys(p?.lessonsCompleted ?? {}).length].join(':');
}

// ---------- compression (browser + Node 18+) ----------
export async function gzipJson(obj: unknown): Promise<Uint8Array> {
  const stream = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function gunzipJson<T>(bytes: ArrayBuffer | Uint8Array): Promise<T> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text()) as T;
}
