require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createPool } = require('../memory/pgPool');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const pool = createPool(process.env);

  try {
    await pool.query(sql);
    console.log('migrated');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();