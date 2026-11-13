# Frontend Integration Notes

These notes cover what a frontend needs to talk to the Vehicle Sales Assistant
API. For how the backend works internally, see
[architecture.md](architecture.md). For setup, see the [README](../README.md).

## 1. Run the API locally

```bash
cp .env.example .env            # fill in OPENROUTER_API_KEY, POSTGRES_PASSWORD, DATABASE_URL
docker compose up -d            # PostgreSQL with seeded vehicles
uvicorn app.api.main:app --reload
```

- Base URL: `http://localhost:8000/api`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json` (you can generate
  TypeScript types from it, e.g. with `openapi-typescript`)

## 2. CORS

Allowed origins come from `CORS_ORIGINS` in `.env`. The default is:

```text
http://localhost:3000,http://localhost:5173
```

If your dev server runs on another port or host, add it to `CORS_ORIGINS`
(comma-separated) and restart the API.

## 3. Endpoints

There are chat and health endpoints. There are **no** vehicle search, vehicle
details or EMI endpoints: the AI agent calls those internally. Everything the
user asks goes through chat, and the answer comes back as text, not as
structured car data.

### `GET /api/health`

```json
{ "status": "ok" }
```

Not rate limited. Lightweight API liveness only; does not check dependencies.

### `GET /api/health/services`

Called only by the manual service status button. Limited to 6 requests per minute per IP.
Returns separate `api`, `database`, and `ai` objects, each with `status` and a safe `detail` message.
Database runs `SELECT 1` with connection and statement timeouts. AI verifies the OpenRouter key via `/api/v1/key`; it does not generate text or prove model availability.
Dependency failures return HTTP 200 with `unavailable` for the affected service. The UI shows the last-check time; failed status requests leave dependency status unknown.


### `POST /api/chat`

Request:

```json
{
  "message": "Find Honda sedans under 10 lakh",
  "session_id": "optional, omit on the first message"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `message` | string | Required, 1 to 2000 characters |
| `session_id` | string or null | Optional. Omit to start a new conversation |

Response (`200`):

```json
{
  "reply": "Here are some Honda sedans under ₹10 lakh: ...",
  "session_id": "3f2c9a1e-6b0d-4c55-9a43-2b7f8e1d0c11"
}
```

### `POST /api/chat/stream` (used by the web UI)

Accepts the same request as `/api/chat`, but returns `text/event-stream`.
Both chat routes share the same per-IP rate allowance. Read the POST response
with `fetch()` and a streaming `TextDecoder` (native `EventSource` uses GET).

Events contain JSON in their `data` field:

- `started`: `{session_id}`; save this immediately for follow-ups/retries.
- `progress`: `{phase, label, run_id, tool}`. Phases are `processing`,
  `tool_started`, `tool_finished`, `tool_failed`, and `writing`.
  Track tool runs by ID so concurrent calls stay visible until they finish.
- `delta`: `{text, reset?}`; append text immediately to the pending assistant reply.
  When `reset` is true, clear the pending text first (a new model call after tools).
- `completed`: `{reply, session_id}`; replace the pending text with this authoritative
  final reply and save it once in the conversation history.
- `error`: `{status, detail}`; terminal failure after the stream has started.

Validation and IP-rate-limit failures still use normal HTTP errors before streaming.
Heartbeat comments arrive every 15 seconds during idle periods. The web UI uses
a 60-second inactivity timeout, reset by progress or heartbeat data, rather than
a fixed limit on total generation time. No tool arguments/results or reasoning
are sent as progress. `writing` requires observed model text; integrations that
buffer text may remain at `processing` until completion.

The server sets `X-Accel-Buffering: no` and `Cache-Control: no-cache`; deployment
proxies must also allow unbuffered streaming and a sufficiently long read timeout.
Disconnecting cancels the agent task, though work already running in a synchronous
tool's worker thread cannot be forcibly interrupted. Mock mode displays an
explicit simulated-response label instead of inventing tool activity.

### TypeScript types

```ts
export interface ChatRequest {
  message: string;          // 1..2000 chars
  session_id?: string | null;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
}

export interface ApiError {
  // string for 429/500, array of validation errors for 422
  detail: string | Array<{ loc: (string | number)[]; msg: string; type: string }>;
}
```

### Example call (non-streaming clients)

```ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export async function sendMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), session_id: sessionId ?? null }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body: ApiError = await res.json().catch(() => ({ detail: res.statusText }));
      throw { status: res.status, detail: body.detail };
    }

    return (await res.json()) as ChatResponse;
  } finally {
    clearTimeout(timeout);
  }
}
```

## 4. Sessions (conversation memory)

- First message: send **no** `session_id`. The API creates one and returns it.
- Store the returned `session_id` and send it with **every** follow-up
  message. That is how the assistant remembers the conversation.
- Keep one conversation and reuse its `session_id` for every query. There are no
  conversation switching, deletion, or new-chat controls. The current browser's
  selected legacy conversation is migrated without deleting the legacy storage.
- The server only keeps history in memory. It is lost when the API restarts,
  and the server has no endpoint to fetch past messages. **Keep the transcript
  in the frontend** for display (state, or `localStorage` if you want it to
  survive a page reload).

## 5. Processing limit and execution dashboard

The agent allows at most **5 LLM calls per request** (`run_limit=5` in
`app/agents/agent.py`). There is no lifetime conversation call limit.

An individual request exceeding this limit returns `429` with:

```text
The processing limit for this request was reached. Please try a simpler query in this conversation.
```

Keep the session and allow the user to send a simpler query.

The left panel displays an execution run for each query. It records user input,
ordered progress events, expandable tool inputs and outputs, timestamps, elapsed
time, errors/cancellation, and the final LLM response also shown in chat.
Each processing/writing phase also shows its duration from the received event
timestamps. Tool duration is measured on the server with a monotonic clock and
included as `duration_ms` on tool completion/failure; overlapping tools are
matched by run ID. Live timers stop when the phase or request finishes. Saved
traces without server timing fall back to their recorded event timestamps.
`tool_started` progress events include `input`; `tool_finished` events include
`output`. Tool arguments are the actual extracted data used by the agent;
queries requiring no tools do not invent extracted fields. Model reasoning and
provider metadata are not included. Tool failures use a generic error result.
Runs and chat are saved in browser storage. Interrupted runs are marked cancelled
after reload. Older messages have no historical execution data. Mock mode labels
its simulated progress and does not invent tool activity.

## 6. Errors

| Status | `detail` | Cause | What the UI should do |
|--------|----------|-------|-----------------------|
| `422` | Array of validation errors | Empty message or more than 2000 characters | Validate before sending: trim, block empty, show a character counter |
| `429` | `"Too many requests from your IP. Please try again later."` | Per-IP limit hit (default `10/minute;100/day`) | Disable send and show a cooldown |
| `429` | `"The processing limit for this request was reached. Please try a simpler query in this conversation."` | Request processing limit (section 5) | Keep session; try a simpler query |
| `500` | `"Something went wrong while processing your request."` | LLM, tool or database failure | Show the message with a "Retry" button |

Notes:

- Both limits use status `429`. Tell them apart by the `detail` text, e.g.
  `detail.includes("processing limit")` (legacy new-conversation errors are also recognized).
- The IP rate-limit response sets a `Retry-After` header (seconds), but the
  browser **cannot read it yet** because the API does not list it in CORS
  `expose_headers`. Until that is added, use a fixed cooldown (e.g. 60 s).
- `detail` is a string for `429`/`500` and an array for `422`. Handle both.
- Network errors and timeouts (the API is down, or `AbortController` fired)
  have no response body. Show a generic "Can't reach the server" message.

## 7. UX notes

- **Slow responses.** Render text deltas as they arrive, with a typing indicator
  before the first text and during tool round-trips. Disable send while pending
  and use a 60-second inactivity timeout reset by stream data and heartbeats.
- **Markdown in replies.** `reply` is free text written by the LLM and often
  contains Markdown (lists, bold, tables). Render it with a Markdown renderer
  (e.g. `react-markdown`) and do not inject raw HTML.
- **Fallback reply.** In rare cases `reply` is
  `"I was unable to generate a response."`. Show it like a normal message.
- **Currency.** All prices are in INR and the assistant uses the Indian
  numbering system (lakh). Users can type "10 lakh"; the assistant converts it.
- **Empty-state suggestions.** Good starter prompts:
  - "Find Honda sedans under 10 lakh"
  - "Show me SUVs under 20 lakh"
  - "What is the EMI on 12 lakh at 9% for 5 years?"
- The assistant may ask a follow-up question when information is missing
  (e.g. loan tenure). The UI needs no special handling; it is just a reply.

## 8. Developing without the full backend

- **Mock it.** Return `{ reply, session_id }` from a mock `POST /api/chat`
  (MSW, a local JSON server, etc.). Add mocks for the error cases in section 6
  so every UI state can be tested.
- **Turn off rate limiting locally.** Set `RATE_LIMIT_ENABLED=false` in `.env`
  and restart the API. The per-request processing limit (section 5) still applies.

## 9. Known gaps / backend follow-ups

| Item | Impact on frontend |
|------|--------------------|
| `Retry-After` not in CORS `expose_headers` | Cannot show an exact cooldown; use a fixed one |
| No machine-readable error codes | UI has to match on `detail` text |
| Sessions stored in server memory only | Conversations end when the API restarts; no history endpoint |
| No authenticated user identity | The single conversation is per browser; it is not synchronized across devices |

Raise these with the backend team if any of them block the UI.
