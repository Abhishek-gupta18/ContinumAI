const { buildProviders } = require("../providers");
const defaultMemory = require("../memory/store");
const { getProviderTimeoutMs, getRequestDeadlineMs } = require("../providers/timeout");

function callProvider(provider, request, timeoutMs) {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({
        success: false,
        error: {
          type: 'timeout',
          message: `${provider.name} timed out after ${timeoutMs} ms`,
          statusCode: 504,
        },
      });
    }, timeoutMs);
  });

  const sendPromise = Promise.resolve(provider.send(request)).then(
    (result) => result,
    (err) => ({
      success: false,
      error: {
        type: 'provider_error',
        message: err?.message ?? String(err),
        statusCode: 502,
      },
    })
  );

  const racePromise = Promise.race([sendPromise, timeoutPromise]);

  racePromise.catch(() => {});

  return racePromise.finally(() => {
    clearTimeout(timer);
  });
}

function createChatHandler(providers = buildProviders(), memory = defaultMemory, options = {}) {
  const providerTimeoutMs = options.providerTimeoutMs ?? getProviderTimeoutMs();
  const requestDeadlineMs = options.requestDeadlineMs ?? getRequestDeadlineMs();
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

    if (typeof session_id !== 'string') {
      return res.status(400).json({
        error: { type: 'validation', message: 'Invalid session_id' },
      });
    }
    if (typeof message !== 'string') {
      return res.status(400).json({
        error: { type: 'validation', message: 'message must be a string' },
      });
    }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(session_id)) {
      return res.status(400).json({
        error: { type: 'validation', message: 'Invalid session_id' },
      });
    }

    if (!providers || providers.length === 0) {
      return res.status(503).json({
        error: {
          type: "no_providers",
          message: "No AI providers are configured",
        },
      });
    }

    // Optional per-request provider preference: try the requested provider
    // first, then fail over through the rest of the chain.
    const requestedProvider = normalizedRequest.provider;
    let chain = providers;
    if (requestedProvider !== undefined && requestedProvider !== null) {
      if (typeof requestedProvider !== 'string') {
        return res.status(400).json({
          error: { type: "validation", message: "provider must be a string" },
        });
      }
      const preferred = providers.find((p) => p.name === requestedProvider);
      if (!preferred) {
        return res.status(400).json({
          error: {
            type: "validation",
            message: `Unknown provider "${requestedProvider}". Available: ${providers.map((p) => p.name).join(", ")}`,
          },
        });
      }
      chain = [preferred, ...providers.filter((p) => p !== preferred)];
    }

    let contextText;
    try {
      contextText = await memory.buildContextText(session_id);
    } catch (err) {
      console.error('[memory] buildContextText failed:', err.message, err.code ?? '');
      return res.status(503).json({
        error: {
          type: 'memory_unavailable',
          message: 'Conversation memory is unavailable',
        },
      });
    }

    const prompt =
      contextText !== ""
        ? `Conversation so far (earlier turns may have been answered by different assistants):\n${contextText}\n\nUser: ${message}`
        : message;

    const currentRequest = { session_id, message: prompt };

    let lastError = null;
    let lastProvider = null;
    let deadlineSpent = false;
    const failedProviders = [];

    const recordBlocked = async (resHdr) => {
      try {
        await memory.appendNode(session_id, {
          type: "turn",
          content: message,
          reply: null,
          model_used: "unknown",
          status_at_this_point: "blocked",
          provider: null,
          failed_providers: failedProviders,
        });
      } catch (err) {
        console.error(`[memory] appendNode failed: ${err.message} ${err.code ?? ''}`);
        resHdr.setHeader('X-Memory-Saved', 'false');
      }
    };

    // Wall-clock budget for this request shared across the provider chain:
    // each call gets min(providerTimeoutMs, remaining budget); when less than
    // MIN_ATTEMPT_MS of budget remains (or none) we stop trying providers
    // and return 504.
    const deadlineBeginsAt = Date.now();
    const MIN_ATTEMPT_MS = 50;

    for (const provider of chain) {
      const remainingMs = requestDeadlineMs - (Date.now() - deadlineBeginsAt);
      if (remainingMs < MIN_ATTEMPT_MS) {
        console.error(
          `[gateway] Request ${session_id}: request deadline (${requestDeadlineMs} ms) exceeded after ${failedProviders.length} provider attempt(s) — skipping remaining providers`
        );
        deadlineSpent = true;
        break;
      }

      const result = await callProvider(provider, currentRequest, Math.min(providerTimeoutMs, remainingMs));

      if (result.success) {
        console.log(
          `[gateway] Request ${currentRequest.session_id} served by ${provider.name} succeeded`
        );

        try {
          await memory.appendNode(session_id, {
            type: "turn",
            content: message,
            reply: result.data.reply,
            model_used: result.data.model_used,
            status_at_this_point: "done",
            provider: provider.name,
            failed_providers: failedProviders,
          });
        } catch (err) {
          console.error('[memory] appendNode failed after success:', err.message, err.code ?? '');
          res.setHeader('X-Memory-Saved', 'false');
        }
        return res.status(200).json(result.data);
      }

      lastError = result.error;
      lastProvider = provider.name;
      failedProviders.push(provider.name);

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

    await recordBlocked(res);

    if (deadlineSpent) {
      // Budget exhausted: stop, report the deadline, not the last provider error.
      return res.status(504).json({
        error: {
          type: "timeout",
          message: "request deadline exceeded",
        },
      });
    }

    console.error(
      `[gateway] Request ${session_id} failed on all providers. Last error from ${lastProvider}: ${lastError && lastError.message}`
    );
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