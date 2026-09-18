const { GoogleGenAI } = require("@google/genai");
const { classifyError } = require("./errorClassifier");

let genAI;
let model;

try {
  genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  model = genAI.models ? genAI.models.generateContent : null;
} catch (e) {
  genAI = null;
  model = null;
}

async function sendToGemini(normalizedRequest) {
  const { session_id, message } = normalizedRequest;

  if (!model) {
    return {
      success: false,
      error: classifyError(500, new Error("Gemini SDK initialization failed")),
    };
  }

  console.log(`[gemini] Sending request for session ${session_id}`);

  try {
    const result = await model({ model: "gemini-3.6-flash", contents: message });
    const normalizedResponse = {
      session_id,
      reply: result.candidates?.[0]?.content?.parts?.[0]?.text || result.response?.text() || "",
      model_used: result.modelVersion || "unknown",
      raw_provider_response: result,
    };

    console.log(`[gemini] Request ${session_id} completed successfully`);

    return { success: true, data: normalizedResponse };
  } catch (error) {
    const statusCode = error.code || error.statusCode || 500;
    const structuredError = classifyError(statusCode, error);
    return { success: false, error: structuredError };
  }
}

module.exports = { sendToGemini };