'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { createApp } = require('../server');
const { buildProviders } = require('../providers');
const { sendToOpenAI } = require('../providers/openai');
const { sendToGemini, classifyGeminiError } = require('../providers/gemini');
const store = require('../memory/store');
const { getContextForHandoff, buildContextText, sessionFilePath } = store;

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

// Captures the prompt each provider.send receives (routes/chat.js builds it
// into req.message before calling send).
function promptCapturingProvider(name, handler) {
  const received = [];
  return {
    received,
    provider: {
      name,
      send: async (req) => {
        received.push(req.message);
        return handler(req);
      },
    },
  };
}

function startServer(t, providers, apiToken) {
  const app = createApp({ providers, apiToken: apiToken === undefined ? null : apiToken });
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

// T6
test('no providers configured → 503 no_providers, no session file written', async (t) => {
  const sessionsDir = useTempSessionsDir(t);

  const server = await startServer(t, []);
  const res = await chat(server, 't-noproviders', 'hello');

  assert.strictEqual(res.status, 503);
  const body = await res.json();
  assert.strictEqual(body.error.type, 'no_providers');
  assert.strictEqual(body.error.message, 'No AI providers are configured');
  assert.strictEqual(fs.readdirSync(sessionsDir).length, 0, 'no session file must be written');
});

// T1
test('reply stored: turn node has content = user message, reply = fake reply, model_used = fake model', async (t) => {
  const sessionsDir = useTempSessionsDir(t);

  const { provider } = promptCapturingProvider('fake', async () =>
    makeSuccess('I am a fake reply', 'fake-model-1')
  );

  const server = await startServer(t, [provider]);
  const res = await chat(server, 't-reply-stored', 'Tell me a joke.');
  assert.strictEqual(res.status, 200);

  const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, 't-reply-stored.json'), 'utf8'));
  const turns = Object.values(data.nodes).filter((n) => n.type === 'turn');
  assert.strictEqual(turns.length, 1);
  assert.strictEqual(turns[0].content, 'Tell me a joke.');
  assert.strictEqual(turns[0].reply, 'I am a fake reply');
  assert.strictEqual(turns[0].model_used, 'fake-model-1');
  assert.strictEqual(turns[0].status_at_this_point, 'done');
});

// T2
test('handoff: provider A replies on request 1 and fails on request 2; B receives transcript prompt ending with request 2', async (t) => {
  useTempSessionsDir(t);

  const { received, provider: providerA } = promptCapturingProvider('fakeA', (() => {
    let calls = 0;
    return async () => {
      calls += 1;
      if (calls === 1) return makeSuccess('A replied to the first question', 'model-a');
      return makeError('provider_error', 'A is down', 503);
    };
  })());

  const { received: receivedB, provider: providerB } = promptCapturingProvider('fakeB', async () =>
    makeSuccess('B took over', 'model-b')
  );

  const server = await startServer(t, [providerA, providerB]);

  const res1 = await chat(server, 't-handoff', 'What is ContinumAI?');
  assert.strictEqual(res1.status, 200);
  assert.strictEqual((await res1.json()).model_used, 'model-a');

  const res2 = await chat(server, 't-handoff', 'Summarize what you just said.');
  assert.strictEqual(res2.status, 200);
  assert.strictEqual((await res2.json()).model_used, 'model-b');

  // A is called on both requests (it serves 1, fails 2); B only on request 2.
  assert.strictEqual(received.length, 2);
  assert.strictEqual(receivedB.length, 1);
  assert.strictEqual(received[0], 'What is ContinumAI?', 'first request must get the bare message');
  const promptB = receivedB[0];
  assert.ok(
    promptB.includes('Conversation so far (earlier turns may have been answered by different assistants):'),
    `expected handoff preamble in B's prompt, got: ${JSON.stringify(promptB)}`
  );
  assert.ok(promptB.includes('User: What is ContinumAI?'), `missing user turn: ${JSON.stringify(promptB)}`);
  assert.ok(promptB.includes('Assistant: A replied to the first question'), `missing assistant reply: ${JSON.stringify(promptB)}`);
  assert.ok(promptB.endsWith('User: Summarize what you just said.'), `prompt must end with the new user message: ${JSON.stringify(promptB)}`);
});

test('checkpoint through HTTP: 6 turns → exactly one checkpoint chained between turn 5 and turn 6', async (t) => {
  const sessionsDir = useTempSessionsDir(t);

  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers);

  for (let i = 1; i <= 6; i++) {
    const res = await chat(server, 't-checkpoint-chain', `message ${i}`);
    assert.strictEqual(res.status, 200);
  }

  const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, 't-checkpoint-chain.json'), 'utf8'));
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

  const handoff = await getContextForHandoff('t-checkpoint-chain');
  assert.strictEqual(handoff.length, 2);
  assert.strictEqual(handoff[0].type, 'checkpoint');
  assert.strictEqual(handoff[0].node_id, chain[5].node_id);
  assert.strictEqual(handoff[1].type, 'turn');
  assert.strictEqual(handoff[1].content, 'message 6');
  assert.strictEqual(handoff[1].reply, 'ok');
});

// T3
test('checkpoint in prompt: after 6 exchanges, request 7 prompt contains exchange 1 (once) and exchange 6', async (t) => {
  useTempSessionsDir(t);

  const { received, provider } = promptCapturingProvider('fake', async () =>
    makeSuccess(`reply ok`, 'fake-model')
  );

  const server = await startServer(t, [provider]);

  for (let i = 1; i <= 6; i++) {
    const res = await chat(server, 't-checkpoint-prompt', `question number ${i}`);
    assert.strictEqual(res.status, 200);
  }

  const res7 = await chat(server, 't-checkpoint-prompt', 'question number 7');
  assert.strictEqual(res7.status, 200);

  const prompt7 = received[6];
  assert.ok(
    prompt7.includes('Conversation so far'),
    `expected context preamble, got: ${JSON.stringify(prompt7)}`
  );
  assert.ok(prompt7.includes('question number 1'), `exchange 1 user text must appear via checkpoint: ${JSON.stringify(prompt7)}`);
  assert.ok(prompt7.includes('question number 6'), `exchange 6 must be present: ${JSON.stringify(prompt7)}`);
  assert.ok(
    prompt7.endsWith('User: question number 7'),
    `prompt must end with request 7 message: ${JSON.stringify(prompt7)}`
  );
  const occurrences = prompt7.split('question number 1').length - 1;
  assert.strictEqual(occurrences, 1, `exchange 1 text must appear exactly once, got ${occurrences}: ${JSON.stringify(prompt7)}`);
});

// T4
test('failed exchange excluded: blocked node with null reply; next prompt has no failed message or error text', async (t) => {
  const sessionsDir = useTempSessionsDir(t);

  const failing = [
    { name: 'p1', send: async () => makeError('rate_limit_error', 'quota exhausted forever', 429) },
    { name: 'p2', send: async () => makeError('provider_error', 'p2 exploded', 503) },
  ];

  const server1 = await startServer(t, failing);
  const resFail = await chat(server1, 't-fail-exclusion', 'this message failed');
  assert.strictEqual(resFail.status, 503);

  const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, 't-fail-exclusion.json'), 'utf8'));
  const turns = Object.values(data.nodes).filter((n) => n.type === 'turn');
  assert.strictEqual(turns.length, 1);
  assert.strictEqual(turns[0].status_at_this_point, 'blocked');
  assert.strictEqual(turns[0].content, 'this message failed');
  assert.strictEqual(turns[0].reply, null);
  const serialized = JSON.stringify(data);
  assert.ok(!serialized.includes('quota exhausted forever'), 'error text must not be stored');
  assert.ok(!serialized.includes('p2 exploded'), 'error text must not be stored');

  const { received, provider } = promptCapturingProvider('fake', async () =>
    makeSuccess('fresh reply', 'fake-model')
  );
  const server2 = await startServer(t, [provider]);
  const res2 = await chat(server2, 't-fail-exclusion', 'does this work now?');
  assert.strictEqual(res2.status, 200);

  const prompt2 = received[0];
  assert.ok(!prompt2.includes('this message failed'), `failed message must be excluded: ${JSON.stringify(prompt2)}`);
  assert.ok(!prompt2.includes('quota exhausted forever'), `error text must not leak: ${JSON.stringify(prompt2)}`);
  assert.ok(!prompt2.includes('p2 exploded'), `error text must not leak: ${JSON.stringify(prompt2)}`);
  assert.strictEqual(prompt2, 'does this work now?', `only-turn-blocked session has empty context, prompt must be the bare message: ${JSON.stringify(prompt2)}`);
});

// T5
test('checkpoint status: chunk first turn blocked, newest done → checkpoint status done', async (t) => {
  const sessionsDir = useTempSessionsDir(t);

  // 5 turn nodes appended directly: first blocked, rest done.
  await store.appendNode('t-checkpoint-status', {
    type: 'turn',
    content: 'blocked turn',
    reply: null,
    model_used: 'unknown',
    status_at_this_point: 'blocked',
  });
  for (let i = 2; i <= 5; i++) {
    await store.appendNode('t-checkpoint-status', {
      type: 'turn',
      content: `turn ${i}`,
      reply: `reply ${i}`,
      model_used: 'fake-model',
      status_at_this_point: 'done',
    });
  }

  // 6th append crosses the threshold and writes the checkpoint first.
  await store.appendNode('t-checkpoint-status', {
    type: 'turn',
    content: 'turn 6',
    reply: 'reply 6',
    model_used: 'fake-model',
    status_at_this_point: 'done',
  });

  const data = JSON.parse(
    fs.readFileSync(path.join(sessionsDir, 't-checkpoint-status.json'), 'utf8')
  );
  const checkpoints = Object.values(data.nodes).filter((n) => n.type === 'checkpoint');
  assert.strictEqual(checkpoints.length, 1);
  assert.strictEqual(
    checkpoints[0].status_at_this_point,
    'done',
    'checkpoint must copy the NEWEST turn status, not the oldest'
  );
  // D4: checkpoint content formatted like the transcript, oldest first, blocked turn skipped.
  assert.strictEqual(
    checkpoints[0].content,
    'User: turn 2\nAssistant: reply 2\nUser: turn 3\nAssistant: reply 3\nUser: turn 4\nAssistant: reply 4\nUser: turn 5\nAssistant: reply 5'
  );
});

test('buildContextText: checkpoint content included as-is; empty session returns empty string', async (t) => {
  useTempSessionsDir(t);

  assert.strictEqual(await buildContextText('t-nothing'), '');

  await store.appendNode('t-nothing', {
    type: 'turn',
    content: 'hi there',
    reply: 'hello!',
    model_used: 'fake-model',
    status_at_this_point: 'done',
  });

  assert.strictEqual(await buildContextText('t-nothing'), 'User: hi there\nAssistant: hello!');
});

test('buildContextText: old-format node without reply and non-done statuses are skipped', async (t) => {
  useTempSessionsDir(t);

  await store.appendNode('t-legacy', {
    type: 'turn',
    content: 'old turn without reply',
    reply: null,
    model_used: 'x',
    status_at_this_point: 'done',
  });
  await store.appendNode('t-legacy', {
    type: 'turn',
    content: 'done turn with reply',
    reply: 'the reply',
    model_used: 'x',
    status_at_this_point: 'done',
  });

  const text = await buildContextText('t-legacy');
  assert.ok(!text.includes('old turn without reply'), `reply-less turn must be skipped: ${JSON.stringify(text)}`);
  assert.ok(text.includes('User: done turn with reply\nAssistant: the reply'), `got: ${JSON.stringify(text)}`);
});

// Gemini adapter status extraction: a real @google/genai ApiError carries the
// HTTP status in err.status (verified: Object.keys = ["name","status"],
// err.code/err.statusCode undefined). Fake error objects mimic that shape.
test('classifyGeminiError: reads error.status first (rate limit 429 → rate_limit_error, 503 → provider_error)', () => {
  const rateLimited = classifyGeminiError({ name: 'ApiError', status: 429, message: 'quota exceeded' });
  assert.strictEqual(rateLimited.type, 'rate_limit_error');
  assert.strictEqual(rateLimited.statusCode, 429);

  const serverErr = classifyGeminiError({ name: 'ApiError', status: 503, message: 'backend error' });
  assert.strictEqual(serverErr.type, 'provider_error');
  assert.strictEqual(serverErr.statusCode, 503);

  // Real one-off verified shape: a 404 ApiError hits the classifier's generic
  // fallback (all non-401/429/<500 statuses map to generic/500; the original
  // message is preserved). errorClassifier.js is out of scope to change.
  const notFound = classifyGeminiError({ name: 'ApiError', status: 404, message: 'model not found' });
  assert.strictEqual(notFound.type, 'generic');
  assert.strictEqual(notFound.statusCode, 500);
  assert.strictEqual(notFound.message, 'model not found');

  // Shape that carries no usable status falls back to 500, which the classifier
  // maps to provider_error (status >= 500 branch) — its existing contract.
  const opaque = classifyGeminiError({ name: 'ApiError', message: 'boom' });
  assert.strictEqual(opaque.type, 'provider_error');
  assert.strictEqual(opaque.statusCode, 500);
});

// T7
test('startup without keys: child process with no env keys can require providers and call buildProviders() → []', () => {
  const projectRoot = path.join(__dirname, '..');
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-empty-'));
  try {
    const script = "const { buildProviders } = require(process.argv[1]); console.log('RESULT:' + JSON.stringify(buildProviders()));";
    const stdout = execFileSync(
      process.execPath,
      ['-e', script, path.join(projectRoot, 'providers')],
      {
        cwd: emptyDir,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          // OPENAI_API_KEY and GEMINI_API_KEY deliberately removed
        },
        encoding: 'utf8',
      }
    );
    // dotenv v17 prints a noise line to stdout even with no vars; match the marker only.
    const resultLine = stdout.split('\n').find((line) => line.startsWith('RESULT:'));
    assert.ok(resultLine, `expected a RESULT: line in child stdout, got: ${JSON.stringify(stdout)}`);
    assert.strictEqual(resultLine.slice('RESULT:'.length), '[]');
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
});

// U1: Invalid session_id variants → 400, provider never called, no file created
test('invalid session_id variants rejected with 400, provider not called, no traversal', async (t) => {
  const sessionsDir = useTempSessionsDir(t);

  const calls = [];
  const providers = [{
    name: 'fake',
    send: async () => {
      calls.push('called');
      return makeSuccess('ok', 'fake-model');
    },
  }];

  const server = await startServer(t, providers);

  const invalidIds = [
    '../x',
    'a/b',
    '',
    'a'.repeat(65),
    '.',
    123,
    null,
  ];

  for (const id of invalidIds) {
    calls.length = 0;
    const res = await fetch(`http://127.0.0.1:${server.address().port}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: id, message: 'hello' }),
    });
    assert.strictEqual(res.status, 400, `expected 400 for ${JSON.stringify(id)}`);
    const body = await res.json();
    assert.strictEqual(body.error.type, 'validation');
    assert.strictEqual(calls.length, 0, `provider must not be called for ${JSON.stringify(id)}`);
  }

  // No session files created in temp dir
  assert.strictEqual(fs.readdirSync(sessionsDir).length, 0);

  // No file created at traversal target outside sessions dir
  const outside = path.join(os.tmpdir(), 'continumai-test-escape.json');
  assert.ok(!fs.existsSync(outside), 'no file must be created outside sessions dir');
});

// U2: Store level: appendNode('../escape', ...) and getContextForHandoff('../escape') fail safely
test('store: appendNode and getContextForHandoff reject path traversal', async (t) => {
  useTempSessionsDir(t);

  await assert.rejects(
    store.appendNode('../escape', { type: 'turn', content: 'x', reply: 'y', model_used: 'm', status_at_this_point: 'done' }),
    /Path traversal attempt/
  );

  await assert.rejects(
    store.getContextForHandoff('../escape'),
    /Path traversal attempt/
  );

  // Ensure no file created outside sessions dir
  const outside = path.join(os.tmpdir(), 'continumai-test-escape.json');
  assert.ok(!fs.existsSync(outside), 'no file must be created outside sessions dir');
});

// U3: Auth with apiToken set
test('auth: with apiToken set, missing header → 401', async (t) => {
  useTempSessionsDir(t);
  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers, 'secret-token');

  const res = await fetch(`http://127.0.0.1:${server.address().port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 't-auth', message: 'hello' }),
  });

  assert.strictEqual(res.status, 401);
  const body = await res.json();
  assert.strictEqual(body.error.type, 'unauthorized');
});

test('auth: with apiToken set, wrong token → 401', async (t) => {
  useTempSessionsDir(t);
  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers, 'secret-token');

  const res = await fetch(`http://127.0.0.1:${server.address().port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer wrong' },
    body: JSON.stringify({ session_id: 't-auth', message: 'hello' }),
  });

  assert.strictEqual(res.status, 401);
  const body = await res.json();
  assert.strictEqual(body.error.type, 'unauthorized');
});

test('auth: with apiToken set, wrong-length token → 401 (no crash)', async (t) => {
  useTempSessionsDir(t);
  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers, 'secret-token');

  // Different length token
  const res = await fetch(`http://127.0.0.1:${server.address().port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer verylongtokenthatdiffersinlength' },
    body: JSON.stringify({ session_id: 't-auth', message: 'hello' }),
  });

  assert.strictEqual(res.status, 401);
  const body = await res.json();
  assert.strictEqual(body.error.type, 'unauthorized');
});

test('auth: with apiToken set, correct token → 200', async (t) => {
  useTempSessionsDir(t);
  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers, 'secret-token');

  const res = await fetch(`http://127.0.0.1:${server.address().port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer secret-token' },
    body: JSON.stringify({ session_id: 't-auth', message: 'hello' }),
  });

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.reply, 'ok');
});

test('auth: GET /health without token → 200', async (t) => {
  useTempSessionsDir(t);
  const providers = [];
  const server = await startServer(t, providers, 'secret-token');

  const res = await fetch(`http://127.0.0.1:${server.address().port}/health`);

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
});

// V1: With process.env.GATEWAY_API_TOKEN set, createApp({ providers, apiToken: null }) accepts POST /chat without header (200)
test('V1: env token set but apiToken null → /chat open (200)', async (t) => {
  useTempSessionsDir(t);
  const previousToken = process.env.GATEWAY_API_TOKEN;
  process.env.GATEWAY_API_TOKEN = 'env-token';
  t.after(() => {
    if (previousToken === undefined) delete process.env.GATEWAY_API_TOKEN;
    else process.env.GATEWAY_API_TOKEN = previousToken;
  });

  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers, null);

  const res = await fetch(`http://127.0.0.1:${server.address().port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 't-v1', message: 'hello' }),
  });

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.reply, 'ok');
});

// V2: With process.env.GATEWAY_API_TOKEN set, createApp({ providers }) (apiToken undefined) rejects POST /chat without header (401)
test('V2: env token set and apiToken undefined → /chat requires auth (401)', async (t) => {
  useTempSessionsDir(t);
  const previousToken = process.env.GATEWAY_API_TOKEN;
  process.env.GATEWAY_API_TOKEN = 'env-token';
  t.after(() => {
    if (previousToken === undefined) delete process.env.GATEWAY_API_TOKEN;
    else process.env.GATEWAY_API_TOKEN = previousToken;
  });

  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  // Call createApp directly with undefined to test fallback to env
  const app = createApp({ providers, apiToken: undefined });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    t.after(() => { s.close(); s.closeAllConnections(); });
  });

  const res = await fetch(`http://127.0.0.1:${server.address().port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 't-v2', message: 'hello' }),
  });

  assert.strictEqual(res.status, 401);
  const body = await res.json();
  assert.strictEqual(body.error.type, 'unauthorized');
});

// V3: With a token configured, POST /chat with malformed JSON body and no Authorization header returns 401, not 400
test('V3: token configured, malformed JSON + no auth → 401 (not 400)', async (t) => {
  useTempSessionsDir(t);
  const providers = [{ name: 'fake', send: async () => makeSuccess('ok', 'fake-model') }];
  const server = await startServer(t, providers, 'secret-token');

  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not valid json',
  });

  assert.strictEqual(res.status, 401, 'must be 401 because auth runs before body parse');
  const body = await res.json();
  assert.strictEqual(body.error.type, 'unauthorized');
});

// U4: Startup guard
test('startup guard: child process with no token and no ALLOW_UNAUTHENTICATED exits non-zero, no listening message', () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-startup-'));
  const projectRoot = path.join(__dirname, '..');
  try {
    const result = require('node:child_process').spawnSync(
      process.execPath,
      [path.join(projectRoot, 'server.js')],
      {
        cwd: emptyDir,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          // No GATEWAY_API_TOKEN, no ALLOW_UNAUTHENTICATED
        },
        encoding: 'utf8',
        timeout: 5000,
      }
    );
    assert.notStrictEqual(result.status, 0, 'process must exit with non-zero code');
    const output = result.stdout + result.stderr;
    assert.ok(!output.includes('running on port'), 'must not print listening message');
    assert.ok(output.includes('GATEWAY_API_TOKEN is not set'), 'must print clear error');
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
});
