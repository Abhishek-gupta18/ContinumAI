require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
async function run() {
  try {
    // Check row level security
    const rls = await pool.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'continumai' and c.relname = 'nodes'");
    console.log('(a) relrowsecurity:', rls.rows[0]?.relrowsecurity);
    
    // Test anon role
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('set local role anon');
      await client.query('select 1 from continumai.nodes limit 1');
      await client.query('rollback');
    } catch (err) {
      console.log('(b) anon select failed as expected:', err.code, err.message);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
run().catch(e => { console.error(e.message); process.exit(1); });