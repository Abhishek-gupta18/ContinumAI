require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createMemoryKeyStore, createPgKeyStore } = require('../keys/keyStore');

function runKeyStoreContract(name, makeStore) {
  test(`${name}: insert -> get/list/columns, other user sees nothing`, async () => {
    const s = makeStore();
    const u1 = '11111111-1111-4111-8111-111111111111';
    const u2 = '22222222-2222-4222-8222-222222222222';
    const row = await s.insert(u1, {
      name: 'my-openai',
      kind: 'openai',
      label: 'main',
      key_ciphertext: 'tok-1',
      key_last4: 'abcd',
      model: 'gpt-4o-mini',
      base_url: null,
      priority: 10,
      enabled: true,
      last_tested_at: null,
      last_test_ok: null,
    });
    assert.strictEqual(row.name, 'my-openai');
    assert.strictEqual(row.key_last4, 'abcd');

    const got = await s.get(u1, 'my-openai');
    assert.ok(got);
    for (const f of ['name', 'kind', 'label', 'key_ciphertext', 'key_last4', 'model', 'base_url', 'priority', 'enabled', 'last_tested_at', 'last_test_ok', 'created_at', 'updated_at']) {
      assert.ok(Object.prototype.hasOwnProperty.call(got, f), `missing column ${f}`);
    }
    assert.strictEqual(got.key_ciphertext, 'tok-1');

    const other = await s.get(u2, 'my-openai');
    assert.strictEqual(other, null);
    const otherList = await s.list(u2);
    assert.strictEqual(otherList.length, 0);
    assert.strictEqual(await s.count(u1), 1);
    assert.strictEqual(await s.count(u2), 0);
  });

  test(`${name}: list sorted by priority asc, tie -> name`, async () => {
    const s = makeStore();
    const u = '33333333-3333-4333-8333-333333333333';
    await s.insert(u, { name: 'b-key', kind: 'openai', label: '', key_ciphertext: 'c1', key_last4: 'aaaa', model: '', base_url: null, priority: 20, enabled: true, last_tested_at: null, last_test_ok: null });
    await s.insert(u, { name: 'a-key', kind: 'openai', label: '', key_ciphertext: 'c2', key_last4: 'bbbb', model: '', base_url: null, priority: 20, enabled: true, last_tested_at: null, last_test_ok: null });
    await s.insert(u, { name: 'c-key', kind: 'openai', label: '', key_ciphertext: 'c3', key_last4: 'cccc', model: '', base_url: null, priority: 5, enabled: true, last_tested_at: null, last_test_ok: null });
    const names = (await s.list(u)).map((r) => r.name);
    assert.deepStrictEqual(names, ['c-key', 'a-key', 'b-key']);
  });

  test(`${name}: duplicate name insert -> error with code 'exists'`, async () => {
    const s = makeStore();
    const u = '44444444-4444-4444-8444-444444444444';
    const row = { name: 'dup', kind: 'openai', label: '', key_ciphertext: 'c', key_last4: 'zzzz', model: '', base_url: null, priority: 10, enabled: true, last_tested_at: null, last_test_ok: null };
    await s.insert(u, row);
    await assert.rejects(() => s.insert(u, row), (err) => err.code === 'exists');
  });

  test(`${name}: update patches and keeps name/user, missing name -> null`, async () => {
    const s = makeStore();
    const u = '55555555-5555-4555-8555-555555555555';
    await s.insert(u, { name: 'k', kind: 'openai', label: 'old', key_ciphertext: 'ct', key_last4: 'abcd', model: 'm', base_url: null, priority: 10, enabled: true, last_tested_at: null, last_test_ok: null });
    const patched = await s.update(u, 'k', { label: 'new', key_last4: 'wxyz', key_ciphertext: 'ct2' });
    assert.strictEqual(patched.label, 'new');
    assert.strictEqual(patched.key_last4, 'wxyz');
    assert.strictEqual(patched.key_ciphertext, 'ct2');
    assert.strictEqual(patched.name, 'k');
    assert.strictEqual(await s.update(u, 'nope', { label: 'x' }), null);
    const other = await s.get(u, 'k');
    assert.strictEqual(other.label, 'new');
  });

  test(`${name}: remove -> truthy then falsy, row gone`, async () => {
    const s = makeStore();
    const u = '66666666-6666-4666-8666-666666666666';
    await s.insert(u, { name: 'k', kind: 'openai', label: '', key_ciphertext: 'c', key_last4: 'abcd', model: '', base_url: null, priority: 10, enabled: true, last_tested_at: null, last_test_ok: null });
    const removed = await s.remove(u, 'k');
    assert.ok(removed, 'first remove should succeed');
    const again = await s.remove(u, 'k');
    assert.ok(!again, 'second remove should fail');
    assert.strictEqual(await s.get(u, 'k'), null);
  });

  test(`${name}: setOrder sets priorities 10,20,30; unknown name -> Error and nothing changed`, async () => {
    const s = makeStore();
    const u = '77777777-7777-4777-8777-777777777777';
    await s.insert(u, { name: 'a', kind: 'openai', label: '', key_ciphertext: '1', key_last4: 'aaaa', model: '', base_url: null, priority: 3, enabled: true, last_tested_at: null, last_test_ok: null });
    await s.insert(u, { name: 'b', kind: 'openai', label: '', key_ciphertext: '2', key_last4: 'bbbb', model: '', base_url: null, priority: 2, enabled: true, last_tested_at: null, last_test_ok: null });
    await s.insert(u, { name: 'c', kind: 'openai', label: '', key_ciphertext: '3', key_last4: 'cccc', model: '', base_url: null, priority: 1, enabled: true, last_tested_at: null, last_test_ok: null });

    await s.setOrder(u, ['c', 'b', 'a']);
    const rows = await s.list(u);
    const byPriority = Object.fromEntries(rows.map((r) => [r.name, r.priority]));
    assert.strictEqual(byPriority.c, 10);
    assert.strictEqual(byPriority.b, 20);
    assert.strictEqual(byPriority.a, 30);
    assert.deepStrictEqual(rows.map((r) => r.name), ['c', 'b', 'a']);

    await assert.rejects(() => s.setOrder(u, ['a', 'ghost']), /unknown_name/);
    const afterRows = await s.list(u);
    const byPriorityAfter = Object.fromEntries(afterRows.map((r) => [r.name, r.priority]));
    assert.strictEqual(byPriorityAfter.c, 10, 'a failed setOrder must not change priorities');
    assert.strictEqual(byPriorityAfter.b, 20);
    assert.strictEqual(byPriorityAfter.a, 30);
  });

  test(`${name}: invalid userId -> TypeError`, async () => {
    const s = makeStore();
    await assert.rejects(() => s.list('not-a-uuid'), TypeError);
    await assert.rejects(() => s.get(null, 'k'), TypeError);
    await assert.rejects(() => s.insert('1111', {}), TypeError);
  });

  test(`${name}: user B cannot update or remove user A's row`, async () => {
    const s = makeStore();
    const u1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const u2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await s.insert(u1, { name: 'a-row', kind: 'openai', label: 'orig', key_ciphertext: 'ct', key_last4: 'abcd', model: 'm', base_url: null, priority: 10, enabled: true, last_tested_at: null, last_test_ok: null });

    const upd = await s.update(u2, 'a-row', { label: 'hacked' });
    assert.strictEqual(upd, null);
    const aRow = await s.get(u1, 'a-row');
    assert.strictEqual(aRow.label, 'orig');

    const rem = await s.remove(u2, 'a-row');
    assert.strictEqual(rem, false);
    const aRow2 = await s.get(u1, 'a-row');
    assert.ok(aRow2);
    assert.strictEqual(aRow2.label, 'orig');
  });
}

runKeyStoreContract('memoryKeyStore', () => createMemoryKeyStore());

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const { createPool } = require('../memory/pgPool');
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const baseSql = fs.readFileSync(schemaPath, 'utf8');

  test('pgKeyStore contract', { timeout: 45000 }, (t) => {
    const testSchema = `ck_test_${require('crypto').randomBytes(4).toString('hex')}`;
    const sql = baseSql.replace(/continumai/g, testSchema);
    assert.ok(!sql.includes('continumai'), 'replaced SQL must not contain original schema name');

    let pool;
    let store;

    t.before(async () => {
      pool = createPool({ ...process.env, DATABASE_URL: testDatabaseUrl });
      await pool.query(sql);
      store = createPgKeyStore(pool, testSchema);
    });

    t.after(async () => {
      if (pool) {
        try {
          await pool.query(`drop schema if exists ${testSchema} cascade`);
        } catch (_) {}
        await pool.end();
      }
    });

    runKeyStoreContract('pgKeyStore', () => store);
  });

  test('pgKeyStore unit: invalid schema name rejected at construction', () => {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: testDatabaseUrl });
    assert.throws(() => createPgKeyStore(pool, 'x; drop table y'), /invalid schema name/);
    pool.end();
  });
} else {
  test('pgKeyStore contract [SKIPPED]', { skip: 'TEST_DATABASE_URL not set' }, () => {});
}

test('pgKeyStore unit: invalid schema name rejected without TEST_DATABASE_URL too', () => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://localhost:5432/test' });
  assert.throws(() => createPgKeyStore(pool, 'bad schema'), /invalid schema name/);
  pool.end();
});