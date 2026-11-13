# Vehicle Sales Assistant: Web UI

React 19 + Vite + TypeScript + Tailwind v4 chat UI for the Vehicle Sales Assistant API.
API contract and error behaviour are described in [../docs/frontend.md](../docs/frontend.md).

## Run

The easiest way on Windows is `run.bat` in the repo root, which starts the database, the API and this UI
(`run.bat mock` starts only the UI with the mock API). To run the UI by hand:

```bash
cd frontend
cp .env.example .env.local   # optional; defaults to http://localhost:8000/api
npm install
npm run dev                  # http://localhost:5173 (already in the API's CORS_ORIGINS)
```

Start the backend first (`docker compose up -d` and `uvicorn app.api.main:app --reload` from the repo root).

### Mock mode (no backend needed)

```bash
VITE_USE_MOCK=true npm run dev
```

The mock answers sedan, SUV and EMI questions, applies the same 5-call conversation limit, and
supports trigger words to test error states: `/429` (IP rate limit), `/limit` (conversation limit),
`/500` (server error), `/slow` (8-second reply).

## Features

- Multiple conversations, saved in `localStorage`, with search, rename and delete
- Markdown replies (tables, lists) rendered with `react-markdown`; raw HTML is never injected
- Typing indicator with progress stages and elapsed time; Stop button (or `Esc`) to cancel
- Contextual follow-up chips after replies, starter cards, quick filter chips
- EMI quick calculator with sliders and a live estimate that can send the question to the assistant
- "Replies left" meter, plus a conversation-limit flow that can re-ask the last question in a new chat
- 60 s cooldown with a countdown after a per-IP `429`; Retry on server, network and timeout errors
- Manual service status button (calls `/api/health/services` when clicked), showing API, database and AI provider checks with the last-checked time. No automatic polling. AI checks provider connectivity and credentials, not model generation.
- Light / dark / system theme; responsive with a mobile drawer

Keyboard: `Enter` send · `Shift+Enter` new line · `Ctrl/Cmd+K` new chat · `/` focus input · `Esc` stop.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build |
