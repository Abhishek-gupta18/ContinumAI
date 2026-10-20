require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createMemory, formatNodeText } = require('../memory/memory');
const { createFileStore } = require('../memory/fileStore');

function useTempSessionsDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-contract-'));
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

function runMemoryContract(label, makeStore) {
  test(`${label}: C1 - new session returns empty context`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c1-new';

    const handoff = await memory.getContextForHandoff(sessionId);
    assert.deepStrictEqual(handoff, []);

    const text = await memory.buildContextText(sessionId);
    assert.strictEqual(text, '');

    const head = await memory.getHead(sessionId);
    assert.strictEqual(head, null);
  });

  test(`${label}: C2 - appendNode stores fields and links prev_id to previous head`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c2-link';

    const n1 = await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'first',
      reply: 'reply 1',
      model_used: 'model-a',
      status_at_this_point: 'done',
    });
    assert.strictEqual(n1.prev_id, null);
    assert.strictEqual(n1.content, 'first');
    assert.strictEqual(n1.reply, 'reply 1');
    assert.strictEqual(n1.model_used, 'model-a');
    assert.strictEqual(n1.status_at_this_point, 'done');

    const n2 = await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'second',
      reply: 'reply 2',
      model_used: 'model-b',
      status_at_this_point: 'done',
    });
    assert.strictEqual(n2.prev_id, n1.node_id);
    assert.strictEqual(n2.content, 'second');

    const n3 = await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'third',
      reply: null,
      model_used: 'unknown',
      status_at_this_point: 'blocked',
    });
    assert.strictEqual(n3.prev_id, n2.node_id);
    assert.strictEqual(n3.reply, null);
    assert.strictEqual(n3.status_at_this_point, 'blocked');
  });

  test(`${label}: C3 - 6 exchanges creates exactly one checkpoint between turn 5 and 6`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c3-checkpoint';

    for (let i = 1; i <= 6; i++) {
      await memory.appendNode(sessionId, {
        type: 'turn',
        content: `turn ${i}`,
        reply: `reply ${i}`,
        model_used: 'fake-model',
        status_at_this_point: 'done',
      });
    }

    const allNodes = await memory.getAllNodes(sessionId);
    const checkpoints = allNodes.filter((n) => n.type === 'checkpoint');
    const turns = allNodes.filter((n) => n.type === 'turn');
    assert.strictEqual(checkpoints.length, 1, 'expected exactly one checkpoint');
    assert.strictEqual(turns.length, 6, 'expected exactly six turns');

    const handoff = await memory.getContextForHandoff(sessionId);
    assert.strictEqual(handoff.length, 2, 'handoff should be [checkpoint, turn6]');
    assert.strictEqual(handoff[0].type, 'checkpoint');
    assert.strictEqual(handoff[1].type, 'turn');
    assert.strictEqual(handoff[1].content, 'turn 6');

    const cp = checkpoints[0];
    const expectedContent = [
      'User: turn 1\nAssistant: reply 1',
      'User: turn 2\nAssistant: reply 2',
      'User: turn 3\nAssistant: reply 3',
      'User: turn 4\nAssistant: reply 4',
      'User: turn 5\nAssistant: reply 5',
    ].join('\n');
    assert.strictEqual(cp.content, expectedContent, 'checkpoint content must be turns 1-5 oldest-first');
    assert.strictEqual(cp.status_at_this_point, 'done', 'checkpoint status = newest turn status');
    assert.strictEqual(cp.model_used, '');
    assert.strictEqual(cp.references, null);
  });

  test(`${label}: C4 - blocked exchange (reply null) stored but excluded from context and checkpoint`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c4-blocked';

    await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'good turn',
      reply: 'good reply',
      model_used: 'm',
      status_at_this_point: 'done',
    });
    await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'blocked turn',
      reply: null,
      model_used: 'unknown',
      status_at_this_point: 'blocked',
    });
    await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'another good',
      reply: 'another reply',
      model_used: 'm',
      status_at_this_point: 'done',
    });

    const text = await memory.buildContextText(sessionId);
    assert.ok(!text.includes('blocked turn'), 'blocked turn must be excluded from context');
    assert.ok(text.includes('good turn'), 'good turn must be in context');
    assert.ok(text.includes('another good'), 'another good turn must be in context');

    for (let i = 4; i <= 6; i++) {
      await memory.appendNode(sessionId, {
        type: 'turn',
        content: `turn ${i}`,
        reply: `reply ${i}`,
        model_used: 'm',
        status_at_this_point: 'done',
      });
    }

    const allNodes = await memory.getAllNodes(sessionId);
    const checkpoints = allNodes.filter((n) => n.type === 'checkpoint');
    assert.strictEqual(checkpoints.length, 1);
    assert.ok(!checkpoints[0].content.includes('blocked turn'), 'blocked turn must be excluded from checkpoint content');
  });

  test(`${label}: C5 - concurrent appends on one session serialize correctly`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c5-concurrent';

    const promises = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(
        memory.appendNode(sessionId, {
          type: 'turn',
          content: `concurrent ${i}`,
          reply: `reply ${i}`,
          model_used: 'm',
          status_at_this_point: 'done',
        })
      );
    }
    const nodes = await Promise.all(promises);

    assert.strictEqual(nodes.length, 10);

    const allNodes = await memory.getAllNodes(sessionId);
    const checkpoints = allNodes.filter((n) => n.type === 'checkpoint');
    const turns = allNodes.filter((n) => n.type === 'turn');
    assert.strictEqual(turns.length, 10, '10 turn nodes');
    assert.strictEqual(checkpoints.length, 1, 'exactly 1 checkpoint');

    const headId = await memory.getHead(sessionId);
    const headNode = allNodes.find((n) => n.node_id === headId);
    assert.ok(headNode, 'head node must exist');

    const prevIds = new Set();
    let nullCount = 0;
    for (const node of nodes) {
      if (node.prev_id === null) {
        nullCount++;
      } else {
        prevIds.add(node.prev_id);
      }
    }
    assert.strictEqual(nullCount, 1, 'exactly one node has prev_id null');

    const byId = Object.fromEntries(allNodes.map((n) => [n.node_id, n]));
    let currentId = headId;
    let visited = 0;
    while (currentId) {
      visited++;
      const node = byId[currentId];
      assert.ok(node, `node ${currentId} must exist`);
      currentId = node.prev_id;
    }
    assert.strictEqual(visited, 11, 'walking from head via prev_id must visit all 11 nodes (10 turns + 1 checkpoint)');
  });

  test(`${label}: C6 - two sessions interleaved never mix nodes`, async () => {
    const store = makeStore();
    const memory = createMemory(store);

    await memory.appendNode('session-A', { type: 'turn', content: 'A1', reply: 'rA1', model_used: 'm', status_at_this_point: 'done' });
    await memory.appendNode('session-B', { type: 'turn', content: 'B1', reply: 'rB1', model_used: 'm', status_at_this_point: 'done' });
    await memory.appendNode('session-A', { type: 'turn', content: 'A2', reply: 'rA2', model_used: 'm', status_at_this_point: 'done' });
    await memory.appendNode('session-B', { type: 'turn', content: 'B2', reply: 'rB2', model_used: 'm', status_at_this_point: 'done' });

    const nodesA = await memory.getAllNodes('session-A');
    const nodesB = await memory.getAllNodes('session-B');

    for (const n of nodesA) {
      assert.strictEqual(n.session_id, 'session-A');
      assert.ok(!n.content.includes('B'), `session-A node must not contain B content: ${n.content}`);
    }
    for (const n of nodesB) {
      assert.strictEqual(n.session_id, 'session-B');
      assert.ok(!n.content.includes('A'), `session-B node must not contain A content: ${n.content}`);
    }

    const textA = await memory.buildContextText('session-A');
    const textB = await memory.buildContextText('session-B');
    assert.ok(textA.includes('A1') && textA.includes('A2'));
    assert.ok(!textA.includes('B1') && !textA.includes('B2'));
    assert.ok(textB.includes('B1') && textB.includes('B2'));
    assert.ok(!textB.includes('A1') && !textB.includes('A2'));
  });

  test(`${label}: C7 - multi-checkpoint: 16 exchanges, 3 checkpoints, latest-checkpoint tail`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c7-multi-checkpoint';

    for (let i = 1; i <= 16; i++) {
      const result = await memory.appendNode(sessionId, {
        type: 'turn',
        content: `question ${i}`,
        reply: `answer ${i}`,
        model_used: 'm',
        status_at_this_point: 'done',
      });

      const text = await memory.buildContextText(sessionId);
      const userOccurrences = (text.match(/User: /g) || []).length;
      assert.ok(text.includes(`User: question ${i}\n`), `after append ${i}, context must contain the just-appended exchange`);
      assert.ok(userOccurrences <= 10, `after append ${i}, at most 10 User: occurrences, got ${userOccurrences}`);
    }

    const allNodes = await memory.getAllNodes(sessionId);
    const checkpoints = allNodes.filter((n) => n.type === 'checkpoint');
    const turns = allNodes.filter((n) => n.type === 'turn');
    assert.strictEqual(checkpoints.length, 3, 'exactly 3 checkpoint nodes after 16 turns');
    assert.strictEqual(turns.length, 16, 'exactly 16 turn nodes after 16 turns');

    const handoff = await memory.getContextForHandoff(sessionId);
    assert.strictEqual(handoff.length, 2, 'handoff must be [latest checkpoint, turn 16]');
    assert.strictEqual(handoff[0].type, 'checkpoint', 'first handoff node must be checkpoint');
    assert.strictEqual(handoff[1].type, 'turn', 'second handoff node must be turn');
    assert.strictEqual(handoff[1].content, 'question 16', 'turn 16 content');

    const expectedCpContent = [
      'User: question 11\nAssistant: answer 11',
      'User: question 12\nAssistant: answer 12',
      'User: question 13\nAssistant: answer 13',
      'User: question 14\nAssistant: answer 14',
      'User: question 15\nAssistant: answer 15',
    ].join('\n');
    assert.strictEqual(handoff[0].content, expectedCpContent, 'latest checkpoint content must be exchanges 11-15');

    const text = await memory.buildContextText(sessionId);
    assert.ok(text.includes('User: question 16\n'), 'context must contain question 16');
    assert.ok(text.includes('User: question 11\n'), 'context must contain question 11');
    assert.ok(!text.includes('User: question 1\n'), 'context must NOT contain question 1');
    assert.ok(!text.includes('User: question 5\n'), 'context must NOT contain question 5');
    assert.ok(!text.includes('User: question 10\n'), 'context must NOT contain question 10');

    const headId = await memory.getHead(sessionId);
    const byId = Object.fromEntries(allNodes.map((n) => [n.node_id, n]));
    let currentId = headId;
    let visited = 0;
    let nullCount = 0;
    while (currentId) {
      visited++;
      const node = byId[currentId];
      assert.ok(node, `node ${currentId} must exist`);
      if (node.prev_id === null) nullCount++;
      currentId = node.prev_id;
    }
    assert.strictEqual(visited, 19, 'walking prev_id from head must visit all 19 nodes (16 turns + 3 checkpoints)');
    assert.strictEqual(nullCount, 1, 'exactly one node must have prev_id null');
  });

  test(`${label}: C8 - new fields: normal exchange has provider set, failed_providers []`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c8-normal';

    const node = await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'hello',
      reply: 'hi there',
      model_used: 'test-model',
      status_at_this_point: 'done',
      provider: 'openai',
      failed_providers: [],
    });

    assert.strictEqual(node.provider, 'openai');
    assert.deepStrictEqual(node.failed_providers, []);

    const nodes = await memory.getSessionNodes(sessionId);
    assert.strictEqual(nodes[0].provider, 'openai');
    assert.deepStrictEqual(nodes[0].failed_providers, []);
  });

  test(`${label}: C9 - new fields: failover exchange has failed_providers ["openai"], provider "gemini"`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c9-failover';

    const node = await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'hello',
      reply: 'hi there',
      model_used: 'gemini-model',
      status_at_this_point: 'done',
      provider: 'gemini',
      failed_providers: ['openai'],
    });

    assert.strictEqual(node.provider, 'gemini');
    assert.deepStrictEqual(node.failed_providers, ['openai']);

    const nodes = await memory.getSessionNodes(sessionId);
    assert.strictEqual(nodes[0].provider, 'gemini');
    assert.deepStrictEqual(nodes[0].failed_providers, ['openai']);
  });

  test(`${label}: C10 - new fields: blocked exchange has provider null, failed_providers lists all tried`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c10-blocked';

    const node = await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'hello',
      reply: null,
      model_used: 'unknown',
      status_at_this_point: 'blocked',
      provider: null,
      failed_providers: ['openai', 'gemini'],
    });

    assert.strictEqual(node.provider, null);
    assert.deepStrictEqual(node.failed_providers, ['openai', 'gemini']);

    const nodes = await memory.getSessionNodes(sessionId);
    assert.strictEqual(nodes[0].provider, null);
    assert.deepStrictEqual(nodes[0].failed_providers, ['openai', 'gemini']);
  });

  test(`${label}: C11 - legacy nodes without new fields return defaults`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c11-legacy';

    // Manually insert a node without provider/failed_providers (simulating old data)
    const { randomUUID } = require('crypto');
    const legacyNode = {
      node_id: randomUUID(),
      prev_id: null,
      session_id: sessionId,
      type: 'turn',
      content: 'old node',
      reply: 'old reply',
      model_used: 'old-model',
      status_at_this_point: 'done',
      references: null,
      timestamp: new Date().toISOString(),
    };
    await store.appendNodes(sessionId, [legacyNode]);

    const nodes = await memory.getSessionNodes(sessionId);
    assert.strictEqual(nodes[0].provider, null, 'legacy node should have provider null');
    assert.deepStrictEqual(nodes[0].failed_providers, [], 'legacy node should have empty failed_providers');
  });

  test(`${label}: C12 - listSessions includes title from first turn content`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c12-title';

    await memory.appendNode(sessionId, {
      type: 'turn',
      content: 'First message content for title',
      reply: 'reply',
      model_used: 'm',
      status_at_this_point: 'done',
    });

    const sessions = await memory.listSessions();
    const session = sessions.find(s => s.id === sessionId);
    assert.ok(session, 'session should be listed');
    assert.strictEqual(session.title, 'First message content for title', 'title should match first turn content');
  });

  test(`${label}: C13 - listSessions title truncated to 60 chars`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c13-title-long';

    const longContent = 'A'.repeat(80);
    await memory.appendNode(sessionId, {
      type: 'turn',
      content: longContent,
      reply: 'reply',
      model_used: 'm',
      status_at_this_point: 'done',
    });

    const sessions = await memory.listSessions();
    const session = sessions.find(s => s.id === sessionId);
    assert.ok(session, 'session should be listed');
    assert.strictEqual(session.title.length, 60, 'title should be truncated to 60 chars');
    assert.strictEqual(session.title, 'A'.repeat(60));
  });

  test(`${label}: C14 - empty session has empty title`, async () => {
    const store = makeStore();
    const memory = createMemory(store);
    const sessionId = 'c14-empty';

    // Create session with only a checkpoint (no turns)
    const { randomUUID } = require('crypto');
    const cpNode = {
      node_id: randomUUID(),
      prev_id: null,
      session_id: sessionId,
      type: 'checkpoint',
      content: 'checkpoint content',
      model_used: '',
      status_at_this_point: 'done',
      references: null,
      timestamp: new Date().toISOString(),
    };
    await store.appendNodes(sessionId, [cpNode]);

    const sessions = await memory.listSessions();
    const session = sessions.find(s => s.id === sessionId);
    assert.ok(session, 'session should be listed');
    assert.strictEqual(session.title, '', 'session with no turns should have empty title');
  });
}

test('fileStore contract', (t) => {
  runMemoryContract('fileStore', () => {
    useTempSessionsDir(t);
    return createFileStore();
  });
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const { createPool } = require('../memory/pgPool');
  const { createPgStore } = require('../memory/pgStore');
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const baseSql = fs.readFileSync(schemaPath, 'utf8');

  test('pgStore contract', (t) => {
    const testSchema = `cmt_test_${require('crypto').randomBytes(4).toString('hex')}`;
    const sql = baseSql.replace(/continumai/g, testSchema);
    assert.ok(!sql.includes('continumai'), 'replaced SQL must not contain original schema name');

    let pool;
    let store;

    t.before(async () => {
      pool = createPool({ ...process.env, DATABASE_URL: testDatabaseUrl });
      await pool.query(sql);
      store = createPgStore({ pool, schema: testSchema });
    });

    t.after(async () => {
      if (pool) {
        try {
          await pool.query(`drop schema if exists ${testSchema} cascade`);
        } catch (_) {}
        await pool.end();
      }
    });

    runMemoryContract('pgStore', () => store);
  });
} else {
  test('pgStore contract [SKIPPED]', { skip: 'TEST_DATABASE_URL not set' }, () => {});
}

test('formatNodeText utility', () => {
  assert.strictEqual(formatNodeText(null), null);
  assert.strictEqual(formatNodeText({ type: 'checkpoint', content: 'cp text' }), 'cp text');
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'done', content: 'hi', reply: 'hello' }), 'User: hi\nAssistant: hello');
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'done', content: 'hi', reply: null }), null);
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'in_progress', content: 'hi', reply: 'hello' }), null);
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'blocked', content: 'hi', reply: 'hello' }), null);
});

test('pgStore unit: invalid schema name rejected at construction', () => {
  const { createPgStore } = require('../memory/pgStore');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://localhost:5432/test' });
  assert.throws(() => createPgStore({ pool, schema: 'x; drop table y' }), /invalid schema name/);
  pool.end();
});

test('import check: server.js and memory/store.js do not load pgPool/pgStore/pg', (t) => {
  const { spawnSync } = require('child_process');
  const { resolve } = require('path');
  const root = resolve(__dirname, '..');
  const env = { ...process.env, DATABASE_URL: 'postgresql://bogus:bogus@localhost:5432/bogus' };
  const code = `
    require('./server');
    require('./memory/store');
    const keys = Object.keys(require.cache).map(k => k.replace(/\\\\/g, '/'));
    const found = keys.some(k => k.includes('memory/pgPool') || k.includes('memory/pgStore') || k.includes('/node_modules/pg/'));
    console.log(found);
  `;
  const result = spawnSync(process.execPath, ['-e', code], { cwd: root, env, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `child exited with ${result.status}: ${result.stderr}`);
  const lastLine = result.stdout.trim().split('\n').pop().trim();
  assert.strictEqual(lastLine, 'false', 'pgPool, pgStore, or pg must not be loaded on import');
});

// T2: Failure policy tests
function makeFakeProvider() {
  return {
    name: 'fake',
    send: async function() {
      return { success: true, data: { reply: 'ok', model_used: 'm' }};
    }
  };
}

test('failure policy: buildContextText rejects -> 503 memory_unavailable, provider not called', async () => {
  const { createApp } = require('../server');
  let providerCalled = false;
  const failingMemory = {
    buildContextText: async function() { throw new Error('db down'); },
    appendNode: async function() {},
  };
  const providers = [{
    name: 'fake',
    send: async function() {
      providerCalled = true;
      return { success: true, data: { reply: 'ok', model_used: 'm' }};
    }
  }];
  const app = createApp({ providers, apiToken: null, memory: failingMemory });
  const s = await new Promise(function(r) {
    const svr = app.listen(0, '127.0.0.1', function() { r(svr); });
  });
  const port = s.address().port;
  const res = await fetch('http://127.0.0.1:' + port + '/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 't-fail', message: 'hello' })
  });
  const body = await res.json();
  assert.strictEqual(res.status, 503);
  assert.strictEqual(body.error.type, 'memory_unavailable');
  assert.strictEqual(providerCalled, false, 'provider must not be called');
  s.close();
});

test('failure policy: appendNode rejects after success -> 200, reply present, X-Memory-Saved: false', async () => {
  const { createApp } = require('../server');
  let appendFails = false;
  const failingMemory = {
    buildContextText: async function() { return ''; },
    appendNode: async function() { if (appendFails) throw new Error('write failed'); },
  };
  const providers = [makeFakeProvider()];
  const app = createApp({ providers, apiToken: null, memory: failingMemory });
  const s = await new Promise(function(r) {
    const svr = app.listen(0, '127.0.0.1', function() { r(svr); });
  });
  const port = s.address().port;
  
  const res1 = await fetch('http://127.0.0.1:' + port + '/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 't-append-fail', message: 'hello' })
  });
  assert.strictEqual(res1.status, 200);
  const body1 = await res1.json();
  assert.strictEqual(body1.reply, 'ok');
  
  appendFails = true;
  const res2 = await fetch('http://127.0.0.1:' + port + '/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 't-append-fail', message: 'hello again' })
  });
  assert.strictEqual(res2.status, 200);
  const body2 = await res2.json();
  assert.strictEqual(body2.reply, 'ok');
  assert.strictEqual(res2.headers.get('x-memory-saved'), 'false');
  
  s.close();
});