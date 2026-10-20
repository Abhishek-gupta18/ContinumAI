const { randomUUID } = require('crypto');

const VALID_SCHEMA = /^[a-z_][a-z0-9_]*$/;

function mapRow(row) {
  return {
    node_id: row.node_id,
    prev_id: row.prev_id,
    session_id: row.session_id,
    type: row.type,
    content: row.content,
    reply: row.reply,
    model_used: row.model_used,
    status_at_this_point: row.status_at_this_point,
    references: row.refs,
    provider: row.provider ?? null,
    failed_providers: row.failed_providers ?? [],
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function createPgStore({ pool, schema = 'continumai' }) {
  if (!VALID_SCHEMA.test(schema)) {
    throw new Error('invalid schema name');
  }

  const q = (sql, params) => pool.query(sql, params);

  async function getTail(sessionId) {
    const res = await q(
      `select * from ${schema}.nodes where session_id = $1 and seq >= coalesce((select max(seq) from ${schema}.nodes where session_id = $1 and type = 'checkpoint'), 0) order by seq`,
      [sessionId]
    );
    return res.rows.map(mapRow);
  }

  async function appendNodes(sessionId, nodes) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const node of nodes) {
        await client.query(
          `insert into ${schema}.nodes (node_id, session_id, prev_id, type, content, reply, model_used, status_at_this_point, refs, provider, failed_providers, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            node.node_id,
            sessionId,
            node.prev_id,
            node.type,
            node.content ?? '',
            node.reply ?? null,
            node.model_used ?? '',
            node.status_at_this_point ?? 'in_progress',
            node.references ?? null,
            node.provider ?? null,
            node.failed_providers ?? [],
            node.timestamp,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function getAllNodes(sessionId) {
    const res = await q(
      `select * from ${schema}.nodes where session_id = $1 order by seq`,
      [sessionId]
    );
    return res.rows.map(mapRow);
  }

  async function getSessionNodes(sessionId) {
    const res = await q(
      `select * from ${schema}.nodes where session_id = $1 order by seq`,
      [sessionId]
    );
    if (res.rows.length === 0) {
      const sessionRes = await q(
        `select 1 from ${schema}.nodes where session_id = $1 limit 1`,
        [sessionId]
      );
      return sessionRes.rows.length === 0 ? null : [];
    }
    return res.rows.map(mapRow);
  }

  async function listSessions() {
    const res = await q(
      `with first_turns as (
         select distinct on (session_id) session_id, content
         from ${schema}.nodes
         where type = 'turn'
         order by session_id, seq
       )
       select n.session_id as id,
              count(*)::int as node_count,
              max(n.created_at) as latest_activity,
              coalesce(array_agg(distinct nullif(n.model_used, '')) filter (where n.model_used <> ''), '{}') as models,
              coalesce(ft.content, '') as title
         from ${schema}.nodes n
         left join first_turns ft on ft.session_id = n.session_id
        group by n.session_id, ft.content
        order by max(n.created_at) desc nulls last, n.session_id`,
    );
    return res.rows.map((row) => ({
      id: row.id,
      node_count: row.node_count,
      latest_activity: row.latest_activity instanceof Date
        ? row.latest_activity.toISOString()
        : row.latest_activity,
      models: row.models || [],
      title: row.title ? (row.title.length > 60 ? row.title.slice(0, 60) : row.title) : '',
    }));
  }

  async function getHead(sessionId) {
    const res = await q(
      `select node_id from ${schema}.nodes where session_id = $1 order by seq desc limit 1`,
      [sessionId]
    );
    return res.rows[0]?.node_id ?? null;
  }

  return {
    getTail,
    appendNodes,
    getAllNodes,
    getSessionNodes,
    listSessions,
    getHead,
  };
}

module.exports = { createPgStore };