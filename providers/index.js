const { sendToOpenAI } = require("./openai");
const { sendToGemini } = require("./gemini");

function buildProviders(env = process.env) {
  const registry = [
    { name: "openai", keyEnv: "OPENAI_API_KEY", send: sendToOpenAI },
    { name: "gemini", keyEnv: "GEMINI_API_KEY", send: sendToGemini },
  ];

  return registry
    .filter((entry) => (env[entry.keyEnv] || "").trim() !== "")
    .map(({ name, send }) => ({ name, send }));
}

module.exports = { buildProviders };
