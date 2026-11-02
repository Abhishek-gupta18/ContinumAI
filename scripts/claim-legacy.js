const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run({ pool, env, argv, log }) {
  const ownerUserId = env.OWNER_USER_ID;
  if (typeof ownerUserId !== 'string' || !UUID.test(ownerUserId)) {
    log.error('OWNER_USER_ID must be set to a valid UUID before claiming legacy rows.');
    return 2;
  }

  const apply = argv.includes('--apply');

  if (!apply) {
    const res = await pool.query('select count(*)::int as n from continumai.nodes where user_id is null');
    log.log(`dry run: ${res.rows[0].n} legacy rows would be claimed by ${ownerUserId}`);
    return 0;
  }

  const res = await pool.query('update continumai.nodes set user_id = $1 where user_id is null', [
    ownerUserId,
  ]);
  log.log(`claimed ${res.rowCount} rows`);
  return 0;
}

module.exports = { run };

if (require.main === module) {
  require('dotenv').config();
  const { createPool } = require('../memory/pgPool');

  const log = {
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
  };

  let pool;
  try {
    pool = createPool(process.env);
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }

  run({ pool, env: process.env, argv: process.argv.slice(2), log })
    .then((code) => process.exit(code))
    .catch((err) => {
      log.error(`claim-legacy failed: ${err.message}`);
      process.exit(1);
    });
}
