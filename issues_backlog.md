# ContinumAI — Code Review & Issues Backlog

**Date:** September 29, 2026
**Source:** Full review of README.md, status_report.md, ContinumAI SRS.pdf, and all source files (server.js, routes/chat.js, providers/*, memory/store.js)
**Status:** Findings recorded for future reference — work direction not yet decided.

---

## 1. Verified Facts (checked against current external sources)

- `gemini-3.6-flash` **is** a real, current Gemini model ID (confirmed via ai.google.dev model list, Jul 2026 announcements). The model name in `providers/gemini.js` is fine.
- `@google/genai` SDK call shape `ai.models.generateContent({ model, contents })` matches the code. The SDK migration itself is correct.

---

## 2. Bugs Found (by priority)

### BUG-1 (High — likely root cause of the "Cannot convert undefined or null to object" SDK error)
**File:** `providers/gemini.js`
```js
model = genAI.models ? genAI.models.generateContent : null;
// ...
const result = await model({ model: "gemini-3.6-flash", contents: message });
```
**Problem:** The SDK method is destructured into a free variable and called without its receiver. This detaches `this` from the SDK client internals — a classic cause of "Cannot convert undefined or null to object" inside SDK code.
**Fix:** Call the method on the object directly: `await genAI.models.generateContent({ model: "gemini-3.6-flash", contents: message })`. Keep `genAI` around instead of extracting `model`.

### BUG-2 (Medium — wrong error message on total failure)
**File:** `routes/chat.js`, final "all providers failed" response:
```js
message: `All providers failed. Last error from ${servedProvider}: ${servedProvider}`,
```
**Problem:** Prints the provider name twice instead of the actual error message.
**Fix:** `` `All providers failed. Last error from ${servedProvider}: ${result?.error?.message}` ``

### BUG-3 (Medium — context pollution)
**Files:** `routes/chat.js` + `memory/store.js`
**Problem:** Failed turns append `error.message` as turn **content**. Context restoration then blindly concatenates all turn contents into the next prompt — so strings like "Rate limit exceeded" get fed to the LLM as conversation history.
**Fix options:** (a) only append turn nodes on successful responses; (b) filter failed/blocked turns out of the context string; (c) mark them and summarize as status, not content.

### BUG-4 (Design trap — missing local key kills the whole gateway)
**Behavior:** If `OPENAI_API_KEY` is absent/blank, the SDK call fails as `auth_error` → returns immediately → **Gemini is never tried**.
**Note:** "No failover on auth_error" is correct per SRS for a *real* 401 from the provider. But a *missing/blank local key* is a configuration issue, not a provider auth failure, and arguably should be skipped/fail-over-able.
**Status:** ⚠️ OPEN DECISION — user was asked (skip-and-failover vs. keep strict behavior); answer deferred ("will tell later").

### BUG-5 (SRS FR-3 violation — routing not provider-agnostic)
**File:** `routes/chat.js`
**Problem:** `if (provider === "openai") ... else if (provider === "gemini")` — adding a provider requires editing routing logic. SRS FR-3: "Adding a new provider shall require only a new adapter implementation, with no changes to routing."
**Fix:** Provider map / registry: `const providers = { openai: sendToOpenAI, gemini: sendToGemini }` and loop over `providerOrder`.

### Minor issues
- **M-1:** Malformed JSON body → Express throws → 500 via error middleware instead of 400. Add a body-parse error handler.
- **M-2:** `data/sessions/*.json` (session data) not gitignored — test session files are already in the repo working tree. Add `data/sessions/` to `.gitignore`.
- **M-3:** No automated tests (`npm test` is a stub). Standalone provider-adapter scripts per status_report.md §4e would double as tests.
- **M-4:** `checkpoint` node is created with `status_at_this_point: 'in_progress'` — arguably should be `done` once written.
- **M-5:** README "Tested Scenarios" section claims verifications that status_report.md retracts; README also says failover is GPT→Claude but code does GPT→Gemini.

---

## 3. Docs vs. Code Discrepancies

| Item | Docs say | Code does |
|---|---|---|
| Failover chain | GPT → Claude (README Phase 2) | GPT → Gemini (`providerOrder = ["openai", "gemini"]`) |
| Phase 3 memory | "Not started" (status_report.md, Sep 18) | Implemented & wired in; checkpoints verified working in `testcheckpoint4.json` (Sep 24) |
| Verification status | Error paths only; no success path ever confirmed | Still true as of this review — no code change has been made to prove the success path |

**Action needed when resuming:** update status_report.md + README to match reality before starting new work.

---

## 4. Verification Plan (from status_report.md §5, still valid)

1. **Standalone Gemini test first** — 5-line script calling `sendToGemini()` directly with a real key; paste raw/verbatim output. (This alone should confirm/refute BUG-1.)
2. **Full HTTP failover test** (GPT → Gemini) using the two-terminal-pane method; paste raw output.
3. **Claude** only after that, with a real (paid) key, same standalone-first approach.
4. **Phase 3/remaining SRS items** only after Phase 2 success path is genuinely proven.

---

## 5. Remaining SRS Gaps (for later phases)

- **FR-12:** Decision nodes — not implemented (only turn/checkpoint exist).
- **FR-14:** Branching/fork support — not implemented (chain is strictly linear; new nodes always attach to head).
- **FR-17:** Proper context-restoration *prompt* (task status + decisions + next step) — current implementation just concatenates raw turn contents.
- **FR-5 per-provider classifiers:** Currently one generic `classifyError`; SRS calls for per-provider error classifiers.
- **SRS §7 open items:** storage tech (Redis vs PostgreSQL vs current file-based), checkpoint trigger policy, retention policy, decision-extraction criteria.

---

## 6. Pending User Decisions

| # | Decision | Status |
|---|---|---|
| D-1 | Auth policy: should a missing/blank primary provider key be skipped (fail over) vs. strict no-failover-on-auth_error? | ⏳ Deferred by user ("will tell later") |
| D-2 | Overall next step: fix+verify / docs first / Phase 3 work | ⏳ Deferred by user |

---

*Created by Buffy (Freebuff) on 2026-09-29. Treat as the working issue list until resolved.*
