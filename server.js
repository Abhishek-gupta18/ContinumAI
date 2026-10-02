require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const { createChatHandler } = require("./routes/chat");
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

function createApp(options = {}) {
  const providers = options.providers || buildProviders();
  const apiToken = options.apiToken === undefined ? process.env.GATEWAY_API_TOKEN : options.apiToken;
  const memory = options.memory || require("./memory/store");

  const app = express();

  if (typeof apiToken === 'string' && apiToken.length > 0) {
    app.post("/chat", (req, res, next) => {
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
      next();
    });
  }

  app.use(express.json());

  app.post("/chat", createChatHandler(providers, memory));

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
  const hasToken = typeof process.env.GATEWAY_API_TOKEN === 'string' && process.env.GATEWAY_API_TOKEN.length > 0;
  const allowUnauth = process.env.ALLOW_UNAUTHENTICATED === 'true';
  if (!hasToken && !allowUnauth) {
    console.error('GATEWAY_API_TOKEN is not set. Set GATEWAY_API_TOKEN or ALLOW_UNAUTHENTICATED=true (dev only) to start.');
    process.exit(1);
  }
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`ContinumAI gateway running on port ${port}`);
  });
}

module.exports = { createApp };