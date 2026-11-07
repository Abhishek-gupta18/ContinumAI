'use strict';

// Resolver contract: createUserProviderResolver(options) returns an async FUNCTION resolve(userId) -> providers[].
// (server.js and routes/chat.js both pass it around as a function.)

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryKeyStore } = require('../keys/keyStore');
const { createUserProviderResolver } = require('../providers/userProviders');
const {
  IDS, makeVault, addKey, makeFactory, makeStaticProvider, makeGuard, captureConsole,
} = require('./helpers/byok');

const vault = makeVault();
const passGuard = () => makeGuard((url) => url);

function build(extra = {}) {
  const store = extra.store || createMemoryKeyStore();
  const envProviders = extra.envProviders || [makeStaticProvider('env-1')];
  const factory = extra.factory || makeFactory('openai');
  const resolve = createUserProviderResolver({
    keyStore: store,
    vault,
    envProviders,
    ownerUserId: IDS.owner,
    ssrfGuard: extra.ssrfGuard || passGuard(),
    factories: extra.factories || { openai: factory },
    timeoutMs: 1234,
  });
  return { store, envProviders, factory, resolve };
}

async function sendOf(provider) {
  return provider.send({ session_id: 's', message: 'm' });
}

test('U0 the resolver is a function (server.js and chat.js call it as one)', () => {
  const { resolve } = build();
  assert.equal(typeof resolve, 'function');
});

test('U1 legacy (null) user gets the env providers - the same array - without touching the key store', async () => {
  const { store, envProviders, resolve } = build();
  let listCalls = 0;
  const realList = store.list;
  store.list = async (...args) => { listCalls += 1; return realList(...args); };
  const result = await resolve(null);
  assert.equal(result, envProviders);
  assert.equal(listCalls, 0);
});

test('U2 a non-owner without rows gets [] (never the env providers)', async () => {
  const { resolve } = build();
  assert.deepEqual(await resolve(IDS.userA), []);
});

test('U3 non-owner: only enabled rows, in priority order; decrypted key, row model and name reach the factory; disabled row is never built', async () => {
  const { store, factory, resolve } = build();
  await addKey(store, vault, IDS.userA, { name: 'second', apiKey: 'sk-second-AAAA1111', priority: 20, model: 'model-2' });
  await addKey(store, vault, IDS.userA, { name: 'first', apiKey: 'sk-first-BBBB2222', priority: 10 });
  await addKey(store, vault, IDS.userA, { name: 'off', apiKey: 'sk-off-CCCC3333', priority: 30, enabled: false });

  const result = await resolve(IDS.userA);

  assert.deepEqual(result.map((p) => p.name), ['first', 'second']);
  assert.deepEqual(factory.calls.map((c) => c.name), ['first', 'second']);
  assert.equal(factory.calls[0].apiKey, 'sk-first-BBBB2222');
  assert.equal(factory.calls[1].apiKey, 'sk-second-AAAA1111');
  assert.equal(factory.calls[0].model, undefined); // blank model -> undefined
  assert.equal(factory.calls[1].model, 'model-2');
  assert.equal(factory.calls[0].timeoutMs, 1234);
  assert.ok(!JSON.stringify(factory.calls).includes('sk-off-CCCC3333'));
});

test('U4 owner without rows gets the env providers (same array)', async () => {
  const { envProviders, resolve } = build();
  assert.equal(await resolve(IDS.owner), envProviders);
});

test('U4b owner whose rows are all disabled also gets the env providers (current rule, documented here)', async () => {
  const { store, envProviders, factory, resolve } = build();
  await addKey(store, vault, IDS.owner, { name: 'parked', enabled: false });
  assert.equal(await resolve(IDS.owner), envProviders);
  assert.equal(factory.calls.length, 0);
});

test('U5 owner with an enabled row gets only that provider, not the env providers', async () => {
  const { store, envProviders, resolve } = build();
  await addKey(store, vault, IDS.owner, { name: 'own', apiKey: 'sk-own-DDDD4444' });
  const result = await resolve(IDS.owner);
  assert.deepEqual(result.map((p) => p.name), ['own']);
  assert.ok(!result.includes(envProviders[0]));
});

test('U6 isolation: A and B only see their own rows; a row sealed for another user or name becomes config_error and its factory is never called', async () => {
  const { store, factory, resolve } = build();
  await addKey(store, vault, IDS.userA, { name: 'a-key', apiKey: 'sk-a-key-1111' });
  await addKey(store, vault, IDS.userB, { name: 'b-key', apiKey: 'sk-b-key-2222' });
  await addKey(store, vault, IDS.userA, { name: 'stolen', aadUser: IDS.userB, apiKey: 'sk-stolen-3333', priority: 20 });
  await addKey(store, vault, IDS.userA, { name: 'renamed', aadName: 'other-name', apiKey: 'sk-renamed-4444', priority: 30 });

  const a = await resolve(IDS.userA);
  const b = await resolve(IDS.userB);

  assert.deepEqual(a.map((p) => p.name), ['a-key', 'stolen', 'renamed']);
  assert.deepEqual(b.map((p) => p.name), ['b-key']);
  assert.deepEqual(factory.calls.map((c) => c.name).sort(), ['a-key', 'b-key']);
  for (const broken of [a[1], a[2]]) {
    const sent = await sendOf(broken);
    assert.equal(sent.success, false);
    assert.equal(sent.error.type, 'config_error');
    assert.equal(sent.error.statusCode, 500);
  }
});

test('U7 an undecryptable row becomes a config_error 500 provider; nothing sensitive in the message; factory not called', async () => {
  const { store, factory, resolve } = build();
  await addKey(store, vault, IDS.userA, { name: 'broken', cipher: 'v1.AAAA.BBBB.CCCC' });
  const result = await resolve(IDS.userA);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'broken');
  assert.equal(factory.calls.length, 0);
  const sent = await sendOf(result[0]);
  assert.deepEqual(sent, {
    success: false,
    error: { type: 'config_error', message: 'Stored provider configuration cannot be used', statusCode: 500 },
  });
  assert.ok(!JSON.stringify(sent).includes('v1.AAAA'));
});

test('U8a openai_compat: when the ssrf guard rejects the stored base_url -> config_error 400 and the factory is not called', async () => {
  const guard = makeGuard(() => { throw new Error('blocked'); });
  const compat = makeFactory('openai_compat');
  const { store, resolve } = build({ ssrfGuard: guard, factories: { openai_compat: compat } });
  await addKey(store, vault, IDS.userA, {
    name: 'my-compat', kind: 'openai_compat', model: 'm1', base_url: 'https://api.example.test/v1', apiKey: 'sk-compat-5555',
  });
  const result = await resolve(IDS.userA);
  assert.equal(result.length, 1);
  assert.deepEqual(guard.calls, ['https://api.example.test/v1']);
  assert.equal(compat.calls.length, 0);
  const sent = await sendOf(result[0]);
  assert.deepEqual(sent, {
    success: false,
    error: { type: 'config_error', message: 'Stored base_url is not allowed', statusCode: 400 },
  });
});

test('U8b openai_compat: the guard-normalised URL is what the factory receives as baseURL, with decrypted key and model', async () => {
  const guard = makeGuard(() => 'https://normalised.example.test/v1');
  const compat = makeFactory('openai_compat');
  const { store, resolve } = build({ ssrfGuard: guard, factories: { openai_compat: compat } });
  await addKey(store, vault, IDS.userA, {
    name: 'my-compat', kind: 'openai_compat', model: 'm1', base_url: 'https://api.example.test/v1', apiKey: 'sk-compat-5555',
  });
  await resolve(IDS.userA);
  assert.equal(compat.calls.length, 1);
  assert.equal(compat.calls[0].baseURL, 'https://normalised.example.test/v1');
  assert.equal(compat.calls[0].model, 'm1');
  assert.equal(compat.calls[0].apiKey, 'sk-compat-5555');
});

test('U8c non-compat rows never go through the ssrf guard', async () => {
  const guard = passGuard();
  const { store, resolve } = build({ ssrfGuard: guard });
  await addKey(store, vault, IDS.userA, { name: 'plain' });
  await resolve(IDS.userA);
  assert.equal(guard.calls.length, 0);
});

test('U9 a factory that throws -> config_error 500 for that row only; the other rows are still built; the error text is not leaked', async () => {
  const good = makeFactory('openai');
  const bad = () => { throw new Error('factory exploded sk-secret-9999'); };
  const { store, resolve } = build({ factories: { openai: good, gemini: bad } });
  await addKey(store, vault, IDS.userA, { name: 'good-one', kind: 'openai', priority: 10 });
  await addKey(store, vault, IDS.userA, { name: 'bad-one', kind: 'gemini', priority: 20 });
  await addKey(store, vault, IDS.userA, { name: 'good-two', kind: 'openai', priority: 30 });

  const result = await resolve(IDS.userA);

  assert.deepEqual(result.map((p) => p.name), ['good-one', 'bad-one', 'good-two']);
  assert.equal(good.calls.length, 2);
  const sent = await sendOf(result[1]);
  assert.equal(sent.error.type, 'config_error');
  assert.equal(sent.error.statusCode, 500);
  assert.ok(!JSON.stringify(sent).includes('exploded'));
});

test('U9b a row with an unknown kind becomes config_error 500 instead of crashing the resolver', async () => {
  const { store, factory, resolve } = build();
  await addKey(store, vault, IDS.userA, { name: 'weird', kind: 'weird' });
  const result = await resolve(IDS.userA);
  assert.equal(result.length, 1);
  assert.equal(factory.calls.length, 0);
  assert.equal((await sendOf(result[0])).error.type, 'config_error');
});

test('U10 key store failure -> resolve rejects with a generic message (no db details)', async () => {
  const { store, resolve } = build();
  store.list = async () => { throw new Error('db password=hunter2'); };
  await assert.rejects(resolve(IDS.userA), (err) => {
    assert.equal(err.message, 'Key store list failed');
    return true;
  });
});

test('U11 without key store / vault: legacy and owner get env providers, every ordinary user gets [] (nobody falls back to server keys)', async () => {
  const envProviders = [makeStaticProvider('env-1')];
  for (const parts of [{ keyStore: null, vault: null }, { keyStore: createMemoryKeyStore(), vault: null }, { keyStore: null, vault }]) {
    const resolve = createUserProviderResolver({
      ...parts, envProviders, ownerUserId: IDS.owner, ssrfGuard: passGuard(), factories: {},
    });
    assert.equal(await resolve(null), envProviders);
    assert.equal(await resolve(IDS.owner), envProviders);
    assert.deepEqual(await resolve(IDS.userA), []);
  }
});

test('U12 default factories (no factories option) build a real provider from an encrypted row', async () => {
  const store = createMemoryKeyStore();
  await addKey(store, vault, IDS.userA, { name: 'real-openai', apiKey: 'sk-real-6666', model: 'gpt-4o-mini' });
  const resolve = createUserProviderResolver({
    keyStore: store, vault, envProviders: [], ownerUserId: IDS.owner, ssrfGuard: passGuard(),
  });
  const result = await resolve(IDS.userA);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'real-openai');
  assert.equal(result[0].kind, 'openai');
  assert.equal(result[0].model, 'gpt-4o-mini');
  assert.equal(typeof result[0].send, 'function');
});

test('U13 resolving (success, broken ciphertext, blocked base_url) never logs a key or ciphertext', async () => {
  const secrets = ['sk-ok-77777777', 'sk-compat-88888888', 'v1.AAAA'];
  const { store, resolve } = build({
    ssrfGuard: makeGuard(() => { throw new Error('blocked'); }),
    factories: { openai: makeFactory('openai'), openai_compat: makeFactory('openai_compat') },
  });
  await addKey(store, vault, IDS.userA, { name: 'ok', apiKey: secrets[0] });
  await addKey(store, vault, IDS.userA, { name: 'broken', cipher: 'v1.AAAA.BBBB.CCCC', priority: 20 });
  await addKey(store, vault, IDS.userA, {
    name: 'compat', kind: 'openai_compat', model: 'm', base_url: 'https://x.example.test/v1', apiKey: secrets[1], priority: 30,
  });
  const printed = await captureConsole(async () => {
    const providers = await resolve(IDS.userA);
    for (const p of providers) await sendOf(p);
  });
  for (const s of secrets) {
    assert.ok(!printed.includes(s), `console output must not contain ${s}`);
  }
});
