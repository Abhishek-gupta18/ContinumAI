'use strict';

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
}

test('fileStore contract', (t) => {
  runMemoryContract('fileStore', () => {
    useTempSessionsDir(t);
    return createFileStore();
  });
});

test('formatNodeText utility', () => {
  assert.strictEqual(formatNodeText(null), null);
  assert.strictEqual(formatNodeText({ type: 'checkpoint', content: 'cp text' }), 'cp text');
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'done', content: 'hi', reply: 'hello' }), 'User: hi\nAssistant: hello');
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'done', content: 'hi', reply: null }), null);
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'in_progress', content: 'hi', reply: 'hello' }), null);
  assert.strictEqual(formatNodeText({ type: 'turn', status_at_this_point: 'blocked', content: 'hi', reply: 'hello' }), null);
});