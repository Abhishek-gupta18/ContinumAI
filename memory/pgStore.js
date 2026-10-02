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
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function createPgStore({ pool, schema = 'continumai' }) {
  if (!VALID_SCHEMA.test(schema)) {
    throw new Error('invalid schema name');
  }

  const q = (sql, params) => pool.query(sql, params);

  async function getTail(sessionId) {
    const checkpointSeq = await q(
      `select coalesce(max(seq), 0) as max_seq from ${schema}.nodes where session_id = $1 and type = 'checkpoint'`,
      [sessionId]
    );
    const minSeq = checkpointSeq.rows[0]?.max_seq ?? 0;

    const res = await q(
      `select * from ${schema}.nodes where session_id = $1 and seq >= $2 order by seq`,
      [sessionId, minSeq]
    );
    return res.rows.map(mapRow);
  }

  async function appendNodes(sessionId, nodes) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const node of nodes) {
        await client.query(
          `insert into ${schema}.nodes (node_id, session_id, prev_id, type, content, reply, model_used, status_at_this_point, refs, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
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
    getHead,
  };
}

module.exports = { createPgStore };