require("dotenv").config();

const express = require("express");
const { createChatHandler } = require("./routes/chat");
const { buildProviders } = require("./providers");

function createApp(options = {}) {
  const providers = options.providers || buildProviders();

  const app = express();

  app.use(express.json());

  app.post("/chat", createChatHandler(providers));

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
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`ContinumAI gateway running on port ${port}`);
  });
}

module.exports = { createApp };
