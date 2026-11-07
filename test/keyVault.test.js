const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

const keyVault = require('../crypto/keyVault');
const { createKeyVault } = keyVault;

function makeKey() {
  return crypto.randomBytes(32).toString('base64');
}

function base64urlDecode(part) {
  return Buffer.from(part, 'base64url');
}

test('V1: encrypt/decrypt roundtrip keeps plaintext identical, token has 4 base64url parts', () => {
  const vault = createKeyVault(makeKey());
  const plaintexts = ['short', 'sk-abcdef1234567890XYZ_-=+/ .~', 'ümlaut-液体-data', 'x'.repeat(4096)];
  for (const plaintext of plaintexts) {
    const token = vault.encrypt(plaintext, 'aad-1');
    assert.strictEqual(typeof token, 'string');
    const parts = token.split('.');
    assert.strictEqual(parts.length, 4, `expected 4 dot-parts, got ${parts.length}`);
    assert.strictEqual(parts[0], 'v1');
    for (const part of parts.slice(1)) {
      assert.match(part, /^[A-Za-z0-9_-]+$/, `part is not base64url: ${part}`);
    }
    const out = vault.decrypt(token, 'aad-1');
    assert.strictEqual(out, plaintext);
  }
});

test('V2: IV randomness — two calls with same input produce different tokens, both decrypt', () => {
  const vault = createKeyVault(makeKey());
  const t1 = vault.encrypt('same', 'a');
  const t2 = vault.encrypt('same', 'a');
  assert.notStrictEqual(t1, t2);
  assert.strictEqual(vault.decrypt(t1, 'a'), 'same');
  assert.strictEqual(vault.decrypt(t2, 'a'), 'same');
});

test('V3: wrong master key cannot decrypt → decrypt_failed', () => {
  const token = createKeyVault(makeKey()).encrypt('secret', 'aad');
  const attacker = createKeyVault(makeKey());
  assert.throws(() => attacker.decrypt(token, 'aad'), /decrypt_failed/);
});

test('V4: wrong aad cannot decrypt → decrypt_failed', () => {
  const vault = createKeyVault(makeKey());
  const token = vault.encrypt('secret', 'user1:key');
  assert.throws(() => vault.decrypt(token, 'user2:key'), /decrypt_failed/);
  assert.strictEqual(vault.decrypt(token, 'user1:key'), 'secret');
});

test('V5: invalid ciphertext tokens throw invalid_ciphertext, not crash', () => {
  const vault = createKeyVault(makeKey());
  const bad = ['not-a-token', 'v1', 'v1.short', 'v1.a.b', 'v1.a.b.c.d', 'garbage.x.y.z', 'v1.@@@@.bbbb.cccc', 'v2.a.b.c'];
  for (const token of bad) {
    assert.throws(() => vault.decrypt(token, 'a'), /invalid_ciphertext|decrypt_failed/, `should throw for ${token}`);
  }
});

test('V6: wrong-key params rejected with TypeError: not 32 bytes, empty string, not base64', () => {
  assert.throws(() => createKeyVault('short'), TypeError);
  assert.throws(() => createKeyVault(''), TypeError);
  assert.throws(() => createKeyVault('non-base64!!'), TypeError);
  const wrongLength = Buffer.from('16bytes').toString('base64');
  assert.throws(() => createKeyVault(wrongLength), TypeError);
});

test('V7: truncated tag (8 bytes) throws invalid_ciphertext', () => {
  const vault = createKeyVault(makeKey());
  const token = vault.encrypt('secret', 'aad');
  const parts = token.split('.');
  const truncatedTag = parts[2].slice(0, Math.floor(parts[2].length / 2));
  const badToken = [parts[0], parts[1], truncatedTag, parts[3]].join('.');
  assert.throws(() => vault.decrypt(badToken, 'aad'), /invalid_ciphertext/);
});

test('V8: truncated iv (8 bytes) throws invalid_ciphertext', () => {
  const vault = createKeyVault(makeKey());
  const token = vault.encrypt('secret', 'aad');
  const parts = token.split('.');
  const truncatedIv = parts[1].slice(0, Math.floor(parts[1].length / 2));
  const badToken = [parts[0], truncatedIv, parts[2], parts[3]].join('.');
  assert.throws(() => vault.decrypt(badToken, 'aad'), /invalid_ciphertext/);
});
