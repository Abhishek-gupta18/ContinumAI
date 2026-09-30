const { buildProviders } = require("../providers");
const { appendNode, getContextForHandoff } = require("../memory/store");

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

    // 1. Get context for handoff and build restoration string
    const priorNodes = getContextForHandoff(session_id);
    let augmentedMessage = message;

    if (priorNodes.length > 0) {
      const contextString = priorNodes
        .filter(node => node.type === 'turn')
        .map(node => node.content)
        .join(' ');
      augmentedMessage = `${contextString} ${message}`.trim();
    }

    const currentRequest = { ...normalizedRequest, message: augmentedMessage };

    let lastError = null;
    let lastProvider = null;

    // 2. Try providers in order with failover (any error → try next)
    for (const provider of providers) {
      const result = await provider.send(currentRequest);

      if (result.success) {
        console.log(
          `[gateway] Request ${currentRequest.session_id} served by ${provider.name} succeeded`
        );

        // 3. After provider responds (success), append "turn" node
        await appendNode(session_id, {
          type: 'turn',
          content: message,
          model_used: result.data.model_used,
          status_at_this_point: 'done',
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

    // 4. All providers failed — append "turn" node with "blocked" status
    if (lastError) {
      await appendNode(session_id, {
        type: 'turn',
        content: lastError.message,
        model_used: lastProvider || 'unknown',
        status_at_this_point: 'blocked',
      });
    }

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
