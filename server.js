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

function createAuthMiddleware(apiToken) {
  return (req, res, next) => {
    if (!(typeof apiToken === 'string' && apiToken.length > 0)) {
      return next();
    }

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { type: 'unauthorized', message: 'Missing or invalid token' },
      });
    }
    const token = auth.slice('Bearer '.length);
    if (!timingSafeEqualStrings(token, apiToken)) {
      return res.status(401).json({
        error: { type: 'unauthorized', message: 'Missing or invalid token' },
      });
    }
    return next();
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

  const requireAuth = createAuthMiddleware(apiToken);
  const sessionsRouter = createSessionsRouter(memory);
  app.use('/chat', requireAuth);
  app.use('/sessions', requireAuth);
  app.use(express.json());

  app.post("/chat", createChatHandler(providers, memory, { providerTimeoutMs }));
  app.get("/providers", requireAuth, (req, res) => {
    res.status(200).json({ providers: providers.map((p) => p.name) });
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

  const hasToken = typeof process.env.GATEWAY_API_TOKEN === 'string' && process.env.GATEWAY_API_TOKEN.length > 0;
  const allowUnauth = process.env.ALLOW_UNAUTHENTICATED === 'true';
  if (!hasToken && !allowUnauth) {
    console.error('GATEWAY_API_TOKEN is not set. Set GATEWAY_API_TOKEN or ALLOW_UNAUTHENTICATED=true (dev only) to start.');
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

  const app = createApp({ memory });
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`ContinumAI gateway running on port ${port}`);
  });
}

module.exports = { createApp };