const { classifyError } = require("./errorClassifier");
const { refuseRedirectFetch } = require("./safeFetch");

function readCompatConfig(env = process.env) {
  const baseURL = (env.OPENAI_COMPAT_BASE_URL || "").trim();
  const apiKey = (env.OPENAI_COMPAT_API_KEY || "").trim() || "not-required";
  const model = (env.OPENAI_COMPAT_MODEL || "").trim();
  return { baseURL, apiKey, model };
}

function createOpenAICompatSender(options = {}) {
  let cachedClient = null;

  function getClient(config) {
    if (options.getClient) {
      return options.getClient(config);
    }
    if (!cachedClient) {
      const OpenAI = require("openai");
      cachedClient = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
    }
    return cachedClient;
  }

  async function sendToOpenAICompat(normalizedRequest) {
    const { session_id, message } = normalizedRequest;
    const config = options.getConfig ? options.getConfig() : readCompatConfig();

    console.log(`[openai_compat] Sending request for session ${session_id}`);

    if (!config.model) {
      return {
        success: false,
        error: {
          type: "generic",
          message: "OPENAI_COMPAT_MODEL is not set",
          statusCode: 500,
        },
      };
    }

    try {
      const response = await getClient(config).chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message },
        ],
      });

      const normalizedResponse = {
        session_id,
        reply: response.choices[0]?.message?.content || "",
        model_used: response.model || config.model || "unknown",
        raw_provider_response: response,
      };

      console.log(`[openai_compat] Request ${session_id} completed successfully`);

      return { success: true, data: normalizedResponse };
    } catch (error) {
      const structuredError = classifyError(error.status, error);
      return { success: false, error: structuredError };
    }
  }

  return sendToOpenAICompat;
}

function createOpenAICompatProvider({ name = "openai_compat", apiKey, baseURL, model, timeoutMs = 30000, clientFactory }) {
  const OpenAI = require("openai");

  if (typeof baseURL !== "string" || baseURL.trim() === "") {
    throw new TypeError("baseURL is required");
  }
  const normalizedBaseURL = baseURL.trim();

  const normalizedApiKey = (typeof apiKey === "string" && apiKey.trim()) || "not-required";

  let cachedClient = null;

  function getClient() {
    if (!cachedClient) {
      const clientOptions = {
        apiKey: normalizedApiKey,
        baseURL: normalizedBaseURL,
        fetch: refuseRedirectFetch,
      };
      cachedClient = clientFactory
        ? clientFactory(clientOptions)
        : new OpenAI(clientOptions);
    }
    return cachedClient;
  }

  async function send(normalizedRequest) {
    const { session_id, message } = normalizedRequest;

    console.log(`[openai_compat] Sending request for session ${session_id}`);

    if (!model || model.trim() === "") {
      return {
        success: false,
        error: {
          type: "generic",
          message: "model is not set",
          statusCode: 500,
        },
      };
    }

    try {
      const response = await getClient().chat.completions.create({
        model: model.trim(),
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message },
        ],
      });

      const normalizedResponse = {
        session_id,
        reply: response.choices[0]?.message?.content || "",
        model_used: response.model || model || "unknown",
        raw_provider_response: response,
      };

      console.log(`[openai_compat] Request ${session_id} completed successfully`);

      return { success: true, data: normalizedResponse };
    } catch (error) {
      const structuredError = classifyError(error.status, error);
      return { success: false, error: structuredError };
    }
  }

  return { name, kind: "openai_compat", model: model ? model.trim() : "", send };
}

const sendToOpenAICompat = createOpenAICompatSender();

module.exports = {
  sendToOpenAICompat,
  createOpenAICompatSender,
  createOpenAICompatProvider,
};