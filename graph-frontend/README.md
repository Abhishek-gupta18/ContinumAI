# ContinumAI Frontend

Vite + React dashboard for the ContinumAI gateway (repo root).

```bash
npm install
npm run dev     # http://localhost:5173 — proxies /chat, /sessions, /providers to gateway on :3000
```

- Start the backend first from the repo root: `npm start` (port 3000).
- The dev proxy injects `GATEWAY_API_TOKEN` from the repo root `.env`; the browser never sees it.
- If the gateway is down, pages fall back to bundled mock data.
- Routes: `/overview`, `/providers`, `/graph`, `/playground`, `/api-access`, `/activity`, `/settings`.

Scripts: `npm run build`, `npm run lint` (tsc), `npm test`.
