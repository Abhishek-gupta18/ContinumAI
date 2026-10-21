const { createOpenAICompatSender } = require("./openaiCompat");

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NIM_DEFAULT_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct";

// NVIDIA NIM serves an OpenAI-compatible API; reuse the shared compat sender
// with its own env vars so it stays independent from openai_compat.
const sendToNvidia = createOpenAICompatSender({
  getConfig() {
    return {
      baseURL: NIM_BASE_URL,
      apiKey: (process.env.NVIDIA_API_KEY || "").trim(),
      model: (process.env.NVIDIA_MODEL || "").trim() || NIM_DEFAULT_MODEL,
    };
  },
});

module.exports = { sendToNvidia, NIM_BASE_URL, NIM_DEFAULT_MODEL };
