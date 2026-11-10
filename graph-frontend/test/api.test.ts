import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError, httpRequest, registerUnauthorizedHandler, setTokenProvider } from '../src/api/http';
import { sanitiseReturnTo } from '../src/auth/ProtectedRoute';

type CapturedInit = { url: string; init: RequestInit };

function fakeFetchSequence(
  shallow: (url: string, init: RequestInit, call: number) => Response,
): { captured: CapturedInit[]; restore: () => void; calls: () => number } {
  const captured: CapturedInit[] = [];
  let calls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const n = calls++;
    captured.push({ url: String(url), init: init ?? {} });
    return shallow(String(url), init ?? {}, n);
  }) as typeof fetch;
  return {
    captured,
    restore: () => {
      globalThis.fetch = original;
    },
    calls: () => calls,
  };
}

test('sanitiseReturnTo accepts a plain relative path', () => {
  assert.equal(sanitiseReturnTo('/app/graph'), '/app/graph');
});

test('sanitiseReturnTo rejects empty input', () => {
  assert.equal(sanitiseReturnTo(''), '/app/graph');
  assert.equal(sanitiseReturnTo(null), '/app/graph');
});

test('sanitiseReturnTo rejects protocol-relative and absolute URLs', () => {
  assert.equal(sanitiseReturnTo('//evil.com'), '/app/graph');
  assert.equal(sanitiseReturnTo('https://evil.com'), '/app/graph');
});

test('sanitiseReturnTo rejects javascript: URLs', () => {
  assert.equal(sanitiseReturnTo('javascript:alert(1)'), '/app/graph');
});

test('http adds the Authorization header from a session token', async () => {
  setTokenProvider(async () => 'tok-123');
  const fake = fakeFetchSequence(
    () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  try {
    await httpRequest('GET', '/me');
    const header = (fake.captured[0].init.headers as Record<string, string>).Authorization;
    assert.equal(header, 'Bearer tok-123');
  } finally {
    fake.restore();
    setTokenProvider(async () => null);
  }
});

test('http does not attach a header without a session', async () => {
  setTokenProvider(async () => null);
  const fake = fakeFetchSequence(
    () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
  );
  try {
    await httpRequest('GET', '/health');
    assert.equal((fake.captured[0].init.headers as Record<string, string>)?.Authorization, undefined);
  } finally {
    fake.restore();
  }
});

test('http handles a 204 with no body', async () => {
  setTokenProvider(async () => null);
  const fake = fakeFetchSequence(() => new Response(null, { status: 204 }));
  try {
    const data = await httpRequest<void>('DELETE', '/me/providers/x');
    assert.equal(data, undefined);
  } finally {
    fake.restore();
  }
});

test('http maps a JSON error body to ApiError', async () => {
  setTokenProvider(async () => null);
  const fake = fakeFetchSequence(
    () =>
      new Response(JSON.stringify({ error: { type: 'validation', message: 'Bad input' } }), {
        status: 400,
      }),
  );
  try {
    await assert.rejects(httpRequest('GET', '/sessions/x/nodes'), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 400);
      assert.equal(err.type, 'validation');
      assert.equal(err.message, 'Bad input');
      return true;
    });
  } finally {
    fake.restore();
  }
});

test('http maps a non-JSON error body to a fallback message', async () => {
  setTokenProvider(async () => null);
  const fake = fakeFetchSequence(() => new Response('<html>boom</html>', { status: 500 }));
  try {
    await assert.rejects(httpRequest('GET', '/sessions'), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 500);
      assert.equal(err.type, 'unknown_error');
      assert.equal(err.message, 'Request failed with status 500.');
      return true;
    });
  } finally {
    fake.restore();
  }
});

test('http calls the 401 handler once per burst', async () => {
  setTokenProvider(async () => null);
  let handled = 0;
  registerUnauthorizedHandler(() => {
    handled += 1;
  });
  const fake = fakeFetchSequence(() => new Response(null, { status: 401 }));
  try {
    await assert.rejects(httpRequest('GET', '/sessions'));
    await assert.rejects(httpRequest('GET', '/sessions'));
    assert.equal(handled, 1);
    assert.equal(fake.calls(), 2);
  } finally {
    fake.restore();
  }
});

test('http maps a non-JSON 2xx body to ApiError bad_response', async () => {
  setTokenProvider(async () => null);
  const fake = fakeFetchSequence(() => new Response('<html>ok</html>', { status: 200 }));
  try {
    await assert.rejects(httpRequest('GET', '/sessions'), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 200);
      assert.equal(err.type, 'bad_response');
      assert.equal(err.message, 'The server returned an unexpected response.');
      return true;
    });
  } finally {
    fake.restore();
  }
});

test('http never logs request bodies, headers or tokens', async () => {
  setTokenProvider(async () => 'tok-secret');
  const fake = fakeFetchSequence(
    () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
  );
  const methods = ['log', 'warn', 'error', 'info'] as const;
  const originals = new Map(
    methods.map((m) => [m, console[m]] as const),
  );
  let logged = 0;
  for (const m of methods) {
    console[m] = (() => {
      logged += 1;
    }) as typeof console.log;
  }
  try {
    await httpRequest('POST', '/chat', { body: { session_id: 'abc123', message: 'hi there' } });
    assert.equal(logged, 0);
    assert.notEqual(fake.captured[0].init.body, undefined);
  } finally {
    fake.restore();
    for (const m of methods) {
      console[m] = originals.get(m)!;
    }
    setTokenProvider(async () => null);
  }
});
