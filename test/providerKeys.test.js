'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');
const { createKeyVault } = require('../crypto/keyVault');
const { createMemoryKeyStore } = require('../keys/keyStore');

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MASTER = crypto.randomBytes(32).toString('base64');

const fakeSsrfGuard = async (url) => {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    const err = new Error('unsafe_base_url');
    err.reason = 'non_https';
    throw err;
  }
  return url;
};

function baseBody(overrides = {}) {
  return Object.assign(
    {
      kind: 'openai',
      label: 'main key',
      api_key: 'sk-test-1234567890abcdef',
      model: 'gpt-4o-mini',
      priority: 10,
      enabled: true,
    },
    overrides
  );
}

async function startServer(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => {
    server.close();
    server.closeAllConnections();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (method, route, { body, headers } = {}) => {
    const res = await fetch(base + route, {
      method,
      headers: {
        Authorization: 'Bearer legacy-token',
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) {}
    return { status: res.status, body: json, text, headers: res.headers };
  };
}

async function userServer(t, extras = {}) {
  return startServer(t, createApp({
    keyStore: createMemoryKeyStore(),
    keyVault: createKeyVault(MASTER),
    ssrfGuard: fakeSsrfGuard,
    authenticate: async () => ({ id: USER, source: 'supabase' }),
    ...extras,
  }));
}

test('P1: authenticated session with id null (legacy token) returns 403 account_required on all key routes', async (t) => {
  const call = await userServer(t, { authenticate: undefined });
  const legacy = startServer(t, createApp({
    apiToken: 'legacy-token',
    keyStore: createMemoryKeyStore(),
    keyVault: createKeyVault(MASTER),
    ssrfGuard: fakeSsrfGuard,
  }));
  const call2 = await legacy;
  const put = await call2('PUT', '/me/providers/x1', { body: baseBody() });
  assert.strictEqual(put.status, 403);
  assert.strictEqual(put.body.error.type, 'account_required');
  const get = await call2('GET', '/me/providers');
  assert.strictEqual(get.status, 403);
  assert.strictEqual(get.body.error.type, 'account_required');
  const del = await call2('DELETE', '/me/providers/x1');
  assert.strictEqual(del.status, 403);
  const order = await call2('PUT', '/me/provider-order', { body: { order: ['x1'] } });
  assert.strictEqual(order.status, 403);
});

test('P1b: unauthenticated request returns 401 on key routes', async (t) => {
  const app = createApp({
    apiToken: 'legacy-token',
    keyStore: createMemoryKeyStore(),
    keyVault: createKeyVault(MASTER),
    ssrfGuard: fakeSsrfGuard,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => { server.close(); server.closeAllConnections(); });
  const res = await fetch(`http://127.0.0.1:${server.address().port}/me/providers`);
  assert.strictEqual(res.status, 401);
});

test('P2: create returns 201, no api_key/key_ciphertext anywhere in response, provider listed; extended leak checks', async (t) => {
  const origLog = console.log, origWarn = console.warn, origErr = console.error;
  const logs = [];
  console.log = (...a) => logs.push(a.join(' '));
  console.warn = (...a) => logs.push(a.join(' '));
  console.error = (...a) => logs.push(a.join(' '));
  try {
    const call = await userServer(t);
    const apiKey = 'sk-create-test-1234567890abcdef';
    const put = await call('PUT', '/me/providers/my-key', { body: { ...baseBody(), api_key: apiKey } });
    assert.strictEqual(put.status, 201);
    assert.strictEqual(put.body.provider.name, 'my-key');
    assert.strictEqual(put.body.provider.key_last4, 'cdef');
    assert.ok(!put.text.includes(apiKey), 'create response text must not contain api_key');
    assert.ok(!put.text.includes('key_ciphertext'), 'create response text must not contain key_ciphertext');
    assert.ok(!JSON.stringify(put.body).includes('api_key'), 'create response body must not contain api_key');
    assert.ok(!JSON.stringify(put.body).includes('key_ciphertext'), 'create response body must not contain key_ciphertext');

    const list = await call('GET', '/me/providers');
    assert.strictEqual(list.status, 200);
    assert.ok(!list.text.includes(apiKey), 'list response must not contain api_key');
    assert.ok(!list.text.includes('key_ciphertext'), 'list response must not contain key_ciphertext');

    // update with new api_key
    const newKey = 'sk-update-with-new-1234567890';
    const upd1 = await call('PUT', '/me/providers/my-key', { body: { kind: 'openai', api_key: newKey } });
    assert.strictEqual(upd1.status, 200);
    assert.ok(!upd1.text.includes(apiKey), 'update-with-key response must not contain old api_key');
    assert.ok(!upd1.text.includes(newKey), 'update-with-key response must not contain new api_key');
    assert.ok(!upd1.text.includes('key_ciphertext'), 'update-with-key response must not contain key_ciphertext');

    // update without api_key
    const upd2 = await call('PUT', '/me/providers/my-key', { body: { kind: 'openai', label: 'updated' } });
    assert.strictEqual(upd2.status, 200);
    assert.ok(!upd2.text.includes(newKey), 'update-no-key response must not contain api_key');
    assert.ok(!upd2.text.includes('key_ciphertext'), 'update-no-key response must not contain key_ciphertext');

    // validation failure with api_key in body (invalid name: uppercase)
    const valFail = await call('PUT', '/me/providers/INVALID', { body: { kind: 'openai', api_key: 'sk-val-fail-12345678' } });
    assert.strictEqual(valFail.status, 400);
    assert.ok(!valFail.text.includes('sk-val-fail-12345678'), 'validation failure must not leak api_key');

    // unsafe base_url failure with api_key in body
    const unsafeFail = await call('PUT', '/me/providers/unsafe', { body: { kind: 'openai_compat', api_key: 'sk-unsafe-fail-12345678', base_url: 'http://10.0.0.1/v1' } });
    assert.strictEqual(unsafeFail.status, 400);
    assert.ok(!unsafeFail.text.includes('sk-unsafe-fail-12345678'), 'unsafe base_url failure must not leak api_key');

    // 501 call (no keyStore/vault)
    const noStoreCall = await startServer(t, createApp({ apiToken: null }));
    const five01 = await noStoreCall('PUT', '/me/providers/x', { body: { kind: 'openai', api_key: 'sk-501-test-12345678' } });
    assert.strictEqual(five01.status, 501);
    assert.ok(!five01.text.includes('sk-501-test-12345678'), '501 response must not leak api_key');

    // assert no api_key in any logged output
    for (const log of logs) {
      assert.ok(!log.includes(apiKey), `console output must not contain api_key: ${log}`);
      assert.ok(!log.includes(newKey), `console output must not contain new api_key: ${log}`);
      assert.ok(!log.includes('sk-val-fail-12345678'), `console output must not contain validation api_key: ${log}`);
      assert.ok(!log.includes('sk-unsafe-fail-12345678'), `console output must not contain unsafe api_key: ${log}`);
      assert.ok(!log.includes('sk-501-test-12345678'), `console output must not contain 501 api_key: ${log}`);
    }
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origErr;
  }
});

test('P3: stored key decrypts with aad `${userId}:${name}`, key_last4 is the last 4 of api_key', async (t) => {
  const vault = createKeyVault(MASTER);
  const store = createMemoryKeyStore();
  const call = await userServer(t, { keyStore: store, keyVault: vault });
  const apiKey = 'sk-abcdef9876543210';
  const put = await call('PUT', '/me/providers/k1', { body: { kind: 'openai', api_key: apiKey } });
  assert.strictEqual(put.status, 201);
  assert.strictEqual(put.body.provider.key_last4, '3210');
  const stored = await store.get(USER, 'k1');
  assert.ok(stored, 'row must exist for the right user');
  assert.strictEqual(vault.decrypt(stored.key_ciphertext, `${USER}:k1`), apiKey);
  assert.throws(() => vault.decrypt(stored.key_ciphertext, `${USER}:other`), /decrypt_failed/);
});

test('P4: openai_compat without base_url is 400 validation; with http:// is 400 unsafe_base_url; with https:// it is created', async (t) => {
  const call = await userServer(t);
  const noUrl = await call('PUT', '/me/providers/c1', { body: baseBody({ kind: 'openai_compat', base_url: undefined }) });
  assert.strictEqual(noUrl.status, 400);
  assert.strictEqual(noUrl.body.error.type, 'validation');
  const http = await call('PUT', '/me/providers/c2', { body: baseBody({ kind: 'openai_compat', base_url: 'http://10.0.0.9/v1', api_key: 'sk-compat-12345678' }) });
  assert.strictEqual(http.status, 400);
  assert.strictEqual(http.body.error.type, 'unsafe_base_url');
  const ok = await call('PUT', '/me/providers/c3', { body: baseBody({ kind: 'openai_compat', base_url: 'https://api.example.com/v1', api_key: 'sk-compat-87654321' }) });
  assert.strictEqual(ok.status, 201);
  assert.strictEqual(ok.body.provider.base_url, 'https://api.example.com/v1');
  const noCompat = await call('PUT', '/me/providers/c4', { body: baseBody({ base_url: 'https://api.example.com' }) });
  assert.strictEqual(noCompat.status, 400);
  assert.strictEqual(noCompat.body.error.type, 'validation');
});

test('P5: update without api_key keeps key intact; kind cannot change; response rows stay clean', async (t) => {
  const vault = createKeyVault(MASTER);
  const store = createMemoryKeyStore();
  const call = await userServer(t, { keyStore: store, keyVault: vault });
  const apiKey = 'sk-original-1234567890abcdef';
  await call('PUT', '/me/providers/keep', { body: baseBody({ api_key: apiKey, label: 'v1' }) });
  const put = await call('PUT', '/me/providers/keep', { body: { kind: 'openai', label: 'v2', priority: 11 } });
  assert.strictEqual(put.status, 200);
  assert.strictEqual(put.body.provider.label, 'v2');
  assert.strictEqual(put.body.provider.priority, 11);
  assert.strictEqual(put.body.provider.key_last4, 'cdef');
  const stored = await store.get(USER, 'keep');
  assert.strictEqual(vault.decrypt(stored.key_ciphertext, `${USER}:keep`), apiKey, 'ciphertext must survive an update without api_key');
  const wrongKind = await call('PUT', '/me/providers/keep', { body: baseBody({ kind: 'gemini', api_key: 'sk-kind-change-1234' }) });
  assert.strictEqual(wrongKind.status, 400);
});

test('P6: POST /chat still works for a legacy session when provider keys are configured', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-pkeys-'));
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
  const providers = [{ name: 'openai', send: async () => ({ success: true, data: { reply: 'pong', model_used: 'fake-model' } }) }];
  const call = await startServer(t, createApp({
    apiToken: null,
    providers,
    keyStore: createMemoryKeyStore(),
    keyVault: createKeyVault(MASTER),
    ssrfGuard: fakeSsrfGuard,
  }));
  const chat = await call('POST', '/chat', { body: { session_id: 's1', message: 'hi' } });
  assert.strictEqual(chat.status, 200);
  assert.strictEqual(chat.body.reply, 'pong');
  const list = await call('GET', '/me/providers');
  assert.strictEqual(list.status, 403, 'legacy id-null session cannot read provider keys');
  assert.strictEqual(list.body.error.type, 'account_required');
});

test('P7: GET /providers when storage fails returns 503 internal_error, no crash, no material', async (t) => {
  const call = await userServer(t, { keyStore: { list: async () => { throw new Error('boom'); } } });
  const res = await call('GET', '/me/providers');
  assert.strictEqual(res.status, 503);
  assert.strictEqual(res.body.error.type, 'internal_error');
});

test('P8b: 10 keys accepted, the 11th is 400 limit_reached', async (t) => {
  const call = await userServer(t);
  for (let i = 1; i <= 10; i += 1) {
    const res = await call('PUT', `/me/providers/k${i}`, { body: baseBody({ api_key: `sk-key-${i}-1234567890` }) });
    assert.strictEqual(res.status, 201, `key ${i} should be created`);
  }
  const extra = await call('PUT', '/me/providers/k11', { body: baseBody({ api_key: 'sk-key-11-1234567890' }) });
  assert.strictEqual(extra.status, 400);
  assert.strictEqual(extra.body.error.type, 'limit_reached');
});

test('P9: DELETE returns 204; second DELETE is 404 not_found; list no longer contains it', async (t) => {
  const call = await userServer(t);
  await call('PUT', '/me/providers/gone', { body: baseBody() });
  const del = await call('DELETE', '/me/providers/gone');
  assert.strictEqual(del.status, 204);
  const again = await call('DELETE', '/me/providers/gone');
  assert.strictEqual(again.status, 404);
  assert.strictEqual(again.body.error.type, 'not_found');
  const list = await call('GET', '/me/providers');
  assert.deepStrictEqual(list.body.providers, []);
});

test('P10: provider-order reorders; unknown/incomplete/duplicate all 400 validation', async (t) => {
  const call = await userServer(t);
  await call('PUT', '/me/providers/a1', { body: baseBody({ api_key: 'sk-a1-1234567890abc' }) });
  await call('PUT', '/me/providers/b2', { body: baseBody({ api_key: 'sk-b2-1234567890abc', priority: 20 }) });
  await call('PUT', '/me/providers/c3', { body: baseBody({ api_key: 'sk-c3-1234567890abc', priority: 30 }) });

  const missing = await call('PUT', '/me/provider-order', { body: { order: ['a1'] } });
  assert.strictEqual(missing.status, 400);
  assert.strictEqual(missing.body.error.type, 'validation');
  const unknown = await call('PUT', '/me/provider-order', { body: { order: ['a1', 'b2', 'ghost'] } });
  assert.strictEqual(unknown.status, 400);
  const dup = await call('PUT', '/me/provider-order', { body: { order: ['a1', 'a1', 'b2'] } });
  assert.strictEqual(dup.status, 400);

  const ok = await call('PUT', '/me/provider-order', { body: { order: ['c3', 'a1', 'b2'] } });
  assert.strictEqual(ok.status, 200);
  const byName = Object.fromEntries(ok.body.providers.map((p) => [p.name, p.priority]));
  assert.strictEqual(byName.c3, 10);
  assert.strictEqual(byName.a1, 20);
  assert.strictEqual(byName.b2, 30);
});

test('P11: CORS preflight on key routes allows PUT/DELETE from an allowed origin', async (t) => {
  process.env.CORS_ORIGIN = 'http://frontend.test';
  try {
    const app = createApp({
      apiToken: 'legacy-token',
      keyStore: createMemoryKeyStore(),
      keyVault: createKeyVault(MASTER),
      ssrfGuard: fakeSsrfGuard,
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => { server.close(); server.closeAllConnections(); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const preflight = await fetch(`${base}/me/providers/k`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://frontend.test',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'authorization, content-type',
      },
    });
    assert.strictEqual(preflight.status, 204);
    const methods = preflight.headers.get('access-control-allow-methods');
    assert.ok(methods.includes('PUT') && methods.includes('DELETE'), `methods must include PUT and DELETE, got: ${methods}`);
    assert.strictEqual(preflight.headers.get('access-control-allow-origin'), 'http://frontend.test');
  } finally {
    delete process.env.ALLOWED_ORIGINS;
  }
});

test('P12: createApp without keyStore/vault returns 501 byok_not_configured on all key routes', async (t) => {
  const call = await startServer(t, createApp({ apiToken: null }));
  const get = await call('GET', '/me/providers');
  assert.strictEqual(get.status, 501);
  assert.strictEqual(get.body.error.type, 'byok_not_configured');
  const put = await call('PUT', '/me/providers/x', { body: baseBody() });
  assert.strictEqual(put.status, 501);
  const del = await call('DELETE', '/me/providers/x');
  assert.strictEqual(del.status, 501);
  const order = await call('PUT', '/me/provider-order', { body: { order: [] } });
  assert.strictEqual(order.status, 501);
});

test('P13: bad name/kind/label/api_key/priority all 400 validation with message', async (t) => {
  const call = await userServer(t);
  for (const badName of ['UPPER', 'a'.repeat(33), 'with%20space']) {
    const res = await call('PUT', `/me/providers/${badName}`, { body: baseBody() });
    assert.strictEqual(res.status, 400, `name ${badName} must be 400`);
    assert.strictEqual(res.body.error.type, 'validation');
  }
  const badKind = await call('PUT', '/me/providers/ok-name', { body: baseBody({ kind: 'banana' }) });
  assert.strictEqual(badKind.status, 400);
  const badLabel = await call('PUT', '/me/providers/ok-name', { body: baseBody({ label: 'x'.repeat(65) }) });
  assert.strictEqual(badLabel.status, 400);
  const ctrlLabel = await call('PUT', '/me/providers/ok-name', { body: baseBody({ label: 'bad\u0007label' }) });
  assert.strictEqual(ctrlLabel.status, 400);
  const shortKey = await call('PUT', '/me/providers/ok-name', { body: baseBody({ api_key: 'short' }) });
  assert.strictEqual(shortKey.status, 400);
  const spaceyKey = await call('PUT', '/me/providers/ok-name', { body: baseBody({ api_key: 'sk has whitespace 1234' }) });
  assert.strictEqual(spaceyKey.status, 400);
  const badPriority = await call('PUT', '/me/providers/ok-name', { body: baseBody({ priority: 0 }) });
  assert.strictEqual(badPriority.status, 400);
  const badPriority2 = await call('PUT', '/me/providers/ok-name', { body: baseBody({ priority: 'ten' }) });
  assert.strictEqual(badPriority2.status, 400);
});

test('P14: PUT to create without api_key returns 400 validation', async (t) => {
  const call = await userServer(t);
  const put = await call('PUT', '/me/providers/miss', { body: { kind: 'openai', label: 'no key' } });
  assert.strictEqual(put.status, 400);
  assert.strictEqual(put.body.error.type, 'validation');
});

test('P15: a broken vault never leaks plaintext or ciphertext in the http response', async (t) => {
  const vault = createKeyVault(MASTER);
  const store = createMemoryKeyStore();
  const badVault = {
    encrypt: () => { throw new Error('decrypt_failed'); },
    decrypt: (token, aad) => vault.decrypt(token, aad),
  };
  const call = await userServer(t, { keyStore: store, keyVault: badVault });
  const secret = 'sk-never-leak-1234567890';
  const created = await call('PUT', '/me/providers/leak', { body: baseBody({ api_key: secret }) });
  assert.strictEqual(created.status, 503, 'a storage failure surfaces as 503');
  assert.ok(!JSON.stringify(created.body).includes(secret), 'plaintext must not appear in response');
});

test('P16: cross-user HTTP isolation', async (t) => {
  const store = createMemoryKeyStore();
  const vault = createKeyVault(MASTER);
  const tokA = 'tokA';
  const tokB = 'tokB';
  const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const app = createApp({
    keyStore: store,
    keyVault: vault,
    ssrfGuard: fakeSsrfGuard,
    authenticate: async (req) => {
      const auth = req.headers?.authorization;
      if (auth === `Bearer ${tokA}`) return { id: userA, source: 'supabase' };
      if (auth === `Bearer ${tokB}`) return { id: userB, source: 'supabase' };
      return null;
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => { server.close(); server.closeAllConnections(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, route, token, body) => {
    const res = await fetch(base + route, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) {}
    return { status: res.status, body: json, text };
  };

  // A creates "shared"
  await call('PUT', '/me/providers/shared', tokA, { kind: 'openai', api_key: 'sk-a-shared-12345678' });

  // B's GET /me/providers returns empty list
  let listB = await call('GET', '/me/providers', tokB);
  assert.strictEqual(listB.status, 200);
  assert.deepStrictEqual(listB.body.providers, []);

  // B's PUT /me/providers/shared with its own key creates its own row (201)
  const bPut = await call('PUT', '/me/providers/shared', tokB, { kind: 'openai', api_key: 'sk-b-shared-12345678' });
  assert.strictEqual(bPut.status, 201);

  // A's key_last4 is unchanged afterwards
  const listA = await call('GET', '/me/providers', tokA);
  assert.strictEqual(listA.status, 200);
  const aProvider = listA.body.providers.find(p => p.name === 'shared');
  assert.ok(aProvider, 'A still has shared');
  assert.strictEqual(aProvider.key_last4, '5678', 'A key_last4 unchanged');

  // A also creates "only-a"
  await call('PUT', '/me/providers/only-a', tokA, { kind: 'openai', api_key: 'sk-a-only-12345678' });

  // B DELETE /me/providers/only-a -> 404
  const delB = await call('DELETE', '/me/providers/only-a', tokB);
  assert.strictEqual(delB.status, 404);

  // B PUT /me/providers/only-a with kind but no api_key -> 400
  const badPut = await call('PUT', '/me/providers/only-a', tokB, { kind: 'openai' });
  assert.strictEqual(badPut.status, 400);
  assert.strictEqual(badPut.body.error.type, 'validation');

  // Afterwards A still lists "only-a"
  const listA2 = await call('GET', '/me/providers', tokA);
  assert.strictEqual(listA2.status, 200);
  assert.strictEqual(listA2.body.providers.length, 2);
  const names = listA2.body.providers.map(p => p.name).sort();
  assert.deepStrictEqual(names, ['only-a', 'shared']);
});

test('P17: update with only kind and enabled:false keeps label, model, priority, and key', async (t) => {
  const call = await userServer(t);
  const apiKey = 'sk-original-1234567890abcdef';
  await call('PUT', '/me/providers/keep', { body: { kind: 'openai', api_key: apiKey, label: 'my-label', model: 'my-model', priority: 42 } });
  const upd = await call('PUT', '/me/providers/keep', { body: { kind: 'openai', enabled: false } });
  assert.strictEqual(upd.status, 200);
  assert.strictEqual(upd.body.provider.label, 'my-label', 'label should be preserved');
  assert.strictEqual(upd.body.provider.model, 'my-model', 'model should be preserved');
  assert.strictEqual(upd.body.provider.priority, 42, 'priority should be preserved');
  assert.strictEqual(upd.body.provider.enabled, false, 'enabled should be updated');
  assert.strictEqual(upd.body.provider.key_last4, 'cdef', 'key should be preserved');
});

test('P18: openai_compat update without base_url keeps stored base_url', async (t) => {
  const call = await userServer(t);
  await call('PUT', '/me/providers/compat', { body: { kind: 'openai_compat', api_key: 'sk-compat-12345678', base_url: 'https://api.example.com/v1' } });
  const upd = await call('PUT', '/me/providers/compat', { body: { kind: 'openai_compat', label: 'updated' } });
  assert.strictEqual(upd.status, 200);
  assert.strictEqual(upd.body.provider.base_url, 'https://api.example.com/v1', 'base_url should be preserved');
});

test('P19: openai_compat update with unsafe base_url -> 400 unsafe_base_url', async (t) => {
  const call = await userServer(t);
  await call('PUT', '/me/providers/compat2', { body: { kind: 'openai_compat', api_key: 'sk-compat-12345678', base_url: 'https://api.example.com/v1' } });
  const bad = await call('PUT', '/me/providers/compat2', { body: { kind: 'openai_compat', base_url: 'http://10.0.0.1/v1' } });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(bad.body.error.type, 'unsafe_base_url');
});
