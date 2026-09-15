require("dotenv").config();

const openai = new (require("openai"))({
  apiKey: process.env.OPENAI_API_KEY,
});
const { classifyError } = require("./errorClassifier");

async function sendToOpenAI(normalizedRequest) {
  const { session_id, message } = normalizedRequest;

  console.log(`[openai] Sending request for session ${session_id}`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
    });

    const normalizedResponse = {
      session_id,
      reply: response.choices[0]?.message?.content || "",
      model_used: response.model || "unknown",
      raw_provider_response: response,
    };

    console.log(`[openai] Request ${session_id} completed successfully`);

    return { success: true, data: normalizedResponse };
  } catch (error) {
    const structuredError = classifyError(error.status, error);
    return { success: false, error: structuredError };
  }
}

module.exports = { sendToOpenAI };