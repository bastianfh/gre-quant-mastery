// API test for the Cloudflare Worker (accounts, sync, friends, leaderboard).
// Usage: npx wrangler dev --port 8788 &  then  node scripts/api-test.mjs [baseUrl]
const BASE = process.argv[2] ?? 'http://localhost:8788';
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };
const call = async (method, path, { token, body, raw, headers = {} } = {}) => {
  const r = await fetch(BASE + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, j, text, headers: r.headers };
};
const sfx = Date.now().toString(36);
const A = `alice_${sfx}`, B = `bob_${sfx}`;

const h = await call('GET', '/api/health');
check('health reports sync', h.status === 200 && h.j?.sync === true, h.text);
check('unknown api route is JSON 401/404', [401, 404].includes((await call('GET', '/api/nope')).status));
check('static site still served', (await fetch(BASE + '/')).headers.get('content-type')?.includes('text/html'));

check('signup rejects short passphrase', (await call('POST', '/api/auth/signup', { body: { username: A, passphrase: 'short' } })).status === 400);
check('signup rejects bad username', (await call('POST', '/api/auth/signup', { body: { username: 'a b', passphrase: 'long enough pass' } })).status === 400);
const sa = await call('POST', '/api/auth/signup', { body: { username: A, passphrase: 'correct horse battery' } });
check('signup alice', sa.status === 201 && !!sa.j?.token && sa.j.user.friendCode.length === 8, sa.text);
check('duplicate username (case-insensitive) rejected', (await call('POST', '/api/auth/signup', { body: { username: A.toUpperCase(), passphrase: 'another passphrase' } })).status === 409);
const sb = await call('POST', '/api/auth/signup', { body: { username: B, passphrase: 'bob passphrase 1' } });
const ta = sa.j.token, tb = sb.j.token;

check('wrong passphrase rejected', (await call('POST', '/api/auth/login', { body: { username: A, passphrase: 'nope nope nope' } })).status === 401);
const la = await call('POST', '/api/auth/login', { body: { username: A.toUpperCase(), passphrase: 'correct horse battery' } });
check('login (case-insensitive username)', la.status === 200 && !!la.j?.token);
check('no token → 401', (await call('GET', '/api/sync')).status === 401);
check('bad token → 401', (await call('GET', '/api/sync', { token: 'x'.repeat(40) })).status === 401);

// sync
check('empty sync → 204', (await call('GET', '/api/sync', { token: ta })).status === 204);
const blob1 = Buffer.from('hello progress v1').toString('base64');
const p1 = await call('PUT', '/api/sync', { token: ta, raw: blob1, headers: { 'x-base-rev': '0', 'content-type': 'text/plain' } });
check('first upload → rev 1', p1.status === 200 && p1.j.rev === 1, p1.text);
const g1 = await call('GET', '/api/sync', { token: la.j.token });
check('second device downloads same data', g1.status === 200 && g1.text === blob1 && g1.headers.get('x-rev') === '1');
const stale = await call('PUT', '/api/sync', { token: ta, raw: blob1, headers: { 'x-base-rev': '0', 'content-type': 'text/plain' } });
check('stale base rev → 409 with current rev', stale.status === 409 && stale.j.rev === 1, stale.text);
const p2 = await call('PUT', '/api/sync', { token: ta, raw: Buffer.from('v2').toString('base64'), headers: { 'x-base-rev': '1', 'content-type': 'text/plain' } });
check('upload on current rev → rev 2', p2.status === 200 && p2.j.rev === 2);
check('bob cannot see alice data', (await call('GET', '/api/sync', { token: tb })).status === 204);
check('oversized upload rejected', (await call('PUT', '/api/sync', { token: tb, raw: 'A'.repeat(1_950_000), headers: { 'x-base-rev': '0', 'content-type': 'text/plain' } })).status === 413);

// friends + leaderboard
const today = new Date().toISOString().slice(0, 10);
check('own friend code rejected', (await call('POST', '/api/friends', { token: ta, body: { code: sa.j.user.friendCode } })).status === 400);
check('unknown friend code → 404', (await call('POST', '/api/friends', { token: ta, body: { code: 'ZZZZZZZZ' } })).status === 404);
const af = await call('POST', '/api/friends', { token: ta, body: { code: sb.j.user.friendCode.toLowerCase() } });
check('alice adds bob by code', af.status === 200 && af.j.username === B, af.text);
const fb = await call('GET', '/api/friends', { token: tb });
check('friendship is mutual', fb.j?.friends?.some((f) => f.username === A));
check('score for another day rejected', (await call('POST', '/api/scores', { token: ta, body: { day: '2001-01-01', points: 50, correct: 5, total: 10 } })).status === 400);
check('invalid score rejected', (await call('POST', '/api/scores', { token: ta, body: { day: today, points: 100, correct: 11, total: 10 } })).status === 400);
await call('POST', '/api/scores', { token: ta, body: { day: today, points: 270, correct: 7, total: 12 } });
await call('POST', '/api/scores', { token: ta, body: { day: today, points: 150, correct: 5, total: 12 } }); // lower: ignored
await call('POST', '/api/scores', { token: tb, body: { day: today, points: 390, correct: 9, total: 12 } });
let lb = await call('GET', `/api/leaderboard?day=${today}`, { token: ta });
check('leaderboard keeps best score', lb.j.rows.find((r) => r.me)?.today === 270 && lb.j.rows.find((r) => r.me)?.todayAcc === '7/12', lb.text);
check('friend hidden until they opt in', !lb.j.rows.some((r) => r.username === B));
await call('POST', '/api/me', { token: tb, body: { share: true } });
lb = await call('GET', `/api/leaderboard?day=${today}`, { token: ta });
const bobRow = lb.j.rows.find((r) => r.username === B);
check('friend visible after opting in', bobRow?.today === 390 && bobRow.week === 390 && bobRow.days === 1, lb.text);
await call('DELETE', `/api/friends/${encodeURIComponent(B)}`, { token: ta });
lb = await call('GET', `/api/leaderboard?day=${today}`, { token: ta });
check('removing a friend hides them', !lb.j.rows.some((r) => r.username === B));

// lockout after repeated failures
for (let i = 0; i < 5; i++) await call('POST', '/api/auth/login', { body: { username: B, passphrase: 'wrong wrong ' + i } });
check('lockout after 5 failures', (await call('POST', '/api/auth/login', { body: { username: B, passphrase: 'bob passphrase 1' } })).status === 429);

// logout + delete
check('logout', (await call('POST', '/api/auth/logout', { token: la.j.token })).status === 200);
check('token revoked after logout', (await call('GET', '/api/me', { token: la.j.token })).status === 401);
check('delete needs passphrase', (await call('DELETE', '/api/account', { token: ta, body: { passphrase: 'wrong' } })).status === 401);
check('delete account', (await call('DELETE', '/api/account', { token: ta, body: { passphrase: 'correct horse battery' } })).status === 200);
check('deleted user cannot log in', (await call('POST', '/api/auth/login', { body: { username: A, passphrase: 'correct horse battery' } })).status === 401);

console.log(`\n${pass}/${pass + fail} API checks passed`);
process.exit(fail ? 1 : 0);
