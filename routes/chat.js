const { buildProviders } = require("../providers");
const { appendNode, buildContextText } = require("../memory/store");

function createChatHandler(providers = buildProviders()) {
  return async function handleChatRequest(req, res) {
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

    const { session_id, message } = normalizedRequest;

    // D6: no providers configured → clear 503, memory untouched.
    if (!providers || providers.length === 0) {
      return res.status(503).json({
        error: {
          type: "no_providers",
          message: "No AI providers are configured",
        },
      });
    }

    // D5: role-formatted transcript prompt; original message stored as content.
    const contextText = buildContextText(session_id);
    const prompt =
      contextText !== ""
        ? `Conversation so far (earlier turns may have been answered by different assistants):\n${contextText}\n\nUser: ${message}`
        : message;

    const currentRequest = { ...normalizedRequest, message: prompt };

    let lastError = null;
    let lastProvider = null;

    // Try providers in order with failover (any error → try next)
    for (const provider of providers) {
      const result = await provider.send(currentRequest);

      if (result.success) {
        console.log(
          `[gateway] Request ${currentRequest.session_id} served by ${provider.name} succeeded`
        );

        // D1: one node per exchange — content = user's message, reply = provider's reply.
        await appendNode(session_id, {
          type: "turn",
          content: message,
          reply: result.data.reply,
          model_used: result.data.model_used,
          status_at_this_point: "done",
        });
        return res.status(200).json(result.data);
      }

      lastError = result.error;
      lastProvider = provider.name;

      if (lastError.type === "auth_error") {
        console.warn(
          `[gateway] Provider ${provider.name} failed with auth_error — key looks invalid, check config. Failing over to next provider.`
        );
      } else {
        console.warn(
          `[gateway] Provider ${provider.name} failed with ${lastError.type} — failing over to next provider`
        );
      }
    }

    // D2: all providers failed — still record the exchange, but never the error text.
    console.error(
      `[gateway] Request ${session_id} failed on all providers. Last error from ${lastProvider}: ${lastError && lastError.message}`
    );
    await appendNode(session_id, {
      type: "turn",
      content: message,
      reply: null,
      model_used: "unknown",
      status_at_this_point: "blocked",
    });

    const statusCode = (lastError && lastError.statusCode) || 500;
    return res.status(statusCode).json({
      error: {
        type: (lastError && lastError.type) || "generic",
        message: `All providers failed. Last error from ${lastProvider}: ${lastError && lastError.message}`,
      },
    });
  };
}

module.exports = { createChatHandler };
