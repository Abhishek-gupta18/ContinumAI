'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../server');
const { createSupabaseAuthenticator, createCombinedAuthenticate } = require('../auth/authenticators');

const BASE = 'https://fake.supabase.co';
const ANON_KEY = 'anon-key';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_B_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const T0 = 1_700_000_000_000;

function makeJwt(payload) {
  const mid = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `h.${mid}.s`;
}

function useTempSessionsDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-auth-'));
  const previous = process.env.SESSIONS_DIR;
  process.env.SESSIONS_DIR = dir;
  t.after(() => {
    if (previous === undefined) {
      delete process.env.SESSIONS_DIR;
    } else {
      process.env.SESSIONS_DIR = previous;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

function makeClock(start) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

function fakeFetch(status, body, calls) {
  return async (url, init) => {
    calls.push({ url, headers: init.headers });
    return {
      status,
      json: async () => body,
    };
  };
}

test('A1: valid token -> { id } and exactly one fetch with the right URL and headers', async () => {
  const clock = makeClock(T0);
  const calls = [];
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE + '/',
    anonKey: ANON_KEY,
    fetchImpl: fakeFetch(200, { id: USER_ID }, calls),
    now: clock.now,
  });
  const req = { headers: { authorization: `Bearer ${USER_ID}` } };
  const result = await auth(req);
  assert.deepStrictEqual(result, { id: USER_ID });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, `${BASE}/auth/v1/user`);
  assert.deepStrictEqual(calls[0].headers, {
    apikey: ANON_KEY,
    Authorization: `Bearer ${USER_ID}`,
  });
}, { timeout: 5000 });

test('A2: same token again within the ttl -> no second fetch', async () => {
  const clock = makeClock(T0);
  const calls = [];
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: fakeFetch(200, { id: USER_ID }, calls),
    now: clock.now,
  });
  const req = { headers: { authorization: `Bearer ${USER_ID}` } };
  await auth(req);
  await auth(req);
  assert.strictEqual(calls.length, 1, 'cache hit must not refetch');
}, { timeout: 5000 });

test('A3: after advancing now beyond cacheTtlMs -> fetch again', async () => {
  const clock = makeClock(T0);
  const calls = [];
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: fakeFetch(200, { id: USER_ID }, calls),
    cacheTtlMs: 1000,
    now: clock.now,
  });
  const req = { headers: { authorization: `Bearer ${USER_ID}` } };
  await auth(req);
  clock.advance(1001);
  await auth(req);
  assert.strictEqual(calls.length, 2);
}, { timeout: 5000 });

test('A4: expired exp -> null no fetch; token with exp=now+10s (ttl 60s) is no longer served from the cache after 11s', async () => {
  const clock = makeClock(T0);
  const calls = [];
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: fakeFetch(200, { id: USER_ID }, calls),
    cacheTtlMs: 60000,
    now: clock.now,
  });
  const req = { headers: { authorization: 'Bearer ' + makeJwt({ exp: (T0 - 1000) / 1000 }) } };
  const expired = await auth(req);
  assert.strictEqual(expired, null);
  assert.strictEqual(calls.length, 0, 'expired token must be rejected without a fetch');

  const validToken = makeJwt({ exp: (T0 + 10000) / 1000 });
  const req2 = { headers: { authorization: `Bearer ${validToken}` } };
  const first = await auth(req2);
  assert.deepStrictEqual(first, { id: USER_ID });
  assert.strictEqual(calls.length, 1);
  clock.advance(9999);
  const cached = await auth(req2);
  assert.deepStrictEqual(cached, { id: USER_ID }, 'still within the exp cap (10s): cached, no refetch');
  assert.strictEqual(calls.length, 1);
  clock.advance(11);
  assert.strictEqual(calls.length, 1);
  clock.advance(2);
  const afterCap = await auth(req2);
  assert.strictEqual(afterCap, null, 'after the exp cap the cache must not serve the stale entry; the now-expired token is rejected before any refetch');
  assert.strictEqual(calls.length, 1, 'expired token: no refetch (per spec rule 3), only the cap decides cache vs null');
}, { timeout: 5000 });

test('A5: 401 and 403 -> null and not cached', async () => {
  const clock = makeClock(T0);
  for (const status of [401, 403]) {
    const calls = [];
    const auth = createSupabaseAuthenticator({
      supabaseUrl: BASE,
      anonKey: ANON_KEY,
      fetchImpl: fakeFetch(status, {}, calls),
      now: clock.now,
    });
    const req = { headers: { authorization: `Bearer ${USER_ID}` } };
    assert.strictEqual(await auth(req), null);
    const callsAfterFirst = calls.length;
    assert.ok(callsAfterFirst >= 1);
    assert.strictEqual(await auth(req), null, 'same again');
    assert.strictEqual(calls.length, callsAfterFirst + 1, 'rejection must not be cached: refetches');
  }
}, { timeout: 5000 });

test('A6: 500, 429 and a fetch rejection -> throws auth_unavailable', async () => {
  const clock = makeClock(T0);
  for (const status of [500, 429]) {
    const auth = createSupabaseAuthenticator({
      supabaseUrl: BASE,
      anonKey: ANON_KEY,
      fetchImpl: fakeFetch(status, {}, []),
      now: clock.now,
    });
    await assert.rejects(
      () => auth({ headers: { authorization: `Bearer ${USER_ID}` } }),
      /auth_unavailable/
    );
  }
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: async () => { throw new Error('network down'); },
    now: clock.now,
  });
  await assert.rejects(
    () => auth({ headers: { authorization: `Bearer ${USER_ID}` } }),
    /auth_unavailable/
  );
}, { timeout: 5000 });

test('A7: hanging fetch aborted after timeoutMs=50 -> throws within 1s', async () => {
  const clock = makeClock(T0);
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: (url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      // never resolves otherwise
    }),
    timeoutMs: 50,
    now: clock.now,
  });
  const start = Date.now();
  await assert.rejects(
    () => auth({ headers: { authorization: `Bearer ${USER_ID}` } }),
    /auth_unavailable/
  );
  assert.ok(Date.now() - start < 1000, `must throw within 1s, took ${Date.now() - start}ms`);
}, { timeout: 5000 });

test('A8: malformed tokens (contains a space; longer than 4096 chars) -> null with no fetch', async () => {
  const clock = makeClock(T0);
  const calls = [];
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: fakeFetch(200, { id: USER_ID }, calls),
    now: clock.now,
  });
  assert.strictEqual(await auth({ headers: { authorization: 'Bearer to ken' } }), null);
  assert.strictEqual(await auth({ headers: { authorization: 'Bearer ' + 'x'.repeat(5000) } }), null);
  assert.strictEqual(await auth({ headers: { authorization: 'Bearer ' } }), null);
  assert.strictEqual(calls.length, 0);
}, { timeout: 5000 });

test('A9: 200 body with a missing or non-UUID id -> throws auth_unavailable', async () => {
  const clock = makeClock(T0);
  for (const body of [{}, { id: 'not-a-uuid' }, { id: 42 }]) {
    const auth = createSupabaseAuthenticator({
      supabaseUrl: BASE,
      anonKey: ANON_KEY,
      fetchImpl: fakeFetch(200, body, []),
      now: clock.now,
    });
    await assert.rejects(
      () => auth({ headers: { authorization: `Bearer ${USER_ID}` } }),
      /auth_unavailable/
    );
  }
}, { timeout: 5000 });

test('A10: maxEntries 2 and three different tokens -> the first one fetches again', async () => {
  const clock = makeClock(T0);
  const counts = {};
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: async (url, init) => {
      const token = init.headers.Authorization.slice('Bearer '.length);
      counts[token] = (counts[token] || 0) + 1;
      return { status: 200, json: async () => ({ id: USER_ID }) };
    },
    maxEntries: 2,
    now: clock.now,
  });
  const r = (t) => auth({ headers: { authorization: `Bearer ${t}` } });
  await r('t-one');
  await r('t-two');
  await r('t-three');
  assert.deepStrictEqual(counts, { 't-one': 1, 't-two': 1, 't-three': 1 });
  await r('t-one');
  assert.strictEqual(counts['t-one'], 2, 'oldest entry must have been evicted');
  await r('t-three');
  assert.strictEqual(counts['t-three'], 1, 't-three must still be cached');
}, { timeout: 5000 });

test('A11: no header and non-Bearer -> null with no fetch', async () => {
  const clock = makeClock(T0);
  const calls = [];
  const auth = createSupabaseAuthenticator({
    supabaseUrl: BASE,
    anonKey: ANON_KEY,
    fetchImpl: fakeFetch(200, { id: USER_ID }, calls),
    now: clock.now,
  });
  assert.strictEqual(await auth({ headers: {} }), null);
  assert.strictEqual(await auth({ headers: { authorization: 'Basic abc' } }), null);
  assert.strictEqual(calls.length, 0);
}, { timeout: 5000 });

test('A12: the token text never appears in anything logged during the tests', async () => {
  const secret = makeJwt({ exp: (T0 + 60000) / 1000 });
  const captured = [];
  const originals = {};
  for (const m of ['log', 'warn', 'error']) {
    originals[m] = console[m];
    console[m] = (...args) => captured.push(args.map(String).join(' '));
  }
  try {
    const clock = makeClock(T0);
    const auth = createSupabaseAuthenticator({
      supabaseUrl: BASE,
      anonKey: ANON_KEY,
      fetchImpl: fakeFetch(200, { id: USER_ID }, []),
      now: clock.now,
    });
    await auth({ headers: { authorization: `Bearer ${secret}` } });

    const bad = createSupabaseAuthenticator({
      supabaseUrl: BASE,
      anonKey: ANON_KEY,
      fetchImpl: async () => { throw new Error('down'); },
      now: clock.now,
    });
    await assert.rejects(() => bad({ headers: { authorization: `Bearer ${secret}` } }), /auth_unavailable/);

    const combined = createCombinedAuthenticate({ legacyToken: secret, ownerUserId: OWNER_ID, supabase: null });
    await combined({ headers: { authorization: `Bearer ${secret}` } });
  } finally {
    for (const m of ['log', 'warn', 'error']) {
      console[m] = originals[m];
    }
  }
  assert.ok(!captured.some((line) => line.includes(secret)), `token leaked: ${JSON.stringify(captured)}`);
}, { timeout: 5000 });

test('C1: combined - legacy mapped to owner; null owner; disableLegacy; wrong token; different lengths never throw; invalid ownerUserId -> TypeError', async () => {
  const clock = makeClock(T0);
  const supabaseNull = async () => null;
  const legacyOnly = createCombinedAuthenticate({
    legacyToken: 'legacy-secret',
    ownerUserId: OWNER_ID,
    supabase: supabaseNull,
  });
  assert.deepStrictEqual(
    await legacyOnly({ headers: { authorization: 'Bearer legacy-secret' } }),
    { id: OWNER_ID, source: 'legacy' }
  );

  const noOwner = createCombinedAuthenticate({ legacyToken: 'legacy-secret', ownerUserId: null, supabase: supabaseNull });
  assert.deepStrictEqual(
    await noOwner({ headers: { authorization: 'Bearer legacy-secret' } }),
    { id: null, source: 'legacy' }
  );

  const disabled = createCombinedAuthenticate({
    legacyToken: 'legacy-secret',
    ownerUserId: OWNER_ID,
    disableLegacy: true,
    supabase: supabaseNull,
  });
  assert.strictEqual(await disabled({ headers: { authorization: 'Bearer legacy-secret' } }), null);

  assert.strictEqual(await legacyOnly({ headers: { authorization: 'Bearer wrong-token' } }), null);

  const differentLengths = createCombinedAuthenticate({
    legacyToken: 'legacy-secret',
    ownerUserId: OWNER_ID,
    supabase: supabaseNull,
  });
  assert.strictEqual(
    await differentLengths({ headers: { authorization: 'Bearer shorter' } }),
    null,
    'different-length comparison must return null, not throw'
  );
  assert.strictEqual(
    await differentLengths({ headers: { authorization: 'Bearer a-much-longer-token-than-the-legacy-secret' } }),
    null
  );

  assert.throws(
    () => createCombinedAuthenticate({ legacyToken: 'x', ownerUserId: 'not-a-uuid', supabase: null }),
    TypeError
  );

  const supabaseHit = async () => ({ id: USER_ID });
  const combo = createCombinedAuthenticate({ legacyToken: 'legacy-secret', ownerUserId: OWNER_ID, supabase: supabaseHit });
  assert.deepStrictEqual(
    await combo({ headers: { authorization: `Bearer ${USER_ID}` } }),
    { id: USER_ID, source: 'supabase' }
  );
  assert.strictEqual(await combo({ headers: {} }), null);
  const noSupabase = createCombinedAuthenticate({ legacyToken: 'legacy-secret', ownerUserId: null });
  assert.strictEqual(await noSupabase({ headers: { authorization: 'Bearer whatever' } }), null);
}, { timeout: 5000 });

// ---- H1: over HTTP with the combined authenticator ----

test('H1: /me and session scoping over HTTP with the combined authenticator', async (t) => {
  useTempSessionsDir(t);

  const providers = [{ name: 'fake', send: async () => ({ success: true, data: { reply: 'ok', model_used: 'fake-model' } }) }];

  // First: legacy owner
  const legacyAuth = createCombinedAuthenticate({
    legacyToken: 'legacy-secret',
    ownerUserId: OWNER_ID,
    supabase: async (req) => {
      const token = (req.headers.authorization || '').slice('Bearer '.length);
      return token === 'supabase-token' ? { id: USER_ID } : null;
    },
  });
  const appLt = createApp({ providers, apiToken: null, authenticate: legacyAuth });
  {
    const server = await new Promise((resolve) => {
      const s = appLt.listen(0, '127.0.0.1', () => resolve(s));
      t.after(() => { s.close(); s.closeAllConnections(); });
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const me = await fetch(`${base}/me`, { headers: { Authorization: 'Bearer legacy-secret' } });
    assert.strictEqual(me.status, 200);
    assert.deepStrictEqual(await me.json(), { id: OWNER_ID, source: 'legacy' });

    const meSb = await fetch(`${base}/me`, { headers: { Authorization: 'Bearer supabase-token' } });
    assert.strictEqual(meSb.status, 200);
    assert.deepStrictEqual(await meSb.json(), { id: USER_ID, source: 'supabase' });

    const noTok = await fetch(`${base}/me`);
    assert.strictEqual(noTok.status, 401);

    const chatA = await fetch(`${base}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer legacy-secret' },
      body: JSON.stringify({ session_id: 'shared', message: 'a secret sentence' }),
    });
    assert.strictEqual(chatA.status, 200);
    await chatA.json();
  }

  // Second: user B via a supabase-only combined (legacy disabled for B) checks isolation
  const appB = createApp({
    providers,
    apiToken: null,
    authenticate: async (req) => {
      const token = (req.headers.authorization || '').slice('Bearer '.length);
      const mapping = { 'tokB': USER_B_ID };
      return token in mapping ? { id: mapping[token], source: 'supabase' } : null;
    },
  });
  {
    const server = await new Promise((resolve) => {
      const s = appB.listen(0, '127.0.0.1', () => resolve(s));
      t.after(() => { s.close(); s.closeAllConnections(); });
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const listB = await fetch(`${base}/sessions`, { headers: { Authorization: 'Bearer tokB' } });
    assert.strictEqual(listB.status, 200);
    const listBBody = await listB.json();
    assert.ok(
      !listBBody.sessions.some((s) => s.id === 'shared'),
      `B must not see A's shared session: ${JSON.stringify(listBBody)}`
    );
  }

  // Third: a supabase fake that throws -> 503 auth_unavailable
  const appThrow = createApp({
    providers,
    apiToken: null,
    authenticate: async () => { throw new Error('supabase down'); },
  });
  {
    const server = await new Promise((resolve) => {
      const s = appThrow.listen(0, '127.0.0.1', () => resolve(s));
      t.after(() => { s.close(); s.closeAllConnections(); });
    });
    const me = await fetch(`http://127.0.0.1:${server.address().port}/me`, { headers: { Authorization: 'Bearer supabase-token' } });
    assert.strictEqual(me.status, 503);
    assert.deepStrictEqual(await me.json(), {
      error: { type: 'auth_unavailable', message: 'Authentication service unavailable' },
    });
  }
}, { timeout: 5000 });

test('construction validation: bad supabaseUrl / anonKey -> TypeError, trailing slash stripped', async () => {
  assert.throws(
    () => createSupabaseAuthenticator({ supabaseUrl: 'http://insecure.example', anonKey: 'k' }),
    TypeError
  );
  assert.throws(
    () => createSupabaseAuthenticator({ supabaseUrl: 'https://ok.example', anonKey: '' }),
    TypeError
  );
  assert.throws(
    () => createSupabaseAuthenticator({ supabaseUrl: 123, anonKey: 'k' }),
    TypeError
  );
  const clock = makeClock(T0);
  const calls = [];
  const auth = createSupabaseAuthenticator({
    supabaseUrl: 'https://trailing.example/',
    anonKey: ANON_KEY,
    fetchImpl: fakeFetch(200, { id: USER_ID }, calls),
    now: clock.now,
  });
  await auth({ headers: { authorization: `Bearer t1` } });
  assert.strictEqual(calls[0].url, 'https://trailing.example/auth/v1/user', 'trailing slash stripped');
}, { timeout: 5000 });
