const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_SCHEMA = /^[a-z_][a-z0-9_]*$/;

function validateUserId(userId) {
  if (typeof userId !== 'string' || !UUID.test(userId)) {
    throw new TypeError('userId must be a UUID string');
  }
}

function sortByPriority(rows) {
  return [...rows].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.name.localeCompare(b.name);
  });
}

function createMemoryKeyStore() {
  const byUser = new Map();

  function getUserRows(userId) {
    validateUserId(userId);
    if (!byUser.has(userId)) {
      byUser.set(userId, new Map());
    }
    return byUser.get(userId);
  }

  function clone(row) {
    return { ...row };
  }

  async function list(userId) {
    return sortByPriority([...getUserRows(userId).values()].map(clone));
  }

  async function get(userId, name) {
    const store = getUserRows(userId);
    const row = store.get(name);
    return row ? clone(row) : null;
  }

  async function count(userId) {
    return getUserRows(userId).size;
  }

  async function insert(userId, row) {
    const store = getUserRows(userId);
    if (store.has(row.name)) {
      const err = new Error('duplicate provider key name');
      err.code = 'exists';
      throw err;
    }
    const iso = new Date().toISOString();
    const stored = Object.assign(
      { created_at: iso, updated_at: iso },
      row,
      { name: row.name, user_id: userId }
    );
    store.set(row.name, stored);
    return clone(stored);
  }

  async function update(userId, name, patch) {
    const store = getUserRows(userId);
    const row = store.get(name);
    if (!row) {
      return null;
    }
    Object.assign(row, patch, { name: row.name, user_id: userId });
    row.updated_at = new Date().toISOString();
    return clone(row);
  }

  async function remove(userId, name) {
    const store = getUserRows(userId);
    return store.delete(name);
  }

  async function setOrder(userId, names) {
    const store = getUserRows(userId);
    for (const name of names) {
      if (!store.has(name)) {
        throw new Error('unknown_name');
      }
    }
    names.forEach((name, i) => {
      const row = store.get(name);
      row.priority = (i + 1) * 10;
      row.updated_at = new Date().toISOString();
    });
  }

  return { list, get, count, insert, update, remove, setOrder };
}

function createPgKeyStore(pool, schema = 'continumai') {
  if (!VALID_SCHEMA.test(schema)) {
    throw new Error('invalid schema name');
  }

  const q = (sql, params) => pool.query(sql, params);
  const table = `${schema}.provider_keys`;

  const COLUMNS = 'user_id, name, kind, label, key_ciphertext, key_last4, model, base_url, priority, enabled, last_tested_at, last_test_ok, created_at, updated_at';

  function mapRow(row) {
    if (!row) {
      return null;
    }
    return {
      name: row.name,
      kind: row.kind,
      label: row.label ?? '',
      key_ciphertext: row.key_ciphertext,
      key_last4: row.key_last4,
      model: row.model ?? '',
      base_url: row.base_url ?? null,
      priority: row.priority,
      enabled: row.enabled,
      last_tested_at: row.last_tested_at instanceof Date
        ? row.last_tested_at.toISOString()
        : row.last_tested_at ?? null,
      last_test_ok: row.last_test_ok,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }

  async function list(userId) {
    validateUserId(userId);
    const res = await q(
      `select ${COLUMNS} from ${table} where user_id = $1 order by priority, name`,
      [userId]
    );
    return res.rows.map(mapRow);
  }

  async function get(userId, name) {
    validateUserId(userId);
    const res = await q(
      `select ${COLUMNS} from ${table} where user_id = $1 and name = $2`,
      [userId, name]
    );
    return mapRow(res.rows[0]);
  }

  async function count(userId) {
    validateUserId(userId);
    const res = await q(
      `select count(*)::int as n from ${table} where user_id = $1`,
      [userId]
    );
    return res.rows[0].n;
  }

  async function insert(userId, row) {
    validateUserId(userId);
    try {
      const res = await q(
        `insert into ${table} (${COLUMNS})
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), now())
         returning ${COLUMNS}`,
        [
          userId,
          row.name,
          row.kind,
          row.label ?? '',
          row.key_ciphertext,
          row.key_last4,
          row.model ?? '',
          row.base_url ?? null,
          row.priority,
          row.enabled ?? true,
          row.last_tested_at ?? null,
          row.last_test_ok ?? null,
        ]
      );
      return mapRow(res.rows[0]);
    } catch (err) {
      if (err && err.code === '23505' && String(err.constraint || '').includes('_user_id_name_key')) {
        const exists = new Error('duplicate provider key name');
        exists.code = 'exists';
        throw exists;
      }
      throw err;
    }
  }

  async function update(userId, name, patch) {
    validateUserId(userId);
    const current = await get(userId, name);
    if (!current) {
      return null;
    }
    const next = { ...current };
    const keys = ['kind', 'label', 'key_ciphertext', 'key_last4', 'model', 'base_url', 'priority', 'enabled', 'last_tested_at', 'last_test_ok'];
    for (const k of keys) {
      if (patch && Object.prototype.hasOwnProperty.call(patch, k)) {
        next[k] = patch[k];
      }
    }
    const res = await q(
      `update ${table}
         set kind = $1, label = $2, key_ciphertext = $3, key_last4 = $4, model = $5,
             base_url = $6, priority = $7, enabled = $8, last_tested_at = $9,
             last_test_ok = $10, updated_at = now()
       where user_id = $11 and name = $12
       returning ${COLUMNS}`,
      [
        next.kind,
        next.label,
        next.key_ciphertext,
        next.key_last4,
        next.model,
        next.base_url,
        next.priority,
        next.enabled,
        next.last_tested_at,
        next.last_test_ok,
        userId,
        name,
      ]
    );
    return mapRow(res.rows[0]);
  }

  async function remove(userId, name) {
    validateUserId(userId);
    const res = await q(
      `delete from ${table} where user_id = $1 and name = $2`,
      [userId, name]
    );
    return res.rowCount > 0;
  }

  async function setOrder(userId, names) {
    validateUserId(userId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `select name from ${table} where user_id = $1 and name = any($2)`,
        [userId, names]
      );
      if (res.rows.length !== names.length) {
        await client.query('ROLLBACK');
        throw new Error('unknown_name');
      }
      let i = 0;
      for (const name of names) {
        i += 1;
        await client.query(
          `update ${table} set priority = $1, updated_at = now() where user_id = $2 and name = $3`,
          [i * 10, userId, name]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      if (err && err.message === 'unknown_name') {
        throw err;
      }
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  return { list, get, count, insert, update, remove, setOrder };
}

module.exports = { createMemoryKeyStore, createPgKeyStore };
