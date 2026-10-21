'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../server');
const { createMemory } = require('../memory/memory');
const { createFileStore } = require('../memory/fileStore');

function useTempSessionsDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'continumai-sessions-'));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

async function startServer(t, memory, options = {}) {
  const app = createApp({
    providers: [],
    memory,
    apiToken: options.apiToken === undefined ? 'test-token' : options.apiToken,
    corsOrigin: options.corsOrigin,
  });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    t.after(() => {
      instance.close();
      instance.closeAllConnections();
    });
  });
  return server;
}

function request(server, path, options = {}) {
  return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    ...options,
    headers: {
      Authorization: 'Bearer test-token',
      ...(options.headers || {}),
    },
  });
}

test('session endpoints require authentication', async (t) => {
  const sessionsDir = useTempSessionsDir(t);
  const server = await startServer(t, createMemory(createFileStore({ sessionsDir })));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/sessions`);
  assert.strictEqual(response.status, 401);
  assert.strictEqual((await response.json()).error.type, 'unauthorized');

  const nodesResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/sessions/session-a/nodes`
  );
  assert.strictEqual(nodesResponse.status, 401);
});

test('lists persisted sessions and returns deterministic isolated nodes', async (t) => {
  const sessionsDir = useTempSessionsDir(t);
  const memory = createMemory(createFileStore({ sessionsDir }));
  await memory.appendNode('session-a', {
    type: 'turn',
    content: 'first',
    reply: 'reply one',
    model_used: 'model-a',
    status_at_this_point: 'done',
  });
  await memory.appendNode('session-a', {
    type: 'turn',
    content: 'second',
    reply: 'reply two',
    model_used: 'model-b',
    status_at_this_point: 'done',
  });
  // Ensure a strictly later timestamp: same-ms ties are sorted by id, not insertion order.
  await new Promise((resolve) => setTimeout(resolve, 5));
  await memory.appendNode('session-b', {
    type: 'turn',
    content: 'other session',
    reply: 'other reply',
    model_used: 'model-c',
    status_at_this_point: 'blocked',
  });

  const server = await startServer(t, memory);
  const sessionsResponse = await request(server, '/sessions');
  assert.strictEqual(sessionsResponse.status, 200);
  const sessions = await sessionsResponse.json();
  assert.deepStrictEqual(
    sessions.sessions.map(({ id, node_count, models }) => ({ id, node_count, models })),
    [
      { id: 'session-b', node_count: 1, models: ['model-c'] },
      { id: 'session-a', node_count: 2, models: ['model-a', 'model-b'] },
    ]
  );
  assert.ok(sessions.sessions[0].latest_activity);

  const nodesResponse = await request(server, '/sessions/session-a/nodes');
  assert.strictEqual(nodesResponse.status, 200);
  const nodes = await nodesResponse.json();
  assert.strictEqual(nodes.session_id, 'session-a');
  assert.deepStrictEqual(nodes.nodes.map((node) => node.content), ['first', 'second']);
  assert.ok(nodes.nodes.every((node) => node.session_id === 'session-a'));
  assert.strictEqual(nodes.nodes[1].prev_id, nodes.nodes[0].node_id);
});

test('empty and unknown sessions are distinguished', async (t) => {
  const sessionsDir = useTempSessionsDir(t);
  const memory = createMemory(createFileStore({ sessionsDir }));
  const server = await startServer(t, memory);

  const emptyResponse = await request(server, '/sessions');
  assert.strictEqual(emptyResponse.status, 200);
  assert.deepStrictEqual((await emptyResponse.json()).sessions, []);

  const unknownResponse = await request(server, '/sessions/missing-session/nodes');
  assert.strictEqual(unknownResponse.status, 404);
  assert.strictEqual((await unknownResponse.json()).error.type, 'not_found');

  const invalidResponse = await request(server, '/sessions/not%20valid/nodes');
  assert.strictEqual(invalidResponse.status, 400);
  assert.strictEqual((await invalidResponse.json()).error.type, 'validation');
});

test('storage failures return memory_unavailable', async (t) => {
  const memory = {
    listSessions: async () => {
      throw new Error('list failed');
    },
    getSessionNodes: async () => {
      throw new Error('nodes failed');
    },
  };
  const server = await startServer(t, memory);

  const sessionsResponse = await request(server, '/sessions');
  assert.strictEqual(sessionsResponse.status, 503);
  assert.strictEqual((await sessionsResponse.json()).error.type, 'memory_unavailable');

  const nodesResponse = await request(server, '/sessions/session-a/nodes');
  assert.strictEqual(nodesResponse.status, 503);
  assert.strictEqual((await nodesResponse.json()).error.type, 'memory_unavailable');
});

test('CORS allows configured origins and rejects unapproved origins', async (t) => {
  const sessionsDir = useTempSessionsDir(t);
  const server = await startServer(t, createMemory(createFileStore({ sessionsDir })), {
    corsOrigin: 'http://localhost:3000',
  });

  const allowed = await request(server, '/sessions', {
    headers: { Origin: 'http://localhost:3000' },
  });
  assert.strictEqual(allowed.status, 200);
  assert.strictEqual(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');

  const rejected = await request(server, '/sessions', {
    headers: { Origin: 'http://localhost:4173' },
  });
  assert.strictEqual(rejected.status, 403);

  const preflight = await fetch(`http://127.0.0.1:${server.address().port}/sessions`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });
  assert.strictEqual(preflight.status, 204);
  assert.strictEqual(preflight.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
});
