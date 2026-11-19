// Cloud account + cross-device sync client (talks to worker/index.ts).
// Local IndexedDB stays the source of truth; the cloud copy is merged in, never blindly overwritten.
import { create } from 'zustand';
import { useStore } from '../store/store';
import { contentSignature, gunzipJson, gzipJson, mergeExports, type ExportData } from '../engine/merge';
import { dayKey } from '../engine/gamification';

export interface Account { username: string; token: string; friendCode: string; share: boolean; rev: number; lastSync?: number; postedDaily?: Record<string, number> }
interface SyncState {
  available: boolean | null;         // does this deployment have the sync API?
  account: Account | null;
  status: 'idle' | 'syncing' | 'error';
  message: string | null;
}

const KEY = 'gqm-account';
const load = (): Account | null => { try { const a = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return a?.token ? a : null; } catch { return null; } };
const save = (a: Account | null) => { try { a ? localStorage.setItem(KEY, JSON.stringify(a)) : localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

export const useSync = create<SyncState>(() => ({ available: null, account: load(), status: 'idle', message: null }));
const setAccount = (patch: Partial<Account> | null) => {
  const cur = useSync.getState().account;
  const next = patch === null ? null : cur ? { ...cur, ...patch } : null;
  save(next); useSync.setState({ account: next });
};

export class ApiError extends Error { constructor(public status: number, message: string, public body?: any) { super(message); } }
async function api(method: string, path: string, opts: { body?: unknown; raw?: string; headers?: Record<string, string>; auth?: boolean } = {}) {
  const tok = useSync.getState().account?.token;
  const r = await fetch(path, {
    method,
    headers: { ...(opts.auth !== false && tok ? { authorization: `Bearer ${tok}` } : {}), ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(opts.raw !== undefined ? { 'content-type': 'text/plain' } : {}), ...opts.headers },
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    cache: 'no-store',
  });
  if (r.status === 401 && opts.auth !== false && tok) {
    setAccount(null);
    useSync.setState({ status: 'error', message: 'Your session expired. Sign in again to keep syncing (your progress on this device is safe).' });
  }
  return r;
}
const fail = async (r: Response) => { const j = await r.json().catch(() => ({})); return new ApiError(r.status, j.error ?? `Request failed (${r.status})`, j); };

export async function checkAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    const ok = r.ok && (r.headers.get('content-type') ?? '').includes('json') && !!(await r.json()).sync;
    useSync.setState({ available: ok });
    return ok;
  } catch { useSync.setState({ available: false }); return false; }
}

// ---------- base64 for binary payloads ----------
const toB64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ---------- account ----------
async function authenticate(kind: 'signup' | 'login', username: string, passphrase: string) {
  const r = await api('POST', `/api/auth/${kind}`, { body: { username, passphrase }, auth: false });
  if (!r.ok) throw await fail(r);
  const j = await r.json();
  const acct: Account = { username: j.user.username, token: j.token, friendCode: j.user.friendCode, share: j.user.share, rev: 0 };
  save(acct); useSync.setState({ account: acct, message: null, status: 'idle' });
  await syncNow();
}
export const signUp = (u: string, p: string) => authenticate('signup', u, p);
export const signIn = (u: string, p: string) => authenticate('login', u, p);

export async function signOut() {
  await api('POST', '/api/auth/logout').catch(() => {});
  setAccount(null);
  useSync.setState({ status: 'idle', message: 'Signed out. Your progress stays on this device.' });
}

export async function deleteAccount(passphrase: string) {
  const r = await api('DELETE', '/api/account', { body: { passphrase } });
  if (!r.ok) throw await fail(r);
  setAccount(null);
  useSync.setState({ status: 'idle', message: 'Cloud account deleted. Your progress stays on this device.' });
}

export async function setSharing(share: boolean) {
  const r = await api('POST', '/api/me', { body: { share } });
  if (!r.ok) throw await fail(r);
  setAccount({ share });
}

// ---------- sync ----------
let inflight: Promise<void> | null = null;
let applying = false;

/** Download → merge → (import if the cloud had anything new) → upload if the cloud is behind. */
export function syncNow(): Promise<void> {
  if (!useSync.getState().account) return Promise.resolve();
  return (inflight ??= (async () => {
    useSync.setState({ status: 'syncing', message: null });
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const local = JSON.parse(await useStore.getState().exportData()) as ExportData;
        const g = await api('GET', '/api/sync');
        if (!g.ok && g.status !== 204) throw await fail(g);
        const rev = Number(g.headers.get('x-rev') ?? '0');
        const remote = g.status === 200 ? await gunzipJson<ExportData>(fromB64(await g.text())) : null;
        const merged = remote ? mergeExports(local, remote) : local;
        const sig = contentSignature(merged);
        if (remote && sig !== contentSignature(local)) {
          applying = true;
          try { const res = await useStore.getState().importData(JSON.stringify(merged)); if (!res.ok) throw new Error(res.message); }
          finally { applying = false; }
        }
        if (!remote || sig !== contentSignature(remote)) {
          const p = await api('PUT', '/api/sync', { raw: toB64(await gzipJson(merged)), headers: { 'x-base-rev': String(rev) } });
          if (p.status === 409) continue; // another device wrote in between: merge again
          if (!p.ok) throw await fail(p);
          setAccount({ rev: (await p.json()).rev, lastSync: Date.now() });
        } else setAccount({ rev, lastSync: Date.now() });
        useSync.setState({ status: 'idle' });
        await postDailyScores();
        return;
      }
      throw new Error('Sync kept conflicting with another device. Try again in a moment.');
    } catch (e) {
      if (useSync.getState().account) useSync.setState({ status: 'error', message: e instanceof ApiError || e instanceof Error ? e.message : 'Sync failed.' });
      else useSync.setState({ status: 'idle' });
    } finally { inflight = null; }
  })());
}

/** Post today's best Daily Challenge score for the friends leaderboard (server keeps the max). */
async function postDailyScores() {
  const acct = useSync.getState().account;
  if (!acct) return;
  const today = dayKey(Date.now());
  const best = useStore.getState().sessions.filter((s) => s.mode === 'daily' && dayKey(s.ts) === today).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if (!best || (acct.postedDaily?.[today] ?? -1) >= (best.score ?? 0)) return;
  const r = await api('POST', '/api/scores', { body: { day: today, points: Math.round(best.score ?? 0), correct: best.correct, total: best.total } });
  if (r.ok) setAccount({ postedDaily: { [today]: best.score ?? 0 } });
}

// ---------- automatic sync ----------
let timer: ReturnType<typeof setTimeout> | undefined;
const schedule = (ms: number) => { clearTimeout(timer); timer = setTimeout(() => { void syncNow(); }, ms); };

export function initSync() {
  if (typeof window === 'undefined') return;
  checkAvailable().then((ok) => { if (ok && useSync.getState().account) schedule(1500); });
  // finished sessions/exams sync quickly; individual answers are batched
  let last = { a: 0, s: 0, e: 0, p: 0 };
  useStore.subscribe((st) => {
    if (!st.ready || applying || !useSync.getState().account) return;
    const now = { a: st.attempts.length, s: st.sessions.length, e: st.exams.length, p: st.profile.editedAt ?? 0 };
    if (now.s !== last.s || now.e !== last.e) schedule(2500);
    else if (now.a !== last.a || now.p !== last.p) schedule(30000);
    last = now;
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer && useSync.getState().account) { clearTimeout(timer); timer = undefined; void syncNow(); } });
  window.addEventListener('online', () => { if (useSync.getState().account) schedule(1000); });
}

// ---------- friends & leaderboard ----------
export interface Board { day: string; from: string; sharing: boolean; rows: { username: string; me: boolean; today: number | null; todayAcc: string | null; week: number; days: number }[] }
export interface Friends { me: { username: string; friendCode: string; share: boolean }; friends: { username: string; sharing: boolean }[] }
const getJson = async <T,>(path: string): Promise<T> => { const r = await api('GET', path); if (!r.ok) throw await fail(r); return r.json(); };
export const fetchFriends = () => getJson<Friends>('/api/friends');
export const fetchBoard = () => getJson<Board>(`/api/leaderboard?day=${dayKey(Date.now())}`);
export async function addFriend(code: string) { const r = await api('POST', '/api/friends', { body: { code } }); if (!r.ok) throw await fail(r); return (await r.json()).username as string; }
export async function removeFriend(username: string) { const r = await api('DELETE', `/api/friends/${encodeURIComponent(username)}`); if (!r.ok) throw await fail(r); }
