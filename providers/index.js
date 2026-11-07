const { createOpenAIProvider } = require("./openai");
const { createGeminiProvider } = require("./gemini");
const { createClaudeProvider } = require("./claude");
const { createOpenAICompatProvider } = require("./openaiCompat");
const { createNvidiaProvider } = require("./nvidia");
const { getProviderTimeoutMs } = require("./timeout");

function isSet(value) {
  return (value || "").trim() !== "";
}

function buildProviders(env = process.env) {
  const timeoutMs = getProviderTimeoutMs(env);

  const registry = [
    {
      name: "openai",
      enabled: isSet(env.OPENAI_API_KEY),
      factory: createOpenAIProvider,
      options: {
        apiKey: env.OPENAI_API_KEY,
        model: (env.OPENAI_MODEL || "").trim() || undefined,
      },
    },
    {
      name: "gemini",
      enabled: isSet(env.GEMINI_API_KEY),
      factory: createGeminiProvider,
      options: {
        apiKey: env.GEMINI_API_KEY,
        model: (env.GEMINI_MODEL || "").trim() || undefined,
      },
    },
    {
      name: "claude",
      enabled: isSet(env.ANTHROPIC_API_KEY),
      factory: createClaudeProvider,
      options: {
        apiKey: env.ANTHROPIC_API_KEY,
        model: (env.CLAUDE_MODEL || "").trim() || undefined,
      },
    },
    {
      name: "nvidia",
      enabled: isSet(env.NVIDIA_API_KEY),
      factory: createNvidiaProvider,
      options: {
        apiKey: env.NVIDIA_API_KEY,
        model: (env.NVIDIA_MODEL || "").trim() || undefined,
      },
    },
    {
      name: "openai_compat",
      enabled: isSet(env.OPENAI_COMPAT_BASE_URL),
      factory: createOpenAICompatProvider,
      options: {
        apiKey: env.OPENAI_COMPAT_API_KEY,
        baseURL: env.OPENAI_COMPAT_BASE_URL,
        model: (env.OPENAI_COMPAT_MODEL || "").trim() || undefined,
      },
    },
  ];

  return registry
    .filter((entry) => entry.enabled)
    .map(({ name, factory, options }) => factory({ name, ...options, timeoutMs }))
    .map(({ name, kind, model, send }) => ({ name, kind, model, send }));
}

module.exports = { buildProviders };