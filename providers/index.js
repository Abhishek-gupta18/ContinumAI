const { sendToOpenAI } = require("./openai");
const { sendToGemini } = require("./gemini");
const { sendToClaude } = require("./claude");
const { sendToOpenAICompat } = require("./openaiCompat");
const { sendToNvidia } = require("./nvidia");

function isSet(value) {
  return (value || "").trim() !== "";
}

function buildProviders(env = process.env) {
  const registry = [
    { name: "openai", enabled: isSet(env.OPENAI_API_KEY), send: sendToOpenAI },
    { name: "gemini", enabled: isSet(env.GEMINI_API_KEY), send: sendToGemini },
    { name: "claude", enabled: isSet(env.ANTHROPIC_API_KEY), send: sendToClaude },
    { name: "nvidia", enabled: isSet(env.NVIDIA_API_KEY), send: sendToNvidia },
    { name: "openai_compat", enabled: isSet(env.OPENAI_COMPAT_BASE_URL), send: sendToOpenAICompat },
  ];

  return registry
    .filter((entry) => entry.enabled)
    .map(({ name, send }) => ({ name, send }));
}

module.exports = { buildProviders };
