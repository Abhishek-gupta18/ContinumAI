import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../src/api/http';
import {
  buildPutBody,
  describeApiError,
  moveItem,
  PROVIDER_KINDS,
  validateForm,
  kindLabel,
  type ProviderFormValues,
} from '../src/features/providers/logic';

function values(patch: Partial<ProviderFormValues> = {}): ProviderFormValues {
  return {
    name: 'my-openai',
    kind: 'openai',
    label: 'Work key',
    model: 'gpt-4o-mini',
    base_url: '',
    api_key: 'sk-abcdef12345678',
    enabled: true,
    ...patch,
  };
}

test('PROVIDER_KINDS has the five documented kinds with exact labels', () => {
  assert.deepEqual(
    PROVIDER_KINDS.map((k) => `${k.kind}=${k.label}`),
    [
      'openai=OpenAI',
      'gemini=Google Gemini',
      'claude=Anthropic Claude',
      'nvidia=NVIDIA NIM',
      'openai_compat=OpenAI-compatible (custom https base URL)',
    ],
  );
});

test('kindLabel resolves a label and falls back to the raw kind', () => {
  assert.equal(kindLabel('openai'), 'OpenAI');
  assert.equal(kindLabel('mystery'), 'mystery');
});

// validateForm ---------------------------------------------------------------

test('create + openai minimum is valid', () => {
  assert.deepEqual(validateForm(values(), 'create'), {});
});

test('name "My Key" rejected (create)', () => {
  assert.ok(validateForm(values({ name: 'My Key' }), 'create').name);
});

test('33-char name rejected (create)', () => {
  assert.ok(validateForm(values({ name: 'a'.repeat(33) }), 'create').name);
});

test('valid 32-char name with - and _ accepted', () => {
  assert.deepEqual(validateForm(values({ name: `${'a'.repeat(30)}-_` }), 'create'), {});
});

test('label over 64 chars rejected', () => {
  assert.ok(validateForm(values({ label: 'x'.repeat(65) }), 'create').label);
});

test('label with a control character rejected', () => {
  assert.ok(validateForm(values({ label: 'bad\u0007bell' }), 'create').label);
});

test('model over 100 chars rejected', () => {
  assert.ok(validateForm(values({ model: 'm'.repeat(101) }), 'create').model);
});

test('model with whitespace rejected', () => {
  assert.ok(validateForm(values({ model: 'gpt 4o' }), 'create').model);
});

test('compat without model rejected', () => {
  const v = values({ kind: 'openai_compat', model: '', base_url: 'https://api.example.com/v1' });
  assert.ok(validateForm(v, 'create').model);
  assert.ok(validateForm(v, 'edit').model);
});

test('compat with a model is fine', () => {
  const v = values({ kind: 'openai_compat', base_url: 'https://api.example.com/v1' });
  assert.equal(validateForm(v, 'create').model, undefined);
});

test('compat create without base_url rejected', () => {
  assert.ok(validateForm(values({ kind: 'openai_compat', base_url: '' }), 'create').base_url);
});

test('compat edit with blank base_url is valid (keeps stored value)', () => {
  const v = values({ kind: 'openai_compat', base_url: '' });
  assert.deepEqual(validateForm(v, 'edit'), {});
});

test('compat with http:// rejected', () => {
  const v = values({ kind: 'openai_compat', base_url: 'http://api.example.com/v1' });
  assert.ok(validateForm(v, 'create').base_url);
  assert.ok(validateForm(v, 'edit').base_url);
});

test('compat base_url over 2048 chars rejected', () => {
  const v = values({ kind: 'openai_compat', base_url: `https://example.com/${'a'.repeat(2100)}` });
  assert.ok(validateForm(v, 'create').base_url);
});

test('non-compat with a base_url rejected', () => {
  assert.ok(validateForm(values({ base_url: 'https://api.example.com/v1' }), 'create').base_url);
});

test('create api_key too short rejected', () => {
  assert.ok(validateForm(values({ api_key: 'short' }), 'create').api_key);
});

test('create api_key with a space rejected', () => {
  assert.ok(validateForm(values({ api_key: 'sk-key with space inside' }), 'create').api_key);
});

test('create api_key over 512 rejected', () => {
  assert.ok(validateForm(values({ api_key: 'sk-' + 'a'.repeat(512) }), 'create').api_key);
});

test('edit mode with blank api_key valid', () => {
  const v = values();
  assert.deepEqual(validateForm({ ...v, api_key: '' }, 'edit'), {});
});

test('edit api_key left valid-length when cleared is valid and rejected when set to 7 chars', () => {
  const v = values();
  assert.equal(validateForm({ ...v, api_key: '' }, 'edit').api_key, undefined);
  assert.ok(validateForm({ ...v, api_key: 'a'.repeat(7) }, 'edit').api_key);
  assert.equal(validateForm({ ...v, api_key: 'sk-abcdef1234' }, 'edit').api_key, undefined);
});

test('name not validated on edit (read-only)', () => {
  const v = { ...values(), name: 'My Key' };
  assert.equal(validateForm(v, 'edit').name, undefined);
});

// buildPutBody ---------------------------------------------------------------

test('buildPutBody create: non-compat has kind, label, model, enabled, api_key, no base_url', () => {
  const body = buildPutBody(values(), 'create');
  assert.deepEqual(body, {
    kind: 'openai',
    label: 'Work key',
    model: 'gpt-4o-mini',
    enabled: true,
    api_key: 'sk-abcdef12345678',
  });
  assert.equal('base_url' in body, false);
});

test('buildPutBody create compat includes base_url', () => {
  const body = buildPutBody(values({ kind: 'openai_compat', base_url: 'https://api.example.com/v1' }), 'create');
  assert.equal(body.base_url, 'https://api.example.com/v1');
});

test('buildPutBody edit with blank api_key has no api_key property at all', () => {
  const original = { label: 'Work key', model: 'gpt-4o-mini', base_url: null, enabled: true };
  const body = buildPutBody({ ...values(), api_key: '' }, 'edit', original);
  assert.deepEqual(body, { kind: 'openai' });
  assert.equal('api_key' in body, false);
});

test('buildPutBody edit sends only fields that differ, api_key when not blank', () => {
  const original = { label: 'Old label', model: 'gpt-4o-mini', base_url: null, enabled: true };
  const body = buildPutBody({ ...values({ label: 'New label' }), api_key: 'sk-newkey1234567' }, 'edit', original);
  assert.deepEqual(body, {
    kind: 'openai',
    label: 'New label',
    api_key: 'sk-newkey1234567',
  });
  assert.equal('model' in body, false);
  assert.equal('enabled' in body, false);
});

test('buildPutBody edit compat includes base_url only when changed', () => {
  const unchanged = buildPutBody(values({ kind: 'openai_compat', base_url: 'https://a.com/v1' }), 'edit', {
    label: 'Work key',
    model: 'gpt-4o-mini',
    base_url: 'https://a.com/v1',
    enabled: true,
  });
  assert.equal('base_url' in unchanged, false);
  const changed = buildPutBody(values({ kind: 'openai_compat', base_url: 'https://b.com/v1' }), 'edit', {
    label: 'Work key',
    model: 'gpt-4o-mini',
    base_url: 'https://a.com/v1',
    enabled: true,
  });
  assert.equal(changed.base_url, 'https://b.com/v1');
});

// moveItem -------------------------------------------------------------------

test('moveItem moves a middle item up and down', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
});

test('moveItem at both ends returns an equal copy', () => {
  const list = ['a', 'b', 'c'];
  assert.deepEqual(moveItem(list, 0, -1), list);
  assert.deepEqual(moveItem(list, 2, 1), list);
  assert.notEqual(moveItem(list, 0, -1), list); // equal but a new array
});

test('moveItem with an out-of-range index returns an equal copy', () => {
  assert.deepEqual(moveItem(['a', 'b'], -1, 1), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 9, -1), ['a', 'b']);
});

// describeApiError -----------------------------------------------------------

test('describeApiError maps the documented ApiError types', () => {
  const e = (status: number, type: string, message: string) => new ApiError(status, type, message);
  assert.equal(describeApiError(e(400, 'limit_reached', 'x')), 'Provider key limit reached (maximum 10).');
  assert.equal(describeApiError(e(400, 'unsafe_base_url', 'x')), 'That base URL is not allowed: only public https endpoints are accepted.');
  assert.equal(describeApiError(e(403, 'account_required', 'x')), 'Sign in with an account to manage provider keys.');
  assert.equal(describeApiError(e(401, 'byok_not_configured', 'x')), 'Provider keys are not enabled on this server');
  assert.equal(describeApiError(e(503, 'internal_error', 'x')), 'Provider key storage is unavailable.');
  assert.equal(describeApiError(e(0, 'network', 'Unable to reach the ContinumAI gateway.')), 'Unable to reach the ContinumAI gateway.');
});

test('describeApiError passes the server message through for validation', () => {
  const err = new ApiError(400, 'validation', 'At most 10 provider keys per user');
  assert.equal(describeApiError(err), 'At most 10 provider keys per user');
});

test('describeApiError falls back to the message for unknown types and plain errors', () => {
  assert.equal(describeApiError(new ApiError(418, 'teapot', 'short and stout')), 'short and stout');
  assert.equal(describeApiError(new Error('boom')), 'boom');
  assert.equal(describeApiError('boom-text'), 'boom-text');
});
