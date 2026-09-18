const { sendToOpenAI } = require("../providers/openai");
const { sendToGemini } = require("../providers/gemini");
const providerOrder = ["openai", "gemini"];

async function handleChatRequest(req, res) {
  const normalizedRequest = req.body;

  if (!normalizedRequest || !normalizedRequest.session_id || !normalizedRequest.message) {
    return res.status(400).json({
      error: {
        type: "validation",
        message: "Invalid normalized request: session_id and message are required",
        statusCode: 400,
      },
    });
  }

  let servedProvider = null;
  let currentRequest = normalizedRequest;

  for (const provider of providerOrder) {
    let result;

    if (provider === "openai") {
      result = await sendToOpenAI(currentRequest);
    } else if (provider === "gemini") {
      result = await sendToGemini(currentRequest);
    }

    servedProvider = provider;

    if (result.success) {
      console.log(
        `[gateway] Request ${currentRequest.session_id} served by ${provider} succeeded`
      );
      return res.status(200).json(result.data);
    }

    const { error } = result;

    if (error.type === "auth_error") {
      console.log(
        `[gateway] Request ${currentRequest.session_id} served by ${provider} failed with auth_error — not retrying`
      );
      return res.status(error.statusCode).json({
        error: { type: error.type, message: error.message },
      });
    }

    if (error.type === "rate_limit_error" || error.type === "provider_error") {
      console.log(
        `[gateway] Request ${currentRequest.session_id} served by ${provider} failed with ${error.type} — failing over to next provider`
      );
      continue;
    }

    return res.status(error.statusCode).json({
      error: { type: error.type, message: error.message },
    });
  }

  return res.status(500).json({
    error: {
      type: "generic",
      message: `All providers failed. Last error from ${servedProvider}: ${servedProvider}`,
    },
  });
}

module.exports = { handleChatRequest };