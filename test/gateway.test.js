'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../server');
const { buildProviders } = require('../providers');
const { sendToOpenAI } = require('../providers/openai');
const { sendToGemini } = require('../providers/gemini');
const { getContextForHandoff } = require('../memory/store');

function makeError(type, message, statusCode) {
  return { success: false, error: { type, message, statusCode } };
}

function makeSuccess(reply, modelUsed) {
  return {
    success: true,
    data: {
      session_id: 'set-by-adapter',
      reply,
      model_used: modelUsed,
      raw_provider_response: null,
    },
  };
}

function useTempSessionsDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-test-'));
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

function startServer(t, providers) {
  const app = createApp({ providers });
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    t.after(() => {
      server.close();
      server.closeAllConnections();
    });
  });
}

async function chat(server, sessionId, message) {
  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

test('rate_limit_error on first provider → second serves, call order is [first, second]', async (t) => {
  useTempSessionsDir(t);

  const calls = [];
  const providers = [
    {
      name: 'first',
      send: async () => {
        calls.push('first');
        return makeError('rate_limit_error', 'Rate limit exceeded', 429);
      },
    },
    {
      name: 'second',
      send: async () => {
        calls.push('second');
        return makeSuccess('reply from second', 'second-model');
      },
    },
  ];

  const server = await startServer(t, providers);
  const res = await chat(server, 't-rate-limit', 'hello');

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.reply, 'reply from second');
  assert.strictEqual(body.model_used, 'second-model');
  assert.deepStrictEqual(calls, ['first', 'second']);
});

test('auth_error on first provider → second still serves, warning names first provider', async (t) => {
  useTempSessionsDir(t);

  const calls = [];
  const providers = [
    {
      name: 'authfail',
      send: async () => {
        calls.push('authfail');
        return makeError('auth_error', 'Invalid API key', 401);
      },
    },
    {
      name: 'backup',
      send: async () => {
        calls.push('backup');
        return makeSuccess('served by backup', 'backup-model');
      },
    },
  ];

  const server = await startServer(t, providers);

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.map(String).join(' '));
  t.after(() => {
    console.warn = originalWarn;
  });

  const res = await chat(server, 't-auth', 'ping');

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.reply, 'served by backup');
  assert.deepStrictEqual(calls, ['authfail', 'backup']);
  assert.ok(
    warnings.some((w) => w.includes('authfail') && w.includes('auth_error')),
    `expected a warning naming provider authfail with auth_error, got: ${JSON.stringify(warnings)}`
  );
});

test('all providers fail → status equals last error statusCode, message contains last provider message', async (t) => {
  useTempSessionsDir(t);

  const providers = [
    { name: 'p1', send: async () => makeError('rate_limit_error', 'p1 rate limited', 429) },
    { name: 'p2', send: async () => makeError('provider_error', 'p2 is on fire', 503) },
  ];

  const server = await startServer(t, providers);
  const res = await chat(server, 't-allfail', 'hello');

  assert.strictEqual(res.status, 503);
  const body = await res.json();
  assert.ok(
    body.error.message.includes('All providers failed. Last error from p2'),
    `unexpected message: ${body.error.message}`
  );
  assert.ok(
    body.error.message.includes('p2 is on fire'),
    `expected real error message from p2, got: ${body.error.message}`
  );
});

test('buildProviders: blank/missing/whitespace OPENAI_API_KEY excludes openai; both keys → [openai, gemini]', () => {
  assert.deepStrictEqual(
    buildProviders({ GEMINI_API_KEY: 'g' }).map((p) => p.name),
    ['gemini'],
    'missing OPENAI_API_KEY should exclude openai'
  );
  assert.deepStrictEqual(
    buildProviders({ OPENAI_API_KEY: '', GEMINI_API_KEY: 'g' }).map((p) => p.name),
    ['gemini'],
    'empty OPENAI_API_KEY should exclude openai'
  );
  assert.deepStrictEqual(
    buildProviders({ OPENAI_API_KEY: '   ', GEMINI_API_KEY: 'g' }).map((p) => p.name),
    ['gemini'],
    'whitespace-only OPENAI_API_KEY should exclude openai'
  );

  const both = buildProviders({ OPENAI_API_KEY: 'k', GEMINI_API_KEY: 'g' });
  assert.deepStrictEqual(both.map((p) => p.name), ['openai', 'gemini']);
  assert.strictEqual(both[0].send, sendToOpenAI);
  assert.strictEqual(both[1].send, sendToGemini);
});

test('malformed JSON body → 400 with error.type validation', async (t) => {
  const server = await startServer(t, []);

  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not valid json',
  });

  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.type, 'validation');
  assert.strictEqual(body.error.message, 'Invalid JSON body');
});

test('missing message → 400', async (t) => {
  const server = await startServer(t, []);

  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 't-validation' }),
  });

  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.type, 'validation');
});

test('memory through HTTP: second request on same session includes first turn content', async (t) => {
  useTempSessionsDir(t);

  const received = [];
  const providers = [
    {
      name: 'fake',
      send: async (req) => {
        received.push(req.message);
        return makeSuccess('ok', 'fake-model');
      },
    },
  ];

  const server = await startServer(t, providers);

  const res1 = await chat(server, 't-memory', 'My name is Abhishek.');
  assert.strictEqual(res1.status, 200);
  const res2 = await chat(server, 't-memory', 'What is my name?');
  assert.strictEqual(res2.status, 200);

  assert.strictEqual(received[0], 'My name is Abhishek.');
  assert.ok(
    received[1].includes('My name is Abhishek.'),
    `expected first turn content in second request, got: ${JSON.stringify(received[1])}`
  );
  assert.ok(received[1].includes('What is my name?'));
});

test('checkpoint through HTTP: 6 turns → exactly one checkpoint chained between turn 5 and turn 6', async (t) => {
  const sessionsDir = useTempSessionsDir(t);

  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers);

  for (let i = 1; i <= 6; i++) {
    const res = await chat(server, 't-checkpoint', `message ${i}`);
    assert.strictEqual(res.status, 200);
  }

  const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, 't-checkpoint.json'), 'utf8'));
  const nodes = Object.values(data.nodes);
  const checkpoints = nodes.filter((n) => n.type === 'checkpoint');
  const turns = nodes.filter((n) => n.type === 'turn');
  assert.strictEqual(checkpoints.length, 1, 'expected exactly one checkpoint node');
  assert.strictEqual(turns.length, 6, 'expected exactly six turn nodes');

  // Reconstruct chronological chain from head via prev_id.
  const byId = data.nodes;
  const chain = [];
  let currentId = data.head_id;
  while (currentId) {
    chain.push(byId[currentId]);
    currentId = byId[currentId].prev_id;
  }
  chain.reverse();

  // Expected: turn1..turn5, checkpoint, turn6
  assert.strictEqual(chain.length, 7);
  assert.strictEqual(chain[4].type, 'turn');
  assert.strictEqual(chain[5].type, 'checkpoint');
  assert.strictEqual(chain[6].type, 'turn');
  assert.strictEqual(chain[5].prev_id, chain[4].node_id, 'checkpoint.prev_id must be the 5th turn');
  assert.strictEqual(chain[6].prev_id, chain[5].node_id, '6th turn.prev_id must be the checkpoint');
  assert.strictEqual(
    chain[5].status_at_this_point,
    chain[4].status_at_this_point,
    'checkpoint must copy status_at_this_point from the last turn of its chunk'
  );

  const handoff = getContextForHandoff('t-checkpoint');
  assert.strictEqual(handoff.length, 2);
  assert.strictEqual(handoff[0].type, 'checkpoint');
  assert.strictEqual(handoff[0].node_id, chain[5].node_id);
  assert.strictEqual(handoff[1].type, 'turn');
  assert.strictEqual(handoff[1].content, 'message 6');
});
