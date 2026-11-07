const { GoogleGenAI } = require("@google/genai");
const { classifyError } = require("./errorClassifier");
const { getProviderTimeoutMs } = require("./timeout");

// Lazy client (D7/P7): construct on first call and cache, so requiring this
// module never throws and buildProviders() skipping stays meaningful.
let genAI = null;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return genAI;
}

// Verified against a real @google/genai ApiError: the HTTP status lives in
// error.status (Object.keys = ["name","status"]; error.code and
// error.statusCode are undefined). Read status first, keep the old shapes as fallbacks.
function classifyGeminiError(error) {
  const statusCode = error.status || error.code || error.statusCode || 500;
  return classifyError(statusCode, error);
}

async function sendToGemini(normalizedRequest) {
  const { session_id, message } = normalizedRequest;

  console.log(`[gemini] Sending request for session ${session_id}`);

  try {
    const result = await getClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: message,
      config: {
        httpOptions: {
          timeout: getProviderTimeoutMs(),
        },
      },
    });
    const normalizedResponse = {
      session_id,
      reply: result.candidates?.[0]?.content?.parts?.[0]?.text || result.response?.text() || "",
      model_used: result.modelVersion || "unknown",
      raw_provider_response: result,
    };

    console.log(`[gemini] Request ${session_id} completed successfully`);

    return { success: true, data: normalizedResponse };
  } catch (error) {
    return { success: false, error: classifyGeminiError(error) };
  }
}

function createGeminiProvider({ name = "gemini", apiKey, model = "gemini-3.6-flash", timeoutMs = getProviderTimeoutMs(), clientFactory }) {
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new TypeError("apiKey is required");
  }
  let cachedClient = null;

  function getClient() {
    if (!cachedClient) {
      cachedClient = clientFactory
        ? clientFactory({ apiKey })
        : new GoogleGenAI({ apiKey });
    }
    return cachedClient;
  }

  async function send(normalizedRequest) {
    const { session_id, message } = normalizedRequest;

    console.log(`[gemini] Sending request for session ${session_id}`);

    try {
      const result = await getClient().models.generateContent({
        model,
        contents: message,
        config: {
          httpOptions: {
            timeout: timeoutMs,
          },
        },
      });
      const normalizedResponse = {
        session_id,
        reply: result.candidates?.[0]?.content?.parts?.[0]?.text || result.response?.text() || "",
        model_used: result.modelVersion || "unknown",
        raw_provider_response: result,
      };

      console.log(`[gemini] Request ${session_id} completed successfully`);

      return { success: true, data: normalizedResponse };
    } catch (error) {
      return { success: false, error: classifyGeminiError(error) };
    }
  }

  return { name, kind: "gemini", model, send };
}

module.exports = { sendToGemini, classifyGeminiError, createGeminiProvider };