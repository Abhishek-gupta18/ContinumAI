# ContinumAI

A cloud-based AI gateway that connects multiple LLM providers behind a single unified API.

## Phase 1: Single-Provider GPT Pipeline ✅

**Goal:** Working single-provider GPT backend with normalized request/response format, environment-based API keys, and structured error handling.

### Project Structure

```
continumai/
├── .env                # API keys (OPENAI_API_KEY) — never committed to source control
├── package.json        # Dependencies: express, openai, dotenv, @anthropic-ai/sdk
├── server.js           # Express entry point, POST /chat
├── providers/
│   ├── errorClassifier.js  ← SHARED — error classification: 401→auth_error, 429→rate_limit_error, 5xx→provider_error, else→generic
│   ├── openai.js       ← sendToOpenAI(normalizedRequest) — GPT adapter
│   └── claude.js       ← sendToClaude(normalizedRequest) — Claude adapter (Phase 2)
└── routes/
    └── chat.js         ← handleChatRequest — normalized format only, failover logic (Phase 2)
```

### Normalized Formats

**Request:** `{ session_id: string, message: string }`

**Response:** `{ session_id: string, reply: string, model_used: string, raw_provider_response: object }`

**Error:** `{ type: "auth_error" | "rate_limit_error" | "provider_error" | "generic", message: string, statusCode: number }`

### API Routes

- **POST /chat** — Accepts normalized request body, dispatches to appropriate provider with failover logic, returns normalized response or structured error.

### How It Works

1. Request hits `POST /chat`
2. Route tries **GPT** (`sendToOpenAI`)
3. On `rate_limit_error` or `provider_error` → automatic failover to **Claude** (`sendToClaude`)
4. On `auth_error` → returned immediately, no failover
5. All errors classified via shared `providers/errorClassifier.js`

### Running

```bash
npm install        # installs dependencies
cp .env.example .env # or edit .env directly
node server.js     # starts on port 3000
```

### Tested Scenarios

- ✅ Valid GPT request (rate-limited key returns structured 429 error)
- ✅ Invalid API key → `{type: "auth_error", message: "Invalid API key"}`, HTTP 401
- ✅ GPT failure → failover to Claude (Phase 2)
- ✅ `auth_error` does NOT trigger Claude failover
- ✅ Response shape matches normalized format exactly

---

## Phase 2: Claude Provider + Failover ✅ (Current)

**Goal:** Add Anthropic Claude as a second provider with automatic failover from GPT.

### What Was Built

| File | Purpose |
|---|---|
| `providers/errorClassifier.js` | Shared error classification imported by both providers |
| `providers/openai.js` | Updated to use shared `classifyError` instead of inline logic |
| `providers/claude.js` | New — `sendToClaude()` using `@anthropic-ai/sdk`, errors classified via `errorClassifier` |
| `routes/chat.js` | Updated — GPT → Claude failover on `rate_limit_error`/`provider_error`; no failover on `auth_error` |
| `package.json` | Added `@anthropic-ai/sdk` dependency |
| `.env` | Added `ANTHROPIC_API_KEY` |

### Failover Logic

1. Try **GPT** first
2. On `rate_limit_error` or `provider_error` → automatically retry against **Claude**
3. On `auth_error` → return immediately, **do not** try Claude
4. If Claude also fails → return its structured error
5. Logs show which provider served the request and why failover occurred

### Timeline

| Date | Work Done |
|---|---|
| 2026-09-15 | Project initialized — Node.js + Express + dotenv |
| 2026-09-15 | Phase 1: Created project structure, normalized format, `providers/openai.js`, `routes/chat.js`, `server.js` |
| 2026-09-15 | Phase 1 verified — error handling, API key from env, response shape, module isolation |
| 2026-09-15 | Phase 2: Added `@anthropic-ai/sdk` dependency |
| 2026-09-15 | Phase 2: Created `providers/errorClassifier.js` — shared error classification logic |
| 2026-09-15 | Phase 2: Updated `providers/openai.js` to import shared `classifyError` |
| 2026-09-15 | Phase 2: Created `providers/claude.js` with `sendToClaude()` using Anthropic SDK |
| 2026-09-15 | Phase 2: Updated `routes/chat.js` with failover logic: GPT → Claude on rate_limit/provider_error |
| 2026-09-15 | Phase 2: Added `ANTHROPIC_API_KEY` to `.env` |
| 2026-09-15 | Phase 2: Verified failover works — GPT rate_limit triggers Claude fallback |
| 2026-09-15 | Phase 2: Verified `auth_error` does NOT trigger Claude failover — returned immediately |
| 2026-09-15 | Phase 2: All modules load successfully, contracts consistent, no code duplication |

### Future Phases (Planned)

| Phase | Goal |
|---|---|
| 3 | Memory layer — shared context, checkpoints, handoff between models |
| 4 | Automatic failover optimization — latency-based, token-limit-aware switching |
| 5 | Dashboard — request tracking, provider health metrics, failover analytics |

---

## Decision Ladder (Senior Dev Approach)

Before writing any code, every decision follows this priority:

1. **YAGNI** — Does this need to exist at all?
2. **Standard library** — Can built-in features do it?
3. **Native runtime** — Can the platform/runtime do it?
4. **Existing dependency** — Is there already an installed package that covers it?
5. **One line** — Can it be done in a single line?
6. **Minimum new code** — Write only what's required, nothing extra, nothing speculative

This approach ensures the simplest possible solution that correctly meets the current requirement without over-engineering.

---

## Project Goals

- **Long-term:** Automatic failover between LLM providers when one hits rate limits or token limits, plus a shared memory layer for handing off tasks between models
- **Phase 1 (done):** Single-provider GPT pipeline with normalized format and structured errors
- **Phase 2 (done):** Add Claude provider + automatic failover between GPT and Claude
- **Future:** Memory layer + intelligent failover + dashboard

## Railway Deployment

### Required Environment Variables (set in Railway Dashboard)

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT provider |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for Gemini provider |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude provider (currently parked but slot reserved) |
| `PORT` | No | Railway sets this automatically; server.js reads `process.env.PORT` |

### Persistent Volume

The `railway.json` configures a volume named `sessions` mounted at `/app/data/sessions`. This maps to `memory/store.js` which writes session JSON files to `data/sessions/` (resolves to `/app/data/sessions` in container). Session history survives redeploys/restarts.

### Manual Deployment Steps

1. **Create Railway Project**: Go to Railway dashboard → New Project → Deploy from GitHub repo
2. **Connect Repository**: Select this GitHub repo, Railway auto-detects Node.js from package.json
3. **Add Environment Variables**: In service settings → Variables, add the three API keys above
4. **Attach Persistent Volume**: 
   - In service settings → Volumes → Add Volume
   - Name: `sessions`
   - Mount Path: `/app/data/sessions`
   - (Or let railway.json handle it — volume config is in code)
5. **Deploy**: Trigger deploy; Railway runs `node server.js` per railway.json

### Verification (after deploy)

1. **Health check**: `GET https://<your-app>.up.railway.app/health` → `{ "status": "ok" }`
2. **Context restoration**: 
   - `POST /chat` with `session_id: "test-123"` and a message
   - `POST /chat` with same `session_id` and follow-up → confirm context retained
3. **Volume persistence**: 
   - Trigger redeploy/restart in Railway
   - `POST /chat` with same `session_id` → confirm prior history still present

## License

ISC