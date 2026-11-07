import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toGraphSession } from '../src/utils/sessionAdapter';
import { MemoryNode, SessionSummary } from '../src/types';

function makeNode(partial: Partial<MemoryNode> = {}): MemoryNode {
  return {
    node_id: 'n1',
    prev_id: null,
    type: 'turn',
    content: 'hello',
    reply: null,
    model_used: 'openai',
    status_at_this_point: 'done',
    timestamp: '2026-10-01T10:00:00.000Z',
    provider: 'openai',
    failed_providers: [],
    ...partial,
  };
}

function makeSummary(partial: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 'sess-1',
    node_count: 2,
    latest_activity: '2026-10-01T12:00:00.000Z',
    models: ['openai'],
    title: 'My session',
    ...partial,
  };
}

test('converts summary + nodes into the graph Session shape', () => {
  const nodes = [
    makeNode({ node_id: 'n1' }),
    makeNode({ node_id: 'n2', prev_id: 'n1' }),
  ];
  const session = toGraphSession(makeSummary(), nodes);

  assert.equal(session.id, 'sess-1');
  assert.equal(session.title, 'My session');
  assert.equal(session.nodes, nodes);
  assert.equal(session.description, '');
  assert.equal(session.updatedAt, '2026-10-01T12:00:00.000Z');
});

test('derives status from the last node: blocked -> blocked', () => {
  const nodes = [
    makeNode({ node_id: 'n1', status_at_this_point: 'done' }),
    makeNode({ node_id: 'n2', prev_id: 'n1', status_at_this_point: 'blocked' }),
  ];
  assert.equal(toGraphSession(makeSummary(), nodes).status, 'blocked');
});

test('derives status from the last node: in_progress -> active', () => {
  const nodes = [
    makeNode({ node_id: 'n1', status_at_this_point: 'done' }),
    makeNode({ node_id: 'n2', prev_id: 'n1', status_at_this_point: 'in_progress' }),
  ];
  assert.equal(toGraphSession(makeSummary(), nodes).status, 'active');
});

test('derives status from the last node: done -> completed', () => {
  const nodes = [makeNode({ node_id: 'n1', status_at_this_point: 'done' })];
  assert.equal(toGraphSession(makeSummary(), nodes).status, 'completed');
});

test('empty node list yields completed status', () => {
  assert.equal(toGraphSession(makeSummary(), []).status, 'completed');
});

test('falls back to the last node timestamp when latest_activity is null', () => {
  const nodes = [makeNode({ node_id: 'n1', timestamp: '2026-10-01T10:00:00.000Z' })];
  const session = toGraphSession(makeSummary({ latest_activity: null }), nodes);
  assert.equal(session.updatedAt, '2026-10-01T10:00:00.000Z');
});

test('tolerates a null summary: empty id and Untitled session title', () => {
  const nodes = [makeNode({ node_id: 'n1', timestamp: '2026-10-01T10:00:00.000Z' })];
  const session = toGraphSession(null, nodes);
  assert.equal(session.id, '');
  assert.equal(session.title, 'Untitled session');
  assert.equal(session.updatedAt, '2026-10-01T10:00:00.000Z');
});

test('falls back to the id as title when the summary title is empty', () => {
  const session = toGraphSession(makeSummary({ title: '' }), []);
  assert.equal(session.title, 'sess-1');
});

test('does not mutate its inputs and returns the same node array', () => {
  const summary = makeSummary();
  const nodes = [makeNode({ node_id: 'n1' })];
  const frozenSummary = { ...summary };
  const session = toGraphSession(summary, nodes);

  assert.deepEqual(summary, frozenSummary);
  assert.deepEqual([...nodes], [{ ...makeNode({ node_id: 'n1' }) }]);
  assert.equal(session.nodes, nodes);
});
