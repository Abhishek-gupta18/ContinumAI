function getProviderTimeoutMs(env = process.env) {
  const v = env.PROVIDER_TIMEOUT_MS;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  return 30000;
}

module.exports = { getProviderTimeoutMs };