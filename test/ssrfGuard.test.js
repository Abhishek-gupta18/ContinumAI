const test = require('node:test');
const assert = require('node:assert');
const { assertSafeBaseUrl } = require('../net/ssrfGuard');

const OK_LOOKUP = async () => [{ address: '93.184.216.34', family: 4 }];

// [input, expectThrow, expected err.reason]
const CASES = [
  ['https://api.example.com/v1', false, null],
  ['https://api.example.com/v1/', false, null],
  ['https://api.example.com/v1?q=1#frag', false, null],
  ['http://api.example.com/v1', true, 'non_https'],
  ['https://user:pass@api.example.com/v1', true, 'credentials_in_url'],
  ['https://api.example.com.invalid:443/v1', false, null],
  ['https://api.example.com.invalid:8443', true, 'bad_port'],
  ['https://api.example.com.invalid:443', false, null],
  ['https://[2001:db8::1]/v1', true, 'ip_literal_hostname'],
  ['not a url', true, 'unparsable_url'],
  ['', true, 'unparsable_url'],
  ['ftp://api.example.com.invalid', true, 'non_https'],
  ['https://localhost:8080/v1', true, 'bad_port'],
  ['https://api.localhost/v1', true, 'local_hostname'],
  ['https://LOCALHOST/v1', true, 'local_hostname'],
  ['https://host.local/v1', true, 'local_hostname'],
  ['https://api.internal.example.com.invalid/v1', false, null],
  ['x'.repeat(300) + '.local', true, 'unparsable_url'],
  ['https://10.0.0.1/v1', true, 'ip_literal_hostname'],
  ['https://127.0.0.1/v1', true, 'ip_literal_hostname'],
  ['https://8.8.8.8/v1', true, 'ip_literal_hostname'],
  ['https://intranet/v1', true, 'bare_hostname'],
];

const RESOLVED_CASES = [
  ['127.0.0.1', 4, true],
  ['10.9.9.9', 4, true],
  ['0.0.0.0', 4, true],
  ['100.64.7.7', 4, true],
  ['169.254.1.1', 4, true],
  ['172.16.255.3', 4, true],
  ['192.0.0.3', 4, true],
  ['192.0.2.44', 4, true],
  ['192.168.0.11', 4, true],
  ['198.18.5.5', 4, true],
  ['198.51.100.9', 4, true],
  ['203.0.113.3', 4, true],
  ['224.1.1.1', 4, true],
  ['::', 6, true],
  ['::1', 6, true],
  ['fc00::9', 6, true],
  ['fe80::abcd', 6, true],
  ['ff05::9', 6, true],
  ['2001:db8::a', 6, true],
  ['::ffff:127.0.0.1', 6, true],
  ['::ffff:7f00:1', 6, true],
  ['93.184.216.34', 4, false],
  ['9.9.9.9', 4, false],
];

test('ssrfGuard: url rejection table', async () => {
  for (const [input, expectThrow, reason] of CASES) {
    if (expectThrow) {
      await assert.rejects(
        () => assertSafeBaseUrl(input, { lookup: OK_LOOKUP }),
        (err) => err.message === 'unsafe_base_url' && err.reason === reason,
        `input "${input}" should be rejected with reason ${reason}`
      );
    } else {
      const out = await assertSafeBaseUrl(input, { lookup: OK_LOOKUP });
      const u = new URL(input);
      const originPath = `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/$/, '');
      assert.strictEqual(out, originPath, `normalized output for "${input}"`);
    }
  }
});

test('ssrfGuard: resolved-address rejection table (per family)', async () => {
  for (const [address, family, expectThrow] of RESOLVED_CASES) {
    const lookup = async () => [{ address, family }];
    if (expectThrow) {
      await assert.rejects(
        () => assertSafeBaseUrl('https://api.example.invalid/v1', { lookup }),
        (err) => err.message === 'unsafe_base_url' && err.reason === 'private_address',
        `resolved ${address} should be rejected`
      );
    } else {
      const out = await assertSafeBaseUrl('https://api.example.invalid/v1', { lookup });
      assert.strictEqual(out, 'https://api.example.invalid/v1');
    }
  }
});

test('ssrfGuard: lookup failure → lookup_failed', async () => {
  await assert.rejects(
    () => assertSafeBaseUrl('https://api.example.invalid/v1', {
      lookup: async () => { throw new Error('NXDOMAIN'); },
    }),
    (err) => err.message === 'unsafe_base_url' && err.reason === 'lookup_failed'
  );
});

test('ssrfGuard: multi-record lookup where the SECOND record is private', async () => {
  const lookup = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '10.0.0.7', family: 4 },
  ];
  await assert.rejects(
    () => assertSafeBaseUrl('https://multi.example.invalid/v1', { lookup }),
    (err) => err.message === 'unsafe_base_url' && err.reason === 'private_address'
  );
});

test('ssrfGuard: rejects bare-hostname and missing-protocol forms → non_https/unparsable_url', async () => {
  await assert.rejects(
    () => assertSafeBaseUrl('bare-host-name', { lookup: OK_LOOKUP }),
    (err) => err.message === 'unsafe_base_url'
  );
});
