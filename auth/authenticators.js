const crypto = require('crypto');

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_CHARS = /^[A-Za-z0-9._~+/=-]+$/;

function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }
  const token = auth.slice('Bearer '.length);
  if (token === '' || token.length > 4096 || !TOKEN_CHARS.test(token)) {
    return null;
  }
  return token;
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function createSupabaseAuthenticator({
  supabaseUrl,
  anonKey,
  fetchImpl = globalThis.fetch,
  cacheTtlMs = 60000,
  timeoutMs = 5000,
  maxEntries = 1000,
  now = Date.now,
}) {
  if (typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('https://')) {
    throw new TypeError('supabaseUrl must be a string starting with https://');
  }
  if (typeof anonKey !== 'string' || anonKey.length === 0) {
    throw new TypeError('anonKey must be a non-empty string');
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const cache = new Map();

  return async function authenticate(req) {
    const token = extractBearerToken(req);
    if (token === null) {
      return null;
    }

    const cacheKey = crypto.createHash('sha256').update(token).digest('hex');
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now()) {
      return { id: cached.id };
    }

    const payload = decodeJwtPayload(token);
    if (
      payload &&
      typeof payload.exp === 'number' &&
      Number.isFinite(payload.exp) &&
      payload.exp * 1000 <= now()
    ) {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(`${baseUrl}/auth/v1/user`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error('auth_unavailable');
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) {
      return null;
    }

    if (res.status !== 200) {
      throw new Error('auth_unavailable');
    }

    let body;
    try {
      body = await res.json();
    } catch (err) {
      throw new Error('auth_unavailable');
    }

    const id = body && body.id;
    if (typeof id !== 'string' || !USER_ID.test(id)) {
      throw new Error('auth_unavailable');
    }

    let expiresAt = now() + cacheTtlMs;
    if (
      payload &&
      typeof payload.exp === 'number' &&
      Number.isFinite(payload.exp) &&
      payload.exp * 1000 < expiresAt
    ) {
      expiresAt = payload.exp * 1000;
    }

    if (cache.size >= maxEntries) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
    cache.set(cacheKey, { id, expiresAt });

    return { id };
  };
}

function createCombinedAuthenticate({ legacyToken, ownerUserId, disableLegacy, supabase }) {
  if (ownerUserId !== null && ownerUserId !== undefined) {
    if (typeof ownerUserId !== 'string' || !USER_ID.test(ownerUserId)) {
      throw new TypeError('ownerUserId must be null or a UUID string');
    }
  }
  if (legacyToken !== undefined && legacyToken !== null && typeof legacyToken !== 'string') {
    throw new TypeError('legacyToken must be a string, null or undefined');
  }

  return async function authenticate(req) {
    const token = extractBearerToken(req);
    if (token === null) {
      return null;
    }

    if (
      typeof legacyToken === 'string' &&
      legacyToken.length > 0 &&
      disableLegacy !== true
    ) {
      const bufA = Buffer.from(token);
      const bufB = Buffer.from(legacyToken);
      const equal =
        bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
      if (equal) {
        return { id: ownerUserId ?? null, source: 'legacy' };
      }
    }

    if (typeof supabase === 'function') {
      const r = await supabase(req);
      if (r) {
        return { id: r.id, source: 'supabase' };
      }
    }

    return null;
  };
}

module.exports = { createSupabaseAuthenticator, createCombinedAuthenticate };
