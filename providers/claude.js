const { Anthropic } = require("@anthropic-ai/sdk");
const { classifyError } = require("./errorClassifier");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function sendToClaude(normalizedRequest) {
  const { session_id, message } = normalizedRequest;

  console.log(`[claude] Sending request for session ${session_id}`);

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      messages: [
        { role: "user", content: message },
      ],
    });

    const normalizedResponse = {
      session_id,
      reply: response.content[0].type === "text" ? response.content[0].text : "",
      model_used: response.model || "unknown",
      raw_provider_response: response,
    };

    console.log(`[claude] Request ${session_id} completed successfully`);

    return { success: true, data: normalizedResponse };
  } catch (error) {
    const structuredError = classifyError(error.statusCode, error);
    return { success: false, error: structuredError };
  }
}

module.exports = { sendToClaude };