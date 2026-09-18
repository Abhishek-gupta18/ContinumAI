const { GoogleGenerativeAI } = require("@google/generative-ai");
const { classifyError } = require("./errorClassifier");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function sendToGemini(normalizedRequest) {
  const { session_id, message } = normalizedRequest;

  console.log(`[gemini] Sending request for session ${session_id}`);

  try {
    const result = await model.generateContent(message);
    const normalizedResponse = {
      session_id,
      reply: result.response.text() || "",
      model_used: result.model || "unknown",
      raw_provider_response: result,
    };

    console.log(`[gemini] Request ${session_id} completed successfully`);

    return { success: true, data: normalizedResponse };
  } catch (error) {
    const structuredError = classifyError(error.status, error);
    return { success: false, error: structuredError };
  }
}

module.exports = { sendToGemini };