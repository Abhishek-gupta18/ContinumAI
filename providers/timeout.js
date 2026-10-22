function getProviderTimeoutMs(env = process.env) {
  const v = env.PROVIDER_TIMEOUT_MS;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  return 30000;
}

// Total wall-clock budget for one /chat request across the whole provider
// chain, default 60000. Individual provider calls get no more than the time
// that is left in this budget.
function getRequestDeadlineMs(env = process.env) {
  const v = env.REQUEST_DEADLINE_MS;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  return 60000;
}

module.exports = { getProviderTimeoutMs, getRequestDeadlineMs };