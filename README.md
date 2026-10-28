<div align="center">

# ContinumAI

**A multi-LLM gateway with a shared memory chain — one API, many providers, complete failover, zero context loss.**

[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?logo=nodedotjs&logoColor=white)](package.json)
[![Express](https://img.shields.io/badge/express-5-000000?logo=express&logoColor=white)](package.json)
[![React + Vite](https://img.shields.io/badge/frontend-react%20%2B%20vite-61DAFB?logo=react&logoColor=black)](graph-frontend)
[![Tests](https://img.shields.io/badge/tests-%E2%9C%93%20npm%20test-4c1)](package.json)
[![License](https://img.shields.io/badge/license-ISC-blue)](#license)

</div>

---

## What It Does

Send a message to `POST /chat` and ContinumAI:

1. **Routes it across a provider chain** — OpenAI → Gemini → Claude → NVIDIA NIM → any OpenAI-compatible endpoint — with automatic failover on rate limits and provider errors, and a per-provider call deadline.
2. **Records the exchange in a memory chain** — every turn becomes a node linked by `prev_id`, carrying which provider answered, which providers failed, and the turn status.
3. **Compacts history into checkpoints** — every 5 turns the chain folds into a checkpoint node, so context stays small no matter how long the conversation runs.
4. **Never loses the thread** — the next turn's prompt is rebuilt from the chain, and model handoffs happen transparently mid-conversation.

A React front-end (colony-style graph canvas) visualizes the whole chain — providers, failovers, branches, checkpoints.

<p align="center">
  <img src="docs/screenshots/landing.png" alt="ContinumAI landing page — One memory chain. Many models." width="75%" />
</p>

## Architecture

```
                        ┌────────────────────────────────────────────┐
  POST /chat ──────────►│  routes/chat.js                            │
                        │  build prompt from memory chain            │
                        │  iterate providers:  openai, gemini,       │
                        │  claude, nvidia, openai_compat             │
                        │  per-provider timeout (PROVIDER_TIMEOUT_MS)│
                        └──────────────┬─────────────────────────────┘
                                       │ first success wins
                                       │ failures appended to failed_providers
                        ┌──────────────▼─────────────────────────────┐
                        │  memory layer (memory/)                    │
                        │  file store ─ data/sessions/*.json         │
                        │  pg store ─ Supabase/Postgres (optional)   │
                        │  5 turns → auto-checkpoint                 │
                        └──────────────┬─────────────────────────────┘
                                       │
                        ┌──────────────▼─────────────────────────────┐
                        │  graph-frontend (Vite + React)             │
                        │  colony canvas · inspector · landing page  │
                        │  reads via GET /sessions, Proxied by Vite  │
                        └────────────────────────────────────────────┘
```

### Failover Rules

| Situation | Behavior |
|---|---|
| `rate_limit_error` / `provider_error` / timeout | Move to the next provider, record the failure |
| `auth_error` | Also fails over, with a "key looks invalid" warning logged before moving to the next provider |
| All providers fail | Turn is stored as `status: blocked`, `provider: null`, `failed_providers` lists every attempt in order, structured error returned |

Every stored node records `provider` (who answered) and `failed_providers` (who didn't), which is what the inspector and graph use to visualize handoffs.

## Quickstart

### Backend

```bash
npm install
cp .env.example .env    # fill in at least one provider key + GATEWAY_API_TOKEN
npm start               # http://localhost:3000
```

In PowerShell, set the gateway token for the current session without committing it:

```powershell
$env:GATEWAY_API_TOKEN = Read-Host "Enter GATEWAY_API_TOKEN"
npm start
```

The server refuses to start when `GATEWAY_API_TOKEN` is missing unless `ALLOW_UNAUTHENTICATED=true` is set (development only).

### Frontend

```bash
cd graph-frontend
npm install
npm run dev             # http://localhost:5173 — proxies /chat, /sessions, /providers to :3000
```

The Vite dev proxy injects the gateway token from the **repo root `.env`** (`GATEWAY_API_TOKEN`) and strips the browser `Origin` header, so the backend's fail-closed CORS accepts it. The token stays in the dev process — it is never bundled into browser code. Backend must be running on port 3000; the frontend falls back to bundled mock data when the gateway is unreachable.

### Tests

```bash
npm test    # stub providers only, never calls real APIs
```

Set `TEST_DATABASE_URL` to also run the Postgres memory contract suite against a throwaway schema (auto-dropped).

## API

| Endpoint | Method | Notes |
|---|---|---|
| `/chat` | `POST` | Body: `{ "session_id": "...", "message": "...", "provider": "nvidia" (optional) }` — `provider`, if set, is tried first with the normal failover chain after it |
| `/sessions` | `GET` | Bearer token required — list of `{ id, node_count, latest_activity, models, title }` |
| `/sessions/:id/nodes` | `GET` | Bearer token required — all nodes for a session; `404` for unknown sessions |
| `/providers` | `GET` | Bearer token required — enabled provider names (those with configured API keys), used by the front-end selector |
| `/health` | `GET` | `{ "status": "ok" }` |

Error shape (all endpoints): `{ error: { type, message, statusCode } }` with types `auth_error`, `rate_limit_error`, `provider_error`, `validation`, `memory_unavailable`, `no_providers`.

**CORS is fail-closed:** set `CORS_ORIGIN` to comma-separated explicit `http`/`https` origins when a browser calls the API. Wildcards are rejected; origins outside the list get `403`. Requests without an `Origin` header (server-to-server) are unaffected.

## Memory Model

Nodes form a chain per session (`prev_id` links), stored either as JSON files or in Postgres:

```json
{
  "node_id": "...",
  "prev_id": "...",
  "type": "turn | decision | checkpoint",
  "content": "user message",
  "reply": "model reply | null",
  "model_used": "gpt",
  "provider": "openai | null",
  "failed_providers": [],
  "status_at_this_point": "done | in_progress | blocked",
  "timestamp": "..."
}
```

- `blocked` turns (all providers failed) are stored but excluded from future prompts and checkpoints.
- Checkpoints hold the text of their 5 covered turns; handoff context = latest checkpoint + trailing turns (≤ 10 `User:` blocks in any prompt).

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | one of the providers | OpenAI (GPT) |
| `GEMINI_API_KEY` | one of the providers | Google Gemini |
| `ANTHROPIC_API_KEY` | one of the providers | Anthropic Claude |
| `NVIDIA_API_KEY` | one of the providers | NVIDIA NIM (Nemotron, OpenAI-compatible endpoint) |
| `NVIDIA_MODEL` | no | NIM model override (default `nvidia/llama-3.1-nemotron-70b-instruct`) |
| `OPENAI_COMPAT_BASE_URL` / `_API_KEY` / `_MODEL` | no | Generic OpenAI-compatible provider slot |
| `GATEWAY_API_TOKEN` | yes (prod) | Bearer token for authed endpoints |
| `ALLOW_UNAUTHENTICATED` | no | Dev-only bypass for the token |
| `CORS_ORIGIN` | no | Comma-separated allowed browser origins (fail-closed) |
| `PROVIDER_TIMEOUT_MS` | no | Per-provider call deadline, default 30000 |
| `DATABASE_URL` | no | When set, memory uses Postgres/Supabase instead of files |
| `SESSIONS_DIR` | no | Override the file-store directory |

Only one provider key needs to be present — enabled providers join the chain automatically.

## Project Structure

```
continumai/
├── server.js               # Express app factory, auth, CORS, health
├── routes/
│   ├── chat.js             # Provider chain, failover, memory writes
│   └── sessions.js         # GET /sessions, GET /sessions/:id/nodes
├── providers/
│   ├── index.js            # buildProviders() — registry driven by env keys
│   ├── openai.js / gemini.js / claude.js
│   ├── nvidia.js           # NIM wrapper over the shared OpenAI-compat sender
│   ├── openaiCompat.js     # reusable OpenAI-compatible sender
│   ├── errorClassifier.js  # shared error classification
│   └── timeout.js          # provider deadline parsing
├── memory/
│   ├── memory.js           # chain, checkpoints, serialization per session
│   ├── fileStore.js        # default store — data/sessions/*.json
│   ├── pgStore.js / pgPool.js   # Postgres store (used when DATABASE_URL set)
├── db/schema.sql           # Postgres schema (npm run migrate)
├── scripts/migrate.js      # applies db/schema.sql
├── test/                   # node:test — gateway, memory contracts, sessions
└── graph-frontend/         # Vite + React dashboard (http://localhost:5173)
    └── src/
        ├── App.tsx         # BrowserRouter: /overview /providers /graph /playground
        │                   #   /api-access /activity /settings
        ├── auth.ts         # demo-only in-memory auth + useAuth() hook (no backend yet)
        ├── api/client.ts   # real data layer — /sessions, /sessions/:id/nodes, /chat, /providers
        ├── pages/dashboard/ # Overview, Providers, MemoryGraph, Playground, ApiAccess,
        │                   #   ActivityLog, Settings
        ├── context/        # DashboardContext — providers, failover events, toasts, metrics
        └── components/     # GraphView (React Flow), ColonyCanvasView (d3), DetailPanel,
                            #   SessionSidebar, nodes/, layout/, landing/
```

## Frontend

BrowserRouter dashboard (`http://localhost:5173`), 7 screens: **Overview**, **Providers**, **Memory Graph**, **Playground**, **API Access**, **Activity Log**, **Settings**. State lives in `DashboardContext`; global metrics/providers are still mock-driven (`data/dashboardData.ts`).

Live backend wiring:
- **Memory Graph** (`/graph`) — loads the real session list via `GET /sessions`, fetches the full memory chain per session via `GET /sessions/:id/nodes`, and renders the d3-force colony canvas. Node color = answering provider; failover banner appears when `failed_providers` is non-empty. Falls back to bundled mock sessions when the gateway is down.
- **Playground** (`/playground`) — sends real `POST /chat` requests through the gateway with the selected routing preference; shows the actual `model_used` and measured latency, and surfaces gateway errors as toasts + inline messages.
- Gateway token is injected server-side by the Vite proxy (see Quickstart); the browser never holds it.

Landing/login demo pages from the AI Studio prototype still exist in the tree but are currently unrouted.

### Workspace — successful turn

The node inspector shows who answered (`provider` badge), the chain lineage, and the full prompt/reply payload.

<p align="center">
  <img src="docs/screenshots/workspace-turn.png" alt="Workspace with a completed Gemini turn: colony canvas, node inspector showing provider Gemini, status Done, prompt and reply" width="95%" />
</p>

### Workspace — failover and blocked turn

When providers fail, the stored node keeps the trail: the failover banner (`openai > gemini > claude failed (3 tried)`) and `failed_providers` on the node itself.

<p align="center">
  <img src="docs/screenshots/workspace-blocked.png" alt="Workspace with a blocked turn: failover banner listing failed providers, No Provider Answered alert, status Blocked" width="95%" />
</p>

## Deployment (Railway)

1. Deploy from GitHub; Railway auto-detects Node.js.
2. Add the env vars from the table above to the service.
3. Set `DATABASE_URL` so the memory survives redeploys; file-only storage keeps sessions on an ephemeral disk.
4. Verify: `GET /health` → `{"status":"ok"}`; send two `POST /chat` turns with the same `session_id` and confirm the second retains context after a redeploy.

## Decision Ladder

Every change follows this priority, in order:

1. **YAGNI** — does this need to exist at all?
2. **Standard library** — can built-ins do it?
3. **Native runtime/platform**
4. **Existing dependency**
5. **One line**
6. **Minimum new code** — nothing speculative

## Roadmap

- [ ] Smarter failover — latency-based picking, token-limit awareness
- [ ] Real auth for the demo pages (backend pending)
- [ ] Provider health metrics + failover analytics dashboard
- [ ] SSE/streaming replies

## License

ISC
