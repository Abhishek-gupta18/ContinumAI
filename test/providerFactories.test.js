const test = require("node:test");
const assert = require("node:assert");
const { classifyError } = require("../providers/errorClassifier");

function runProviderFactoryTests(factoryModule, providerName, kind, defaultModel, extraFactoryOptions = {}) {
  test(`${providerName} factory`, { timeout: 5000 }, async (t) => {
    let capturedClientOptions = null;
    let capturedSdkCall = null;

    const fakeClientFactory = (options) => {
      capturedClientOptions = options;
      return {
        chat: {
          completions: {
            create: async (params) => {
              capturedSdkCall = params;
              return {
                choices: [{ message: { content: "fake reply" } }],
                model: "fake-model",
              };
            },
          },
        },
        models: {
          generateContent: async (params) => {
            capturedSdkCall = params;
            return {
              candidates: [{ content: { parts: [{ text: "fake reply" }] } }],
              modelVersion: "fake-model",
              response: { text: () => "fake reply" },
            };
          },
        },
        messages: {
          create: async (params) => {
            capturedSdkCall = params;
            return {
              content: [{ type: "text", text: "fake reply" }],
              model: "fake-model",
            };
          },
        },
      };
    };

    await t.test("client created with given apiKey", async () => {
      const provider = factoryModule(
        kind === "openai_compat"
          ? { name: providerName, apiKey: "test-key-123", baseURL: "https://test.example.com/v1", model: defaultModel, clientFactory: fakeClientFactory }
          : { name: providerName, apiKey: "test-key-123", model: defaultModel, clientFactory: fakeClientFactory }
      );
      assert.strictEqual(provider.name, providerName);
      assert.strictEqual(provider.kind, kind);
      assert.strictEqual(provider.model, defaultModel);
      await provider.send({ session_id: "test", message: "hello" });
      assert.ok(capturedClientOptions, "client options should be captured");
      assert.strictEqual(capturedClientOptions.apiKey, "test-key-123");
      if (kind === "openai_compat") {
        assert.strictEqual(capturedClientOptions.baseURL, "https://test.example.com/v1");
        if (typeof capturedClientOptions.fetch === "function") {
          let fetchCalled = false;
          const originalFetch = globalThis.fetch;
          globalThis.fetch = async (url, init) => {
            fetchCalled = true;
            assert.strictEqual(init.redirect, "error");
            return new Response("ok");
          };
          try {
            await capturedClientOptions.fetch("https://test.com", {});
            assert.ok(fetchCalled);
          } finally {
            globalThis.fetch = originalFetch;
          }
        } else {
          assert.fail("compat factory should have fetch option");
        }
      }
    });

    await t.test("SDK call uses given model", async () => {
      capturedSdkCall = null;
      const customModel = "custom-model-name";
      const provider = factoryModule(
        kind === "openai_compat"
          ? { name: providerName, apiKey: "test-key", baseURL: "https://test.example.com/v1", model: customModel, clientFactory: fakeClientFactory }
          : { name: providerName, apiKey: "test-key", model: customModel, clientFactory: fakeClientFactory }
      );
      await provider.send({ session_id: "test", message: "hello" });
      assert.ok(capturedSdkCall, "SDK call should be captured");
      assert.strictEqual(capturedSdkCall.model, customModel);
    });

    if (kind !== "openai_compat") {
      await t.test("default model equals constant", async () => {
        capturedSdkCall = null;
        const provider = factoryModule(
          { name: providerName, apiKey: "test-key", clientFactory: fakeClientFactory }
        );
        await provider.send({ session_id: "test", message: "hello" });
        assert.ok(capturedSdkCall, "SDK call should be captured");
        assert.strictEqual(capturedSdkCall.model, defaultModel);
      });
    } else {
      await t.test("empty model returns error without calling SDK", async () => {
        capturedSdkCall = null;
        const provider = factoryModule(
          { name: providerName, apiKey: "test-key", baseURL: "https://test.example.com/v1", model: "", clientFactory: fakeClientFactory }
        );
        const result = await provider.send({ session_id: "test", message: "hello" });
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.error.type, "generic");
        assert.strictEqual(result.error.message, "model is not set");
        assert.strictEqual(result.error.statusCode, 500);
        assert.strictEqual(capturedSdkCall, null, "SDK should not be called");
      });
    }

    await t.test("request shape matches S1", async () => {
      capturedSdkCall = null;
      const provider = factoryModule(
        kind === "openai_compat"
          ? { name: providerName, apiKey: "test-key", baseURL: "https://test.example.com/v1", model: defaultModel, clientFactory: fakeClientFactory }
          : { name: providerName, apiKey: "test-key", model: defaultModel, clientFactory: fakeClientFactory }
      );
      await provider.send({ session_id: "test", message: "hello world" });
      assert.ok(capturedSdkCall, "SDK call should be captured");
      if (kind === "openai" || kind === "openai_compat") {
        assert.deepStrictEqual(capturedSdkCall.messages, [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "hello world" },
        ]);
      } else if (kind === "gemini") {
        assert.strictEqual(capturedSdkCall.contents, "hello world");
      } else if (kind === "claude") {
        assert.deepStrictEqual(capturedSdkCall.messages, [{ role: "user", content: "hello world" }]);
        assert.strictEqual(capturedSdkCall.max_tokens, 1000);
      } else if (kind === "nvidia") {
        assert.deepStrictEqual(capturedSdkCall.messages, [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "hello world" },
        ]);
      }
    });

    await t.test("success response normalized", async () => {
      const provider = factoryModule(
        kind === "openai_compat"
          ? { name: providerName, apiKey: "test-key", baseURL: "https://test.example.com/v1", model: defaultModel, clientFactory: fakeClientFactory }
          : { name: providerName, apiKey: "test-key", model: defaultModel, clientFactory: fakeClientFactory }
      );
      const result = await provider.send({ session_id: "sess-123", message: "hello" });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.session_id, "sess-123");
      assert.strictEqual(result.data.reply, "fake reply");
      assert.strictEqual(result.data.model_used, "fake-model");
      assert.ok(result.data.raw_provider_response);
    });

    await t.test("401 error classified as auth_error", async () => {
      const fakeClientFactory401 = () => ({
        chat: { completions: { create: async () => { throw { status: 401, message: "Invalid key" }; } } },
        models: { generateContent: async () => { throw { status: 401, message: "Invalid key" }; } },
        messages: { create: async () => { throw { status: 401, message: "Invalid key" }; } },
      });
      const provider = factoryModule(
        kind === "openai_compat"
          ? { name: providerName, apiKey: "test-key", baseURL: "https://test.example.com/v1", model: defaultModel, clientFactory: fakeClientFactory401 }
          : { name: providerName, apiKey: "test-key", model: defaultModel, clientFactory: fakeClientFactory401 }
      );
      const result = await provider.send({ session_id: "test", message: "hello" });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.type, "auth_error");
      assert.strictEqual(result.error.statusCode, 401);
    });

    await t.test("429 error classified as rate_limit_error", async () => {
      const fakeClientFactory429 = () => ({
        chat: { completions: { create: async () => { throw { status: 429, message: "Rate limited" }; } } },
        models: { generateContent: async () => { throw { status: 429, message: "Rate limited" }; } },
        messages: { create: async () => { throw { status: 429, message: "Rate limited" }; } },
      });
      const provider = factoryModule(
        kind === "openai_compat"
          ? { name: providerName, apiKey: "test-key", baseURL: "https://test.example.com/v1", model: defaultModel, clientFactory: fakeClientFactory429 }
          : { name: providerName, apiKey: "test-key", model: defaultModel, clientFactory: fakeClientFactory429 }
      );
      const result = await provider.send({ session_id: "test", message: "hello" });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.type, "rate_limit_error");
      assert.strictEqual(result.error.statusCode, 429);
    });

    await t.test("network error without status classified per adapter", async () => {
      const fakeClientFactoryNet = () => ({
        chat: { completions: { create: async () => { throw new Error("network failure"); } } },
        models: { generateContent: async () => { throw new Error("network failure"); } },
        messages: { create: async () => { throw new Error("network failure"); } },
      });
      const provider = factoryModule(
        kind === "openai_compat"
          ? { name: providerName, apiKey: "test-key", baseURL: "https://test.example.com/v1", model: defaultModel, clientFactory: fakeClientFactoryNet }
          : { name: providerName, apiKey: "test-key", model: defaultModel, clientFactory: fakeClientFactoryNet }
      );
      const result = await provider.send({ session_id: "test", message: "hello" });
      assert.strictEqual(result.success, false);
      const expectedType = kind === "gemini" ? "provider_error" : "generic";
      assert.strictEqual(result.error.type, expectedType);
    });

    await t.test("send ignores process.env", async () => {
      const envVars = ["OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "NVIDIA_API_KEY", "OPENAI_COMPAT_API_KEY", "OPENAI_COMPAT_BASE_URL", "OPENAI_COMPAT_MODEL"];
      const oldEnv = {};
      for (const v of envVars) {
        oldEnv[v] = process.env[v];
      }
      if (kind === "openai") process.env.OPENAI_API_KEY = "wrong-key-from-env";
      else if (kind === "gemini") process.env.GEMINI_API_KEY = "wrong-key-from-env";
      else if (kind === "claude") process.env.ANTHROPIC_API_KEY = "wrong-key-from-env";
      else if (kind === "nvidia") process.env.NVIDIA_API_KEY = "wrong-key-from-env";
      else if (kind === "openai_compat") {
        process.env.OPENAI_COMPAT_API_KEY = "wrong-key-from-env";
        process.env.OPENAI_COMPAT_BASE_URL = "https://wrong.example.com/v1";
        process.env.OPENAI_COMPAT_MODEL = "wrong-model";
      }
      try {
        capturedClientOptions = null;
        const provider = factoryModule(
          kind === "openai_compat"
            ? { name: providerName, apiKey: "correct-key", baseURL: "https://correct.example.com/v1", model: defaultModel, clientFactory: fakeClientFactory }
            : { name: providerName, apiKey: "correct-key", model: defaultModel, clientFactory: fakeClientFactory }
        );
        await provider.send({ session_id: "test", message: "hello" });
        assert.strictEqual(capturedClientOptions.apiKey, "correct-key");
        if (kind === "openai_compat") {
          assert.strictEqual(capturedClientOptions.baseURL, "https://correct.example.com/v1");
        }
      } finally {
        for (const v of envVars) {
          if (oldEnv[v] === undefined) {
            delete process.env[v];
          } else {
            process.env[v] = oldEnv[v];
          }
        }
      }
    });
  });
}

const { createOpenAIProvider } = require("../providers/openai");
const { createGeminiProvider } = require("../providers/gemini");
const { createClaudeProvider } = require("../providers/claude");
const { createOpenAICompatProvider } = require("../providers/openaiCompat");
const { createNvidiaProvider, NIM_DEFAULT_MODEL } = require("../providers/nvidia");

runProviderFactoryTests(createOpenAIProvider, "openai", "openai", "gpt-3.5-turbo");
runProviderFactoryTests(createGeminiProvider, "gemini", "gemini", "gemini-3.6-flash");
runProviderFactoryTests(createClaudeProvider, "claude", "claude", "claude-3-5-sonnet-20240620");
runProviderFactoryTests(createOpenAICompatProvider, "openai_compat", "openai_compat", "gpt-3.5-turbo");
runProviderFactoryTests(createNvidiaProvider, "nvidia", "nvidia", NIM_DEFAULT_MODEL);

test("compat factory without apiKey uses 'not-required' while env has key", async () => {
  const oldApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-env-secret";
  let capturedClientOptions = null;
  const fakeClientFactory = (options) => {
    capturedClientOptions = options;
    return {
      chat: { completions: { create: async () => ({ choices: [{ message: { content: "fake" } }], model: "fake" }) } },
    };
  };
  try {
    const provider = createOpenAICompatProvider({ name: "test", apiKey: undefined, baseURL: "https://test.example.com/v1", model: "test-model", clientFactory: fakeClientFactory });
    await provider.send({ session_id: "test", message: "hello" });
    assert.strictEqual(capturedClientOptions.apiKey, "not-required");
  } finally {
    if (oldApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldApiKey;
  }
});

test("openai factory without apiKey throws TypeError", () => {
  assert.throws(
    () => createOpenAIProvider({ name: "test", apiKey: undefined, clientFactory: () => ({ chat: { completions: { create: async () => {} } } }) }),
    TypeError,
    "apiKey is required"
  );
});

test("gemini factory without apiKey throws TypeError", () => {
  assert.throws(
    () => createGeminiProvider({ name: "test", apiKey: undefined, clientFactory: () => ({ models: { generateContent: async () => {} } }) }),
    TypeError,
    "apiKey is required"
  );
});

test("claude factory without apiKey throws TypeError", () => {
  assert.throws(
    () => createClaudeProvider({ name: "test", apiKey: undefined, clientFactory: () => ({ messages: { create: async () => {} } }) }),
    TypeError,
    "apiKey is required"
  );
});

test("nvidia factory without apiKey throws TypeError", () => {
  assert.throws(
    () => createNvidiaProvider({ name: "test", apiKey: undefined, clientFactory: () => ({ chat: { completions: { create: async () => {} } } }) }),
    TypeError,
    "apiKey is required"
  );
});

test("compat factory without baseURL throws TypeError", () => {
  assert.throws(
    () => createOpenAICompatProvider({ name: "test", apiKey: "test-key", baseURL: undefined, model: "test-model", clientFactory: () => ({ chat: { completions: { create: async () => {} } } }) }),
    TypeError,
    "baseURL is required"
  );
});

test("buildProviders: only OPENAI_API_KEY and OPENAI_MODEL=x -> one provider named openai with model x", async () => {
  const { buildProviders } = require("../providers/index");
  const providers = buildProviders({
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "custom-gpt-4",
    GEMINI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    NVIDIA_API_KEY: "",
    OPENAI_COMPAT_BASE_URL: "",
  });
  assert.strictEqual(providers.length, 1);
  assert.strictEqual(providers[0].name, "openai");
  assert.strictEqual(providers[0].kind, "openai");
  assert.strictEqual(providers[0].model, "custom-gpt-4");
});

test("buildProviders: no keys -> []", async () => {
  const { buildProviders } = require("../providers/index");
  const providers = buildProviders({
    OPENAI_API_KEY: "",
    GEMINI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    NVIDIA_API_KEY: "",
    OPENAI_COMPAT_BASE_URL: "",
  });
  assert.deepStrictEqual(providers, []);
});

test("buildProviders: all keys set -> providers in committed order", async () => {
  const { buildProviders } = require("../providers/index");
  const providers = buildProviders({
    OPENAI_API_KEY: "key1",
    GEMINI_API_KEY: "key2",
    ANTHROPIC_API_KEY: "key3",
    NVIDIA_API_KEY: "key4",
    OPENAI_COMPAT_BASE_URL: "https://compat.example.com/v1",
    OPENAI_COMPAT_API_KEY: "key5",
  });
  assert.strictEqual(providers.length, 5);
  assert.deepStrictEqual(providers.map((p) => p.name), ["openai", "gemini", "claude", "nvidia", "openai_compat"]);
  assert.deepStrictEqual(providers.map((p) => p.kind), ["openai", "gemini", "claude", "nvidia", "openai_compat"]);
});
