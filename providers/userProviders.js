const { getProviderTimeoutMs } = require("./timeout");
const { createOpenAIProvider } = require("./openai");
const { createGeminiProvider } = require("./gemini");
const { createClaudeProvider } = require("./claude");
const { createNvidiaProvider } = require("./nvidia");
const { createOpenAICompatProvider } = require("./openaiCompat");

function createUserProviderResolver({
  keyStore,
  vault,
  envProviders = [],
  ownerUserId = null,
  ssrfGuard,
  factories,
  timeoutMs = getProviderTimeoutMs(),
}) {
  factories = factories || {
    openai: createOpenAIProvider,
    gemini: createGeminiProvider,
    claude: createClaudeProvider,
    nvidia: createNvidiaProvider,
    openai_compat: createOpenAICompatProvider,
  };

  async function resolve(userId) {
    if (userId === null) {
      return envProviders;
    }

    if (!keyStore || !vault) {
      if (userId === ownerUserId) {
        return envProviders;
      }
      return [];
    }

    let rows;
    try {
      rows = await keyStore.list(userId);
    } catch {
      throw new Error("Key store list failed");
    }

    const enabledRows = rows.filter((row) => row.enabled === true);

    if (userId === ownerUserId && enabledRows.length === 0) {
      return envProviders;
    }

    const providers = [];

    for (const row of enabledRows) {
      let decrypted;
      try {
        decrypted = await vault.decrypt(row.key_ciphertext, `${userId}:${row.name}`);
      } catch {
        providers.push({
          name: row.name,
          kind: row.kind,
          model: row.model,
          send: async () => ({
            success: false,
            error: {
              type: "config_error",
              message: "Stored provider configuration cannot be used",
              statusCode: 500,
            },
          }),
        });
        continue;
      }

      let baseURL;
      let ssrfError = false;

      if (row.kind === "openai_compat") {
        try {
          const ssrfResult = await ssrfGuard(row.base_url);
          baseURL = ssrfResult;
        } catch {
          ssrfError = true;
        }
      }

      if (ssrfError) {
        providers.push({
          name: row.name,
          kind: row.kind,
          model: row.model,
          send: async () => ({
            success: false,
            error: {
              type: "config_error",
              message: "Stored base_url is not allowed",
              statusCode: 400,
            },
          }),
        });
        continue;
      }

      let factoryOptions;
      let factoryKind;

      if (row.kind === "openai_compat") {
        factoryOptions = {
          name: row.name,
          apiKey: decrypted,
          model: row.model,
          baseURL,
          timeoutMs,
        };
        factoryKind = "openai_compat";
      } else {
        factoryOptions = {
          name: row.name,
          apiKey: decrypted,
          model: row.model || undefined,
          timeoutMs,
        };
        factoryKind = row.kind;
      }

      let provider;
      try {
        provider = factories[factoryKind](factoryOptions);
      } catch {
        providers.push({
          name: row.name,
          kind: row.kind,
          model: row.model,
          send: async () => ({
            success: false,
            error: {
              type: "config_error",
              message: "Stored provider configuration cannot be used",
              statusCode: 500,
            },
          }),
        });
        continue;
      }

      providers.push(provider);
    }

    return providers;
  }

  return resolve;
}

module.exports = { createUserProviderResolver };