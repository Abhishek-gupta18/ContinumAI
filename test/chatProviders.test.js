'use strict';

// Chat handler + per-user provider chain, called directly (no HTTP) with a recording memory double.
// HTTP-level coverage of createApp lives in test/byokHttp.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryKeyStore } = require('../keys/keyStore');
const { createUserProviderResolver } = require('../providers/userProviders');
const { createChatHandler } = require('../routes/chat');
const {
  IDS, makeVault, addKey, okSend, failSend, makeFactory, makeStaticProvider,
  makeGuard, makeRecordingMemory, makeRes, captureConsole,
} = require('./helpers/byok');

const vault = makeVault();

function setup(extra = {}) {
  const store = createMemoryKeyStore();
  const env = extra.envProviders || [makeStaticProvider('env-1', 'from env')];
  const factories = extra.factories || {
    openai: makeFactory('openai', (o) => okSend(`from ${o.name}`, o.model || 'fake-model')),
  };
  const resolve = createUserProviderResolver({
    keyStore: store,
    vault,
    envProviders: env,
    ownerUserId: IDS.owner,
    ssrfGuard: makeGuard((url) => url),
    factories,
  });
  return { store, env, resolve, memory: makeRecordingMemory() };
}

// userId: a UUID, or null for the legacy token user.
async function chat(world, userId, body, resolveOverride) {
  const handler = createChatHandler(world.env, world.memory, {
    resolveProviders: resolveOverride || world.resolve,
    providerTimeoutMs: 2000,
    requestDeadlineMs: 5000,
  });
  const res = makeRes();
  await captureConsole(() => handler({ user: { id: userId }, body }, res));
  return res;
}

test('H1 user A is answered by A\'s own stored key; the node records that provider name under A\'s memory scope', async () => {
  const w = setup();
  await addKey(w.store, vault, IDS.userA, { name: 'a-main', apiKey: 'sk-a-main-1111' });
  const res = await chat(w, IDS.userA, { session_id: 's1', message: 'hello' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reply, 'from a-main');
  assert.equal(w.env[0].calls, 0);
  assert.deepEqual(w.memory.seenUsers, [IDS.userA]);
  assert.equal(w.memory.nodes.length, 1);
  assert.equal(w.memory.nodes[0].userId, IDS.userA);
  assert.equal(w.memory.nodes[0].node.provider, 'a-main');
  assert.deepEqual(w.memory.nodes[0].node.failed_providers, []);
  assert.equal(w.memory.nodes[0].node.status_at_this_point, 'done');
});

test('H2 an ordinary user without keys gets 503 no_providers for this account; no env provider is used; nothing is stored', async () => {
  const w = setup();
  const res = await chat(w, IDS.userB, { session_id: 's1', message: 'hello' });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error.type, 'no_providers');
  assert.equal(res.body.error.message, 'No providers are configured for this account');
  assert.equal(w.env[0].calls, 0);
  assert.equal(w.memory.nodes.length, 0);
});

test('H3 the legacy null user is answered by the env provider', async () => {
  const w = setup();
  const res = await chat(w, null, { session_id: 's1', message: 'hello' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reply, 'from env');
  assert.equal(w.env[0].calls, 1);
  assert.equal(w.memory.nodes[0].node.provider, 'env-1');
});

test('H4 the owner without keys is answered by the env provider; with an enabled stored key only by the stored provider', async () => {
  const w = setup();
  const first = await chat(w, IDS.owner, { session_id: 's1', message: 'hello' });
  assert.equal(first.body.reply, 'from env');
  assert.equal(w.env[0].calls, 1);

  await addKey(w.store, vault, IDS.owner, { name: 'own-key', apiKey: 'sk-own-2222' });
  const second = await chat(w, IDS.owner, { session_id: 's2', message: 'hello' });
  assert.equal(second.statusCode, 200);
  assert.equal(second.body.reply, 'from own-key');
  assert.equal(w.env[0].calls, 1); // unchanged: env provider not used any more
});

test('H5 the provider field only accepts the user\'s own names; Available lists only those; the env provider cannot be selected', async () => {
  const w = setup();
  await addKey(w.store, vault, IDS.userA, { name: 'k1', priority: 10 });
  await addKey(w.store, vault, IDS.userA, { name: 'k2', priority: 20 });

  const ok = await chat(w, IDS.userA, { session_id: 's1', message: 'hello', provider: 'k2' });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.reply, 'from k2');
  assert.equal(w.memory.nodes[0].node.provider, 'k2');

  const unknown = await chat(w, IDS.userA, { session_id: 's2', message: 'hello', provider: 'nope' });
  assert.equal(unknown.statusCode, 400);
  assert.equal(unknown.body.error.type, 'validation');
  assert.equal(unknown.body.error.message, 'Unknown provider "nope". Available: k1, k2');

  const envName = await chat(w, IDS.userA, { session_id: 's3', message: 'hello', provider: 'env-1' });
  assert.equal(envName.statusCode, 400);
  assert.ok(!envName.body.error.message.includes('Available: env-1'));
  assert.equal(w.env[0].calls, 0);
});

test('H6 a resolver that rejects -> 503 providers_unavailable; no provider is called; the error text is not leaked', async () => {
  const w = setup();
  const res = await chat(w, IDS.userA, { session_id: 's1', message: 'hello' },
    async () => { throw new Error('boom sk-secret-3333'); });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error.type, 'providers_unavailable');
  assert.equal(res.body.error.message, 'Provider configuration is unavailable');
  assert.ok(!JSON.stringify(res.body).includes('boom'));
  assert.equal(w.env[0].calls, 0);
  assert.equal(w.memory.nodes.length, 0);
});

test('H7 a failing first key fails over to the second; failed_providers lists the first', async () => {
  const w = setup({
    factories: {
      openai: makeFactory('openai', (o) => (o.name === 'first' ? failSend('rate_limit_error', 429) : okSend('from second'))),
    },
  });
  await addKey(w.store, vault, IDS.userA, { name: 'first', priority: 10 });
  await addKey(w.store, vault, IDS.userA, { name: 'second', priority: 20 });
  const res = await chat(w, IDS.userA, { session_id: 's1', message: 'hello' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reply, 'from second');
  assert.equal(w.memory.nodes[0].node.provider, 'second');
  assert.deepEqual(w.memory.nodes[0].node.failed_providers, ['first']);
});

test('H8 an undecryptable first row counts as a failed provider and the chain continues with the next key', async () => {
  const w = setup();
  await addKey(w.store, vault, IDS.userA, { name: 'broken', cipher: 'v1.AAAA.BBBB.CCCC', priority: 10 });
  await addKey(w.store, vault, IDS.userA, { name: 'good', priority: 20 });
  const res = await chat(w, IDS.userA, { session_id: 's1', message: 'hello' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reply, 'from good');
  assert.deepEqual(w.memory.nodes[0].node.failed_providers, ['broken']);
});

test('H9 when every key is unusable: 500 with the generic config message, no ciphertext in the response, node stored as blocked', async () => {
  const w = setup();
  await addKey(w.store, vault, IDS.userA, { name: 'broken-1', cipher: 'v1.AAAA.BBBB.CCCC', priority: 10 });
  await addKey(w.store, vault, IDS.userA, { name: 'broken-2', cipher: 'v1.DDDD.EEEE.FFFF', priority: 20 });
  const res = await chat(w, IDS.userA, { session_id: 's1', message: 'hello' });
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.type, 'config_error');
  assert.equal(res.body.error.message, 'All providers failed. Last error from broken-2: Stored provider configuration cannot be used');
  const wire = JSON.stringify(res.body);
  assert.ok(!wire.includes('v1.AAAA') && !wire.includes('v1.DDDD'));
  const node = w.memory.nodes[0].node;
  assert.equal(node.provider, null);
  assert.equal(node.status_at_this_point, 'blocked');
  assert.deepEqual(node.failed_providers, ['broken-1', 'broken-2']);
  assert.equal(w.env[0].calls, 0);
});

test('H10 two users with the same session id are written under their own memory scope', async () => {
  const w = setup();
  await addKey(w.store, vault, IDS.userA, { name: 'a-main' });
  await addKey(w.store, vault, IDS.userB, { name: 'b-main' });
  await chat(w, IDS.userA, { session_id: 'shared', message: 'hello' });
  await chat(w, IDS.userB, { session_id: 'shared', message: 'hello' });
  assert.deepEqual(w.memory.nodes.map((n) => [n.userId, n.node.provider]), [
    [IDS.userA, 'a-main'],
    [IDS.userB, 'b-main'],
  ]);
});
