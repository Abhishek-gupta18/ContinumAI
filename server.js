require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const { createChatHandler } = require("./routes/chat");
const { createSessionsRouter } = require("./routes/sessions");
const { buildProviders } = require("./providers");

function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(Buffer.alloc(bufA.length), bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function createDefaultAuthenticate(apiToken) {
  return async (req) => {
    if (!(typeof apiToken === 'string' && apiToken.length > 0)) {
      return { id: null };
    }

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return null;
    }
    const token = auth.slice('Bearer '.length);
    if (!timingSafeEqualStrings(token, apiToken)) {
      return null;
    }
    return { id: null };
  };
}

function parseCorsOrigins(configuredOrigins) {
  if (typeof configuredOrigins !== 'string' || configuredOrigins.trim() === '') {
    return [];
  }
  const origins = configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins.includes('*')) {
    throw new Error('CORS_ORIGIN must not contain *');
  }
  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGIN contains an invalid origin');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error('CORS_ORIGIN contains an invalid origin');
    }
  }
  return origins;
}

function createApp(options = {}) {
  const providers = options.providers || buildProviders();
  const apiToken = options.apiToken === undefined ? process.env.GATEWAY_API_TOKEN : options.apiToken;
  const memory = options.memory || require("./memory/store");
  const corsOrigins = parseCorsOrigins(
    options.corsOrigin === undefined ? process.env.CORS_ORIGIN : options.corsOrigin
  );
  const providerTimeoutMs = options.providerTimeoutMs;

  const app = express();

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next();
    if (!corsOrigins.includes(origin)) {
      if (req.method === 'OPTIONS') {
        return res.status(403).json({
          error: { type: 'cors', message: 'Origin is not allowed' },
        });
      }
      return res.status(403).json({
        error: { type: 'cors', message: 'Origin is not allowed' },
      });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  const authenticate = options.authenticate || createDefaultAuthenticate(apiToken);

  const requireAuth = async (req, res, next) => {
    let user;
    try {
      user = await authenticate(req);
    } catch (err) {
      return res.status(503).json({
        error: { type: 'auth_unavailable', message: 'Authentication service unavailable' },
      });
    }
    if (user === null) {
      return res.status(401).json({
        error: { type: 'unauthorized', message: 'Missing or invalid token' },
      });
    }
    req.user = { id: user.id, source: user.source ?? 'legacy' };
    return next();
  };
  const sessionsRouter = createSessionsRouter(memory);
  app.use('/chat', requireAuth);
  app.use('/sessions', requireAuth);
  app.use(express.json());

  app.post("/chat", createChatHandler(providers, memory, { providerTimeoutMs }));
  app.get("/providers", requireAuth, (req, res) => {
    res.status(200).json({ providers: providers.map((p) => p.name) });
  });
  app.get("/me", requireAuth, (req, res) => {
    res.status(200).json({ id: req.user.id, source: req.user.source });
  });
  app.get("/sessions", sessionsRouter.listSessions);
  app.get("/sessions/:id/nodes", sessionsRouter.getSessionNodes);

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({
        error: { type: "validation", message: "Invalid JSON body" },
      });
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

if (require.main === module) {
  if (
    process.env.REQUIRE_DATABASE === 'true' &&
    !(typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0)
  ) {
    console.error('REQUIRE_DATABASE=true but DATABASE_URL is empty. Set DATABASE_URL (or unset REQUIRE_DATABASE) and start again.');
    process.exit(1);
  }

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const hasToken = typeof process.env.GATEWAY_API_TOKEN === 'string' && process.env.GATEWAY_API_TOKEN.length > 0;
  const allowUnauth = process.env.ALLOW_UNAUTHENTICATED === 'true';
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const hasSupabaseUrl = typeof supabaseUrl === 'string' && supabaseUrl.length > 0;
  const hasSupabaseKey = typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0;
  if (hasSupabaseUrl !== hasSupabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_ANON_KEY must both be set or both be empty.');
    process.exit(1);
  }
  const ownerUserId = process.env.OWNER_USER_ID || null;
  if (ownerUserId !== null && !UUID.test(ownerUserId)) {
    console.error('OWNER_USER_ID must be empty or a valid UUID.');
    process.exit(1);
  }
  if (!hasToken && !hasSupabaseKey && !allowUnauth) {
    console.error(
      'GATEWAY_API_TOKEN is not set. Set GATEWAY_API_TOKEN or ALLOW_UNAUTHENTICATED=true (dev only) to start, or configure Supabase authentication (SUPABASE_URL + SUPABASE_ANON_KEY).'
    );
    process.exit(1);
  }

  let memory;
  if (typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0) {
    const { createPool } = require('./memory/pgPool');
    const { createPgStore } = require('./memory/pgStore');
    const { createMemory } = require('./memory/memory');
    const pool = createPool(process.env);
    memory = createMemory(createPgStore({ pool }));
    console.log('memory backend: postgres');
  } else {
    memory = require('./memory/store');
    console.log('memory backend: file');
  }

  const appOptions = { memory };
  if (hasSupabaseKey) {
    try {
      const { createSupabaseAuthenticator, createCombinedAuthenticate } = require('./auth/authenticators');
      appOptions.authenticate = createCombinedAuthenticate({
        legacyToken: process.env.GATEWAY_API_TOKEN,
        ownerUserId,
        disableLegacy: process.env.DISABLE_LEGACY_TOKEN === 'true',
        supabase: createSupabaseAuthenticator({
          supabaseUrl: supabaseUrl,
          anonKey: supabaseAnonKey,
        }),
      });
    } catch (err) {
      console.error(`Invalid Supabase configuration: ${err.message}`);
      process.exit(1);
    }
  }

  const app = createApp(appOptions);
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`ContinumAI gateway running on port ${port}`);
  });
}

module.exports = { createApp };