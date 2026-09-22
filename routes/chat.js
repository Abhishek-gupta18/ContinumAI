const { sendToOpenAI } = require("../providers/openai");
const { sendToGemini } = require("../providers/gemini");
const providerOrder = ["openai", "gemini"];
const { appendNode, getContextForHandoff } = require("../memory/store");

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

  let servedProvider = null;
  let result = null;

  // 2. Try providers in order with failover
  for (const provider of providerOrder) {
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

      // 3. After provider responds (success), append "turn" node
      await appendNode(session_id, {
        type: 'turn',
        content: message,
        model_used: result.data.model_used,
        status_at_this_point: 'done',
      });
      return res.status(200).json(result.data);
    }

    const { error } = result;

    if (error.type === "auth_error") {
      console.log(
        `[gateway] Request ${currentRequest.session_id} served by ${provider} failed with auth_error — not retrying`
      );
      await appendNode(session_id, {
        type: 'turn',
        content: error.message,
        model_used: provider,
        status_at_this_point: 'blocked',
      });
      return res.status(error.statusCode).json({ error: { type: error.type, message: error.message } });
    }

    if (error.type === "rate_limit_error" || error.type === "provider_error") {
      console.log(
        `[gateway] Request ${currentRequest.session_id} served by ${provider} failed with ${error.type} — failing over to next provider`
      );
      continue;
    }

    await appendNode(session_id, {
      type: 'turn',
      content: error.message,
      model_used: provider,
      status_at_this_point: 'blocked',
    });
    return res.status(error.statusCode).json({ error: { type: error.type, message: error.message } });
  }

  // 4. All providers failed — append "turn" node with "blocked" status
  if (result && !result.success) {
    await appendNode(session_id, {
      type: 'turn',
      content: result.error ? result.error.message : 'All providers failed',
      model_used: servedProvider || 'unknown',
      status_at_this_point: 'blocked',
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