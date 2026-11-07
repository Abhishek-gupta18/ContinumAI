'use strict';

// Shared helpers for test/userProviders.test.js, test/chatProviders.test.js and test/byokHttp.test.js.
// This file is NOT a test (the npm test glob is test/*.test.js, so test/helpers is not picked up).

const crypto = require('node:crypto');
const { createKeyVault } = require('../../crypto/keyVault');

// Valid UUIDs on purpose: the key store and the memory stores reject anything else.
const IDS = {
  owner: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userA: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  userB: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
};

function makeVault() {
  return createKeyVault(crypto.randomBytes(32).toString('base64'));
}

// Inserts one provider_keys row the way routes/providerKeys.js stores it:
// ciphertext = vault.encrypt(apiKey, `${userId}:${name}`).
// Override aadUser / aadName / cipher to build broken rows on purpose.
async function addKey(store, vault, userId, spec) {
  const apiKey = spec.apiKey || `sk-test-${spec.name}-0123456789`;
  const cipher = spec.cipher !== undefined
    ? spec.cipher
    : await vault.encrypt(apiKey, `${spec.aadUser || userId}:${spec.aadName || spec.name}`);
  return store.insert(userId, {
    name: spec.name,
    kind: spec.kind || 'openai',
    label: '',
    key_ciphertext: cipher,
    key_last4: apiKey.slice(-4),
    model: spec.model === undefined ? '' : spec.model,
    base_url: spec.base_url === undefined ? null : spec.base_url,
    priority: spec.priority === undefined ? 10 : spec.priority,
    enabled: spec.enabled !== false,
  });
}

function okSend(reply, modelUsed) {
  return async () => ({ success: true, data: { reply, model_used: modelUsed || 'fake-model' } });
}

function failSend(type, statusCode) {
  const t = type || 'provider_error';
  return async () => ({ success: false, error: { type: t, message: `${t} from fake`, statusCode: statusCode || 502 } });
}

// Fake provider factory with the SAME shape as the real ones: synchronous, one options object.
// sendFor(options) returns the async send() of the provider that is built.
function makeFactory(kind, sendFor) {
  const calls = [];
  const factory = (options) => {
    calls.push(options);
    const send = sendFor ? sendFor(options) : okSend(`reply from ${options.name}`, options.model);
    return { name: options.name, kind, model: options.model, send };
  };
  factory.calls = calls;
  return factory;
}

// Static (env) provider that counts how often it is used.
function makeStaticProvider(name, reply) {
  const p = { name, kind: 'openai', model: 'static-model', calls: 0 };
  p.send = async () => {
    p.calls += 1;
    return { success: true, data: { reply: reply || `static ${name}`, model_used: 'static-model' } };
  };
  return p;
}

// SSRF guard double: records every url it is asked about, then behaves as told.
function makeGuard(behaviour) {
  const calls = [];
  const guard = async (url) => {
    calls.push(url);
    return behaviour(url);
  };
  guard.calls = calls;
  return guard;
}

// Memory double with the interface routes/chat.js uses: forUser(id) -> { buildContextText, appendNode }.
function makeRecordingMemory() {
  const nodes = [];
  const seenUsers = [];
  return {
    nodes,
    seenUsers,
    forUser(userId) {
      seenUsers.push(userId);
      return {
        buildContextText: async () => '',
        appendNode: async (sessionId, node) => {
          nodes.push({ userId, sessionId, node });
        },
      };
    },
  };
}

// Minimal express-like response for calling the chat handler directly.
function makeRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.setHeader = (key, value) => { res.headers[key] = value; };
  return res;
}

// Runs fn with console.log/warn/error captured (and restored in finally). Returns what was printed.
async function captureConsole(fn) {
  const saved = { log: console.log, warn: console.warn, error: console.error };
  const lines = [];
  const grab = (...args) => { lines.push(args.map(String).join(' ')); };
  console.log = grab;
  console.warn = grab;
  console.error = grab;
  try {
    await fn();
  } finally {
    console.log = saved.log;
    console.warn = saved.warn;
    console.error = saved.error;
  }
  return lines.join('\n');
}

module.exports = {
  IDS,
  makeVault,
  addKey,
  okSend,
  failSend,
  makeFactory,
  makeStaticProvider,
  makeGuard,
  makeRecordingMemory,
  makeRes,
  captureConsole,
};
