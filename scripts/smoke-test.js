require('dotenv').config();
const { Pool } = require('pg');
const { createPgStore } = require('../memory/pgStore');
const { createMemory } = require('../memory/memory');
const { createPool } = require('../memory/pgPool');
const { createApp } = require('../server');
const { buildProviders } = require('../providers');

async function run() {
  const pool = createPool(process.env);
  const pgStore = createPgStore({ pool });
  const memory = createMemory(pgStore);
  const app = createApp({ providers: buildProviders(), apiToken: null, memory });
  
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  console.log(`Server listening on port ${port}`);

  async function chat(sessionId, message) {
    const res = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message }),
    });
    const data = await res.json();
    return { status: res.status, ...data };
  }

  const sessionId = 'smoke-test-' + Date.now();
  
  console.log('\n--- Request 1 ---');
  const r1 = await chat(sessionId, 'My name is Abhishek and my favourite language is Rust.');
  console.log('status:', r1.status, 'model_used:', r1.model_used, 'reply:', r1.reply);

  console.log('\n--- Request 2 ---');
  const r2 = await chat(sessionId, 'What is 2+2?');
  console.log('status:', r2.status, 'model_used:', r2.model_used, 'reply:', r2.reply);

  console.log('\n--- Request 3 ---');
  const r3 = await chat(sessionId, 'What is my name and my favourite language?');
  console.log('status:', r3.status, 'model_used:', r3.model_used, 'reply:', r3.reply);

  console.log('\n--- Session chain ---');
  const chain = await pgStore.getAllNodes(sessionId);
  for (const node of chain) {
    console.log(node.node_id.slice(0,8), node.prev_id?.slice(0,8) || 'null', node.type, node.status_at_this_point);
  }

  console.log('\n--- Cleanup ---');
  const deleted = await pool.query('delete from continumai.nodes where session_id = $1', [sessionId]);
  console.log('deleted rows:', deleted.rowCount);
  const remaining = await pool.query('select count(*) from continumai.nodes where session_id = $1', [sessionId]);
  console.log('remaining rows:', remaining.rows[0].count);

  server.close();
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });