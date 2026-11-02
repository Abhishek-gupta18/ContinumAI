'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { run } = require('../scripts/claim-legacy');

const OWNER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makePool() {
  const queries = [];
  return {
    queries,
    pool: {
      query: async (sql, params) => {
        queries.push({ sql, params: params ?? null });
        if (/^select count/.test(sql)) {
          return { rows: [{ n: 5 }], rowCount: 1 };
        }
        return { rows: [], rowCount: 5 };
      },
    },
  };
}

function makeLog() {
  const lines = [];
  return {
    lines,
    log: (...args) => lines.push(args.map(String).join(' ')),
    error: (...args) => lines.push(args.map(String).join(' ')),
  };
}

test('claim-legacy: dry run executes only the select and returns 0', async () => {
  const { pool, queries } = makePool();
  const log = makeLog();
  const code = await run({ pool, env: { OWNER_USER_ID: OWNER }, argv: [], log });
  assert.strictEqual(code, 0);
  assert.deepStrictEqual(
    queries.map((q) => q.sql),
    ['select count(*)::int as n from continumai.nodes where user_id is null'],
    `queries: ${JSON.stringify(queries)}`
  );
  assert.ok(log.lines.some((l) => l.includes('5')), `count must be logged: ${JSON.stringify(log.lines)}`);
}, { timeout: 5000 });

test('claim-legacy: --apply executes the update exactly once with [OWNER_USER_ID] and returns 0', async () => {
  const { pool, queries } = makePool();
  const log = makeLog();
  const code = await run({ pool, env: { OWNER_USER_ID: OWNER }, argv: ['--apply'], log });
  assert.strictEqual(code, 0);
  assert.strictEqual(queries.length, 1, `queries: ${JSON.stringify(queries)}`);
  assert.strictEqual(queries[0].sql, 'update continumai.nodes set user_id = $1 where user_id is null');
  assert.deepStrictEqual(queries[0].params, [OWNER]);
  assert.ok(log.lines.some((l) => l.includes('claimed 5 rows')), `log: ${JSON.stringify(log.lines)}`);
}, { timeout: 5000 });

test('claim-legacy: missing or invalid OWNER_USER_ID returns 2 with zero queries', async () => {
  const missing = makePool();
  const missingLog = makeLog();
  assert.strictEqual(
    await run({ pool: missing.pool, env: {}, argv: [], log: missingLog }),
    2
  );
  assert.strictEqual(missing.queries.length, 0);
  assert.ok(missingLog.lines.length > 0, 'an error must be logged');

  const invalid = makePool();
  const invalidLog = makeLog();
  assert.strictEqual(
    await run({ pool: invalid.pool, env: { OWNER_USER_ID: 'not-a-uuid' }, argv: ['--apply'], log: invalidLog }),
    2
  );
  assert.strictEqual(invalid.queries.length, 0);
  assert.ok(invalidLog.lines.length > 0, 'an error must be logged');
}, { timeout: 5000 });

test('claim-legacy: no logged line contains "postgres"', async () => {
  const { pool } = makePool();
  const log = makeLog();
  await run({ pool, env: { OWNER_USER_ID: OWNER }, argv: [], log: log });
  const logApply = makeLog();
  await run({ pool, env: { OWNER_USER_ID: OWNER }, argv: ['--apply'], log: logApply });
  const logErr = makeLog();
  await run({ pool, env: {}, argv: [], log: logErr });
  for (const l of log.lines.concat(logApply.lines, logErr.lines)) {
    assert.ok(!l.includes('postgres'), `log line must not contain "postgres": ${l}`);
  }
}, { timeout: 5000 });
