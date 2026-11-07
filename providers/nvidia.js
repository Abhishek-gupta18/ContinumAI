const { createOpenAICompatProvider } = require("./openaiCompat");

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NIM_DEFAULT_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct";

function createNvidiaProvider({ name = "nvidia", apiKey, model = NIM_DEFAULT_MODEL, timeoutMs = 30000, clientFactory }) {
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new TypeError("apiKey is required");
  }
  const provider = createOpenAICompatProvider({
    name,
    apiKey,
    baseURL: NIM_BASE_URL,
    model,
    timeoutMs,
    clientFactory,
  });
  // Override kind to 'nvidia'
  return { ...provider, kind: "nvidia" };
}

module.exports = { NIM_BASE_URL, NIM_DEFAULT_MODEL, createNvidiaProvider };