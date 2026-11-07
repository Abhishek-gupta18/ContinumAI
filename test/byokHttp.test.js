'use strict';

// createApp-level checks of the per-user provider wiring over real HTTP.
// Needs express (the real repo has it). A recording memory double replaces the file/pg memory.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { createMemoryKeyStore } = require('../keys/keyStore');
const { createUserProviderResolver } = require('../providers/userProviders');
const {
  IDS, makeVault, addKey, okSend, makeFactory, makeStaticProvider, makeGuard, makeRecordingMemory,
} = require('./helpers/byok');

const vault = makeVault();
const TOKENS = { 'tok-a': IDS.userA, 'tok-b': IDS.userB, 'tok-owner': IDS.owner, 'tok-legacy': null };

async function authenticate(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!Object.prototype.hasOwnProperty.call(TOKENS, token)) return null;
  return { id: TOKENS[token], source: token === 'tok-legacy' ? 'legacy' : 'supabase' };
}

async function start(t, options) {
  const app = createApp({ corsOrigin: '', apiToken: null, authenticate, ...options });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

async function call(base, method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json };
}

function world(extra = {}) {
  const store = extra.store || createMemoryKeyStore();
  const env = [makeStaticProvider('env-1', 'from env')];
  const memory = makeRecordingMemory();
  const resolve = createUserProviderResolver({
    keyStore: store,
    vault,
    envProviders: env,
    ownerUserId: IDS.owner,
    ssrfGuard: makeGuard((url) => url),
    factories: { openai: makeFactory('openai', (o) => okSend(`from ${o.name}`)) },
    ...(extra.resolverOptions || {}),
  });
  return { store, env, memory, resolve };
}

test('T1 GET /providers: A sees own names in priority order, B sees [], owner and legacy see the env names, no token -> 401', async (t) => {
  const w = world();
  await addKey(w.store, vault, IDS.userA, { name: 'k2', priority: 20 });
  await addKey(w.store, vault, IDS.userA, { name: 'k1', priority: 10 });
  const base = await start(t, { providers: w.env, memory: w.memory, resolveProviders: w.resolve });

  assert.deepEqual((await call(base, 'GET', '/providers', 'tok-a')).body, { providers: ['k1', 'k2'] });
  assert.deepEqual((await call(base, 'GET', '/providers', 'tok-b')).body, { providers: [] });
  assert.deepEqual((await call(base, 'GET', '/providers', 'tok-owner')).body, { providers: ['env-1'] });
  assert.deepEqual((await call(base, 'GET', '/providers', 'tok-legacy')).body, { providers: ['env-1'] });
  assert.equal((await call(base, 'GET', '/providers', null)).status, 401);
});

test('T2 POST /chat: A is answered by A\'s key, B gets 503 no_providers, legacy gets the env provider', async (t) => {
  const w = world();
  await addKey(w.store, vault, IDS.userA, { name: 'k1' });
  const base = await start(t, { providers: w.env, memory: w.memory, resolveProviders: w.resolve });

  const a = await call(base, 'POST', '/chat', 'tok-a', { session_id: 's1', message: 'hi' });
  assert.equal(a.status, 200);
  assert.equal(a.body.reply, 'from k1');
  assert.equal(w.memory.nodes[0].userId, IDS.userA);
  assert.equal(w.memory.nodes[0].node.provider, 'k1');

  const b = await call(base, 'POST', '/chat', 'tok-b', { session_id: 's1', message: 'hi' });
  assert.equal(b.status, 503);
  assert.equal(b.body.error.type, 'no_providers');
  assert.equal(w.env[0].calls, 0);

  const legacy = await call(base, 'POST', '/chat', 'tok-legacy', { session_id: 's2', message: 'hi' });
  assert.equal(legacy.status, 200);
  assert.equal(legacy.body.reply, 'from env');
  assert.equal(w.env[0].calls, 1);
});

test('T3 server without key store / vault (as the entry block can start): ordinary users get nothing, owner and legacy keep the env provider', async (t) => {
  const w = world({ resolverOptions: { keyStore: null, vault: null } });
  const base = await start(t, { providers: w.env, memory: w.memory, resolveProviders: w.resolve });

  assert.deepEqual((await call(base, 'GET', '/providers', 'tok-a')).body, { providers: [] });
  const chatA = await call(base, 'POST', '/chat', 'tok-a', { session_id: 's1', message: 'hi' });
  assert.equal(chatA.status, 503);
  assert.equal(chatA.body.error.type, 'no_providers');
  assert.equal(w.env[0].calls, 0);

  assert.deepEqual((await call(base, 'GET', '/providers', 'tok-owner')).body, { providers: ['env-1'] });
  assert.equal((await call(base, 'POST', '/chat', 'tok-legacy', { session_id: 's2', message: 'hi' })).status, 200);
});

test('T4 library mode (no resolveProviders): GET /providers lists the static providers', async (t) => {
  const w = world();
  const base = await start(t, { providers: w.env, memory: w.memory });
  assert.deepEqual((await call(base, 'GET', '/providers', 'tok-a')).body, { providers: ['env-1'] });
});

test('T5 createApp refuses a resolveProviders that is not a function (an object like { resolve } used to be accepted silently)', () => {
  const w = world();
  assert.throws(
    () => createApp({ corsOrigin: '', apiToken: null, authenticate, providers: w.env, memory: w.memory, resolveProviders: { resolve: w.resolve } }),
    (err) => err instanceof TypeError && /resolveProviders must be a function/.test(err.message)
  );
});
