function refuseRedirectFetch(url, init) {
  return globalThis.fetch(url, { ...init, redirect: 'error' });
}

module.exports = { refuseRedirectFetch };