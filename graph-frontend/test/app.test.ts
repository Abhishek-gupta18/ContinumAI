import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { AddressInfo, Server } from 'node:net';
import { createApp } from '../src/server/app';
import { fileStore, pgStore, MemoryNode } from '../src/server/store';

describe('ContinumAI Session & Graph Routes', () => {
  let tmpDir: string;
  let server: Server;
  let baseUrl: string;
  const token = 'test-secret-bearer-123';

  // Seed data
  const normalNode: MemoryNode = {
    node_id: 'node-normal-1',
    prev_id: null,
    type: 'turn',
    content: 'What is the current system health and replica count?',
    reply: 'All 8 replicas are healthy with 1.2ms latency across regions.',
    model_used: 'openai',
    status_at_this_point: 'done',
    timestamp: '2026-10-17T12:00:00.000Z',
  };

  const failoverNode: MemoryNode = {
    node_id: 'node-failover-2',
    prev_id: 'node-normal-1',
    type: 'turn',
    content: 'Execute failover simulation for primary database node',
    reply: 'Failover simulation initiated via Gemini fallback gateway.',
    model_used: 'gemini',
    status_at_this_point: 'done',
    timestamp: '2026-10-17T12:05:00.000Z',
    failed_providers: ['openai'],
  };

  const blockedNode: MemoryNode = {
    node_id: 'node-blocked-3',
    prev_id: 'node-failover-2',
    type: 'turn',
    content: 'Drop active production tables without backup snapshot verification',
    reply: null,
    model_used: 'gemini',
    status_at_this_point: 'blocked',
    timestamp: '2026-10-17T12:10:00.000Z',
  };

  const checkpointNode: MemoryNode = {
    node_id: 'cp-checkpoint-4',
    prev_id: 'node-blocked-3',
    type: 'checkpoint',
    content: 'Snapshot state verified and frozen at step 4',
    reply: null,
    model_used: 'gemini',
    status_at_this_point: 'done',
    timestamp: '2026-10-17T12:15:00.000Z',
  };

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'continum-store-'));
    const store = fileStore(tmpDir);

    // Seed session: sess-normal (normal turn)
    await store.appendNode!('sess-normal', normalNode);

    // Seed session: sess-failover (normal + failover turn)
    await store.appendNode!('sess-failover', normalNode);
    await store.appendNode!('sess-failover', failoverNode);

    // Seed session: sess-blocked (normal + failover + blocked turn)
    await store.appendNode!('sess-blocked', normalNode);
    await store.appendNode!('sess-blocked', failoverNode);
    await store.appendNode!('sess-blocked', blockedNode);

    // Seed session: sess-checkpoint (with checkpoint node)
    await store.appendNode!('sess-checkpoint', normalNode);
    await store.appendNode!('sess-checkpoint', checkpointNode);

    const app = createApp({ store, authToken: token });
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    server?.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('401 without token', async () => {
    // 1. GET /sessions without token
    const resSessionsNoAuth = await fetch(`${baseUrl}/sessions`);
    assert.equal(resSessionsNoAuth.status, 401);

    // 2. GET /sessions with wrong token
    const resSessionsBadToken = await fetch(`${baseUrl}/sessions`, {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    assert.equal(resSessionsBadToken.status, 401);

    // 3. GET /sessions/:id/graph without token
    const resGraphNoAuth = await fetch(`${baseUrl}/sessions/sess-normal/graph`);
    assert.equal(resGraphNoAuth.status, 401);
  });

  test('400 on bad id', async () => {
    const badIds = ['bad id', 'bad@session', 'sess..ion', 'invalid!id', 'session$123'];
    for (const badId of badIds) {
      const res = await fetch(`${baseUrl}/sessions/${encodeURIComponent(badId)}/graph`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 400, `Expected 400 for bad id: "${badId}", got ${res.status}`);
      const data = await res.json();
      assert.equal(data.error, 'Invalid session ID');
    }
  });

  test('404 unknown', async () => {
    const res = await fetch(`${baseUrl}/sessions/unknown-session-123/graph`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error, 'Session not found');
  });

  test('correct shape after a normal exchange', async () => {
    const res = await fetch(`${baseUrl}/sessions/sess-normal/graph`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.id, 'sess-normal');
    assert.equal(data.title, 'What is the current system health and replica count?'.slice(0, 60));
    assert.equal(Array.isArray(data.nodes), true);
    assert.equal(data.nodes.length, 1);

    const node = data.nodes[0];
    assert.deepEqual(Object.keys(node).sort(), [
      'content',
      'model_used',
      'node_id',
      'prev_id',
      'reply',
      'status_at_this_point',
      'timestamp',
      'type',
    ].sort());
    assert.equal(node.node_id, 'node-normal-1');
    assert.equal(node.prev_id, null);
    assert.equal(node.type, 'turn');
    assert.equal(node.content, 'What is the current system health and replica count?');
    assert.equal(node.reply, 'All 8 replicas are healthy with 1.2ms latency across regions.');
    assert.equal(node.model_used, 'openai');
    assert.equal(node.status_at_this_point, 'done');
    assert.equal(node.timestamp, '2026-10-17T12:00:00.000Z');
  });

  test('failover exchange (failed_providers present)', async () => {
    const res = await fetch(`${baseUrl}/sessions/sess-failover/graph`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.id, 'sess-failover');
    assert.equal(data.nodes.length, 2);

    const secondNode = data.nodes[1];
    assert.equal(secondNode.node_id, 'node-failover-2');
    assert.equal(secondNode.model_used, 'gemini');
    assert.deepEqual(secondNode.failed_providers, ['openai']);
    assert.equal(secondNode.status_at_this_point, 'done');
  });

  test('blocked exchange', async () => {
    // 1. Check graph endpoint for blocked node
    const resGraph = await fetch(`${baseUrl}/sessions/sess-blocked/graph`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resGraph.status, 200);

    const dataGraph = await resGraph.json();
    const blocked = dataGraph.nodes[2];
    assert.equal(blocked.node_id, 'node-blocked-3');
    assert.equal(blocked.status_at_this_point, 'blocked');
    assert.equal(blocked.reply, null);

    // 2. Check /sessions list endpoint returns status: 'blocked'
    const resSessions = await fetch(`${baseUrl}/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resSessions.status, 200);

    const sessions = await resSessions.json();
    const targetSession = sessions.find((s: any) => s.id === 'sess-blocked');
    assert.ok(targetSession);
    assert.equal(targetSession.status, 'blocked');
    assert.equal(targetSession.updatedAt, '2026-10-17T12:10:00.000Z');
  });

  test('checkpoint node', async () => {
    const res = await fetch(`${baseUrl}/sessions/sess-checkpoint/graph`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.nodes.length, 2);

    const cp = data.nodes[1];
    assert.equal(cp.node_id, 'cp-checkpoint-4');
    assert.equal(cp.type, 'checkpoint');
    assert.equal(cp.content, 'Snapshot state verified and frozen at step 4');
    assert.equal(cp.reply, null);
    assert.equal(cp.status_at_this_point, 'done');
    assert.equal(cp.model_used, 'gemini');
  });

  test('pgStore listSessions contract test', async () => {
    // Mock pg client
    const mockDb = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('DISTINCT session_id')) {
          return { rows: [{ session_id: 'pg-sess-1' }, { session_id: 'pg-sess-2' }] };
        }
        if (sql.includes('ORDER BY timestamp ASC')) {
          return {
            rows: [
              {
                node_id: 'pg-n1',
                prev_id: null,
                type: 'turn',
                content: 'Test pg query',
                reply: 'Pg query result',
                model_used: 'openai',
                status_at_this_point: 'done',
                timestamp: '2026-10-17T10:00:00.000Z',
              },
            ],
          };
        }
        if (sql.includes('LIMIT 1')) {
          return {
            rows: [
              {
                node_id: 'pg-n1',
                prev_id: null,
                type: 'turn',
                content: 'Test pg query',
                reply: 'Pg query result',
                model_used: 'openai',
                status_at_this_point: 'done',
                timestamp: '2026-10-17T10:00:00.000Z',
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const store = pgStore(mockDb);
    const sessions = await store.listSessions();
    assert.deepEqual(sessions, ['pg-sess-1', 'pg-sess-2']);

    const head = await store.getHead('pg-sess-1');
    assert.equal(head?.node_id, 'pg-n1');

    const nodes = await store.getAllNodes('pg-sess-1');
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].node_id, 'pg-n1');
  });
});
