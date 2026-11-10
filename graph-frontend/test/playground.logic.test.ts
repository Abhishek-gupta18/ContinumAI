import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../src/api/http';
import type { MemoryNode, SessionSummary } from '../src/api/types';
import {
  describeChatError,
  newSessionId,
  nodesToMessages,
  sortSessions,
  validateMessage,
} from '../src/features/playground/logic';

const node = (patch: Partial<MemoryNode>): MemoryNode => ({
  node_id: 'n1',
  prev_id: null,
  session_id: 's1',
  type: 'turn',
  content: 'question',
  reply: 'answer',
  model_used: 'model-a',
  status_at_this_point: 'done',
  references: null,
  provider: 'my-openai',
  failed_providers: [],
  timestamp: '2026-01-01T00:00:00Z',
  ...patch,
});

// newSessionId ---------------------------------------------------------------

test('newSessionId default: 300 samples all match the regex and are unique', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const id = newSessionId();
    assert.match(id, /^[A-Za-z0-9_-]{1,64}$/);
    assert.ok(id.startsWith('s'));
    seen.add(id);
  }
  assert.equal(seen.size, 300);
});

test('newSessionId default is at most 24 characters', () => {
  const id = newSessionId();
  assert.ok(id.length <= 24);
  assert.ok(id.length >= 2);
});

test('newSessionId falls back to the default for a bad custom random', () => {
  const id = newSessionId(() => 'bad id!');
  assert.match(id, /^[A-Za-z0-9_-]{1,64}$/);
});

test('newSessionId skips a custom random that yields an empty candidate', () => {
  const id = newSessionId(() => '---');
  assert.notEqual(id, 's');
  assert.match(id, /^[A-Za-z0-9_-]{1,64}$/);
});

// validateMessage ------------------------------------------------------------

test('validateMessage rejects empty input', () => {
  const r = validateMessage('');
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.error.length > 0);
});

test('validateMessage rejects whitespace-only input', () => {
  assert.equal(validateMessage('   \n  ').ok, false);
});

test('validateMessage trims valid text', () => {
  const r = validateMessage('  hello world  ');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.text, 'hello world');
});

test('validateMessage has no maximum length', () => {
  assert.equal(validateMessage('a'.repeat(50000)).ok, true);
});

// sortSessions ---------------------------------------------------------------

test('sortSessions orders by latest_activity descending with null last', () => {
  const sorted = sortSessions([
  { id: 'b', latest_activity: '2026-01-02T00:00:00Z', title: 'b', node_count: 0, models: [] },
  { id: 'c', latest_activity: null, title: 'c', node_count: 0, models: [] },
  { id: 'a', latest_activity: '2026-01-03T00:00:00Z', title: 'a', node_count: 0, models: [] },
  ] as SessionSummary[]);
  assert.deepEqual(sorted.map((s) => s.id), ['a', 'b', 'c']);
});

test('sortSessions breaks ties by id ascending', () => {
  const sorted = sortSessions([
  { id: 'z', latest_activity: '2026-01-02T00:00:00Z', title: '', node_count: 0, models: [] },
  { id: 'a', latest_activity: '2026-01-02T00:00:00Z', title: '', node_count: 0, models: [] },
  ] as SessionSummary[]);
  assert.deepEqual(sorted.map((s) => s.id), ['a', 'z']);
});

test('sortSessions puts null-only lists in id order and does not mutate input', () => {
  const input = [
  { id: 'm', latest_activity: null, title: '', node_count: 0, models: [] },
  { id: 'a', latest_activity: null, title: '', node_count: 0, models: [] },
  ] as SessionSummary[];
  const sorted = sortSessions(input);
  assert.deepEqual(sorted.map((s) => s.id), ['a', 'm']);
  assert.equal(input[0].id, 'm');
});

// nodesToMessages ------------------------------------------------------------

test('nodesToMessages: done turn -> user + assistant with model, provider, failedProviders', () => {
  const msgs = nodesToMessages([
    node({}),
  ]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user', 'assistant'],
  );
  const assistant = msgs[1];
  assert.equal(assistant.text, 'answer');
  assert.equal(assistant.model, 'model-a');
  assert.equal(assistant.provider, 'my-openai');
  assert.deepEqual(assistant.failedProviders, []);
});

test('nodesToMessages: blocked turn -> user + failed', () => {
  const msgs = nodesToMessages([
    node({ status_at_this_point: 'blocked', reply: null, provider: null, failed_providers: ['a', 'b'] }),
  ]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user', 'failed'],
  );
  assert.equal(msgs[1].text, 'No provider could answer this message.');
  assert.deepEqual(msgs[1].failedProviders, ['a', 'b']);
});

test('nodesToMessages: failover turn keeps failedProviders', () => {
  const msgs = nodesToMessages([
    node({ failed_providers: ['old', 'older'] }),
  ]);
  const assistant = msgs[1];
  assert.equal(assistant.role, 'assistant');
  assert.deepEqual(assistant.failedProviders, ['old', 'older']);
});

test('nodesToMessages: checkpoint and decision nodes are skipped', () => {
  const msgs = nodesToMessages([
    node({ type: 'checkpoint', content: 'cp', reply: null }),
    node({ node_id: 'n2', type: 'decision', content: 'dec', reply: null }),
  ]);
  assert.equal(msgs.length, 0);
});

test('nodesToMessages: empty list -> empty output', () => {
  assert.deepEqual(nodesToMessages([]), []);
});

test('nodesToMessages: done with reply null becomes failed', () => {
  const msgs = nodesToMessages([node({ reply: null })]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user', 'failed'],
  );
});

test('nodesToMessages: order preserved across turns', () => {
  const msgs = nodesToMessages([
    node({ node_id: 'n1', content: 'first' }),
    node({ node_id: 'n2', prev_id: 'n1', content: 'second', reply: 'second answer' }),
  ]);
  assert.deepEqual(msgs.map((m) => m.text), ['first', 'answer', 'second', 'second answer']);
});

test('nodesToMessages: in_progress turn (reply null) yields ONLY the user message', () => {
  const msgs = nodesToMessages([
    node({ status_at_this_point: 'in_progress', reply: null }),
  ]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user'],
  );
});

test('nodesToMessages: blocked turn still yields user + failed', () => {
  const msgs = nodesToMessages([
    node({ status_at_this_point: 'blocked', reply: null, provider: null, failed_providers: ['a'] }),
  ]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user', 'failed'],
  );
});

test('nodesToMessages: done with reply null still yields user + failed', () => {
  const msgs = nodesToMessages([node({ reply: null })]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user', 'failed'],
  );
});

test('nodesToMessages: mixed list [done, in_progress] yields user, assistant, user', () => {
  const msgs = nodesToMessages([
    node({ node_id: 'n1' }),
    node({ node_id: 'n2', prev_id: 'n1', status_at_this_point: 'in_progress', reply: null }),
  ]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user', 'assistant', 'user'],
  );
});

test('nodesToMessages: in_progress turn with a stale non-null reply also stays user-only (no second message)', () => {
  const msgs = nodesToMessages([
    node({ status_at_this_point: 'in_progress', reply: 'stale' }),
  ]);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ['user'],
  );
});

// describeChatError ----------------------------------------------------------

const e = (status: number, type: string, message: string) => new ApiError(status, type, message);

test('describeChatError: no_providers -> add_key', () => {
  const r = describeChatError(e(503, 'no_providers', 'x'));
  assert.equal(r.message, 'No provider keys are set up for this account.');
  assert.equal(r.action, 'add_key');
});

test('describeChatError: providers_unavailable -> retry', () => {
  const r = describeChatError(e(503, 'providers_unavailable', 'x'));
  assert.equal(r.message, 'Provider settings are temporarily unavailable.');
  assert.equal(r.action, 'retry');
});

test('describeChatError: memory_unavailable -> retry', () => {
  const r = describeChatError(e(503, 'memory_unavailable', 'x'));
  assert.equal(r.message, 'Conversation memory is unavailable. Nothing was sent.');
  assert.equal(r.action, 'retry');
});

test('describeChatError: timeout -> retry', () => {
  const r = describeChatError(e(504, 'timeout', 'x'));
  assert.equal(r.message, 'The providers took too long to answer.');
  assert.equal(r.action, 'retry');
});

test('describeChatError: network -> retry', () => {
  const r = describeChatError(e(0, 'network', 'x'));
  assert.equal(r.message, 'Cannot reach the ContinumAI gateway.');
  assert.equal(r.action, 'retry');
});

test('describeChatError: unauthorized -> message without action', () => {
  const r = describeChatError(e(401, 'unauthorized', 'x'));
  assert.equal(r.message, 'Your session has expired.');
  assert.equal(r.action, undefined);
});

test('describeChatError: validation / auth_error / provider_error / generic use the server message', () => {
  const types: string[] = ['validation', 'auth_error', 'provider_error', 'generic', 'weird_type'];
  for (const type of types) {
    const r = describeChatError(e(400, type, 'server says: ' + type));
    assert.equal(r.message, 'server says: ' + type);
    assert.equal(r.action, undefined);
  }
});

test('describeChatError: non-ApiError uses its own message', () => {
  assert.equal(describeChatError(new Error('boom')).message, 'boom');
  assert.equal(describeChatError('boom-text').message, 'boom-text');
});
