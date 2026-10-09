const { Pool } = require('pg');

function createPool(env = process.env) {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  let sslConfig = false;
  if (env.DATABASE_CA_CERT_PATH) {
    const fs = require('fs');
    const ca = fs.readFileSync(env.DATABASE_CA_CERT_PATH, 'utf8');
    sslConfig = { ca };
  } else {
    sslConfig = { rejectUnauthorized: false };
    console.warn('[pg] TLS: database certificate verification disabled (set DATABASE_CA_CERT_PATH to enable)');
  }

  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');

  const connectTimeout = Number(env.PG_CONNECT_TIMEOUT_MS);
  const connectionTimeoutMillis = Number.isFinite(connectTimeout) && connectTimeout > 0 ? connectTimeout : 10000;

  return new Pool({
    connectionString: url.toString(),
    max: 5,
    connectionTimeoutMillis,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    ssl: sslConfig,
  });
}

module.exports = { createPool };