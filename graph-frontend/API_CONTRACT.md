# ContinumAI API contract (extracted from backend code, not invented)

## Auth model

- All routes except `GET /health` require `Authorization: Bearer <token>`.
- With Supabase configured, the token is a Supabase access token; `GET /me` then
  returns `{ id: <supabase user uuid>, source: "supabase" }`.
- Malformed/invalid token: `401 { error: { type: "unauthorized", message: "Missing or invalid token" } }`.
- Auth backend failing: `503 { error: { type: "auth_unavailable", message: "Authentication service unavailable" } }`.
- CORS (origin not in allowlist): `403 { error: { type: "cors", message: "Origin is not allowed" } }`.
  Allowed request headers: `Authorization, Content-Type`.
- Unknown/non-JSON error bodies surface as `500 { error: "Internal server error" }`.

## Endpoints

| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| GET | /health | no | — | `200 { status: "ok" }` | UNKNOWN |
| GET | /me | yes | — | `200 { id: string \| null, source: "supabase" \| "legacy" }` | 401 unauthorized, 503 auth_unavailable |
| GET | /providers | yes | — | `200 { providers: string[] }` (provider names) | 401, 503 auth_unavailable, 503 providers_unavailable |
| POST | /chat | yes | `{ session_id, message, provider? }` | `200` provider reply (see shape below) + header `X-Memory-Saved` | 401, 400 validation, 403 cors, 503 auth_unavailable / memory_unavailable / providers_unavailable / no_providers, 504 timeout, other provider statuses |
| GET | /sessions | yes | — | `200 { sessions: SessionSummary[] }` | 401, 503 memory_unavailable |
| GET | /sessions/:id/nodes | yes | — | `200 { session_id, nodes: MemoryNode[] }` | 401, 400 validation, 404 not_found, 503 memory_unavailable |
| GET | /me/providers | yes + account | — | `200 { providers: ProviderKeyRow[] }` | 401, 403 account_required, 501 byok_not_configured, 503 internal_error |
| PUT | /me/providers/:name | yes + account | `{ kind, label?, model?, base_url?, priority?, enabled?, api_key? }` | `201 { provider }` create / `200 { provider }` update | 400 validation / unsafe_base_url / limit_reached, 401, 403 account_required, 404 not_found, 501 byok_not_configured, 503 internal_error |
| DELETE | /me/providers/:name | yes + account | — | `204` empty | 401, 400 validation, 403 account_required, 404 not_found, 501 byok_not_configured, 503 internal_error |
| PUT | /me/provider-order | yes + account | `{ order: string[] }` | `200 { providers: ProviderKeyRow[] }` | 400 validation, 401, 403 account_required, 501 byok_not_configured, 503 internal_error |

## Field rules (found in code)

### POST /chat
- `session_id`: string, `/^[A-Za-z0-9_-]{1,64}$/`, required.
- `message`: string, required.
- `provider`: optional string; if given it must name an available provider,
  otherwise `400 validation` "Unknown provider ...".
- Invalid/missing JSON body: `400 validation` "Invalid JSON body".
- Success body: `{ reply, model_used, raw_provider_response }` exactly as the
  provider returned it (raw_provider_response is opaque; must never be rendered).
- Header `X-Memory-Saved: false` = the reply was served fine but saving the
  memory node failed. Absent = memory saved (or memory unavailable 503 came
  before a reply existed).
- Error types from the provider chain: `timeout` (504), `provider_error` (502),
  `auth_error`, or `generic` (500); status comes from the last provider error
  and the message is "All providers failed. Last error from <name>: ...".
- `504 timeout` with message "request deadline exceeded" when the request
  deadline is spent before the next provider attempt.
- `503 no_providers` when no providers are configured for the account
  ("No providers are configured for this account").

### GET /sessions
- `SessionSummary`: `{ id, node_count: number, latest_activity: string,
  models: string[], title: string }` (`models` = distinct model names used,
  `latest_activity` = ISO timestamp, `title` = first turn content truncated
  to 60 chars, empty string when absent).
- `503 memory_unavailable` "Conversation memory is unavailable".

### GET /sessions/:id/nodes
- `:id` must match `/^[A-Za-z0-9_-]{1,64}$/`, else `400 validation`
  "Invalid session_id".
- `MemoryNode`: `{ node_id, prev_id, session_id, type, content, reply,
  model_used, status_at_this_point, references, provider, failed_providers,
  timestamp }` (`provider` may be `null`, `failed_providers` defaults to `[]`,
  `reply`/`references` may be `null`).
- Session exists but has no nodes: `200 { session_id, nodes: [] }`.
- Unknown session: `404 not_found` "Session not found".

### PUT /me/providers/:name
- `:name` must match `/^[a-z0-9_-]{1,32}$/`, else `400 validation`
  "Invalid provider name".
- Body must be an object (`400 validation` "Body must be an object").
- `kind` required, one of `openai | gemini | claude | nvidia | openai_compat`.
- `kind` cannot be changed on an update (`400 validation`).
- `label`: string, max 64 chars, no control characters.
- `model`: string, max 100 chars, matching `/^[A-Za-z0-9._:\/-]*$/` (empty allowed).
- `priority`: integer 1..100000.
- `enabled`: boolean (default `true` on create).
- `api_key`: required on create (8-512 chars, no whitespace); optional on
  update; never returned by the API.
- `base_url`: only valid for `openai_compat`. Required on create (no stored
  value), optional on update (absent keeps stored value). Validated with the
  server-side SSRF guard; rejected values give `400 unsafe_base_url`
  "base_url is not allowed". Not allowed for other kinds.
- Max 10 provider keys per user: `400 limit_reached`
  "At most 10 provider keys per user".
- Duplicate name on create: `400 validation` "A provider key with this name
  already exists".
- Default priority on create: 10 above the current highest.

### ProviderKeyRow (response of /me/providers, /me/provider-order, PUT)
Fields: `name, kind, label, model, base_url (string|null), key_last4,
priority, enabled, last_tested_at (string|null), last_test_ok (boolean|null),
created_at, updated_at`. The api key itself is never returned.

### PUT /me/provider-order
- Body `{ order: [...] }`; each entry a provider name matching
  `/^[a-z0-9_-]{1,32}$/`, no duplicates, and exactly a permutation of all the
  user's provider names, else `400 validation`.

## Notes for the UI

- `X-Memory-Saved: false` means the reply was fine but memory failed.
- `raw_provider_response` from POST /chat is opaque backend data and must
  never be rendered by the UI.
- Provider API keys are only sent in the `api_key` field of
  `PUT /me/providers/:name`; the API never echoes them.
