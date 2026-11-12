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

There are only two endpoints. There are **no** vehicle search, vehicle
details or EMI endpoints: the AI agent calls those internally. Everything the
user asks goes through chat, and the answer comes back as text, not as
structured car data.

### `GET /api/health`

```json
{ "status": "ok" }
```

Not rate limited. Use it to show "service online/offline".

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

### Example call

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
- "New chat" button: drop the stored `session_id`.
- The server only keeps history in memory. It is lost when the API restarts,
  and the server has no endpoint to fetch past messages. **Keep the transcript
  in the frontend** for display (state, or `localStorage` if you want it to
  survive a page reload).

## 5. Conversation length limit (important)

The agent allows at most **5 LLM calls per conversation** (`thread_limit=5` in
`app/agents/agent.py`). A plain answer costs 1 call; an answer that searches
vehicles or calculates EMI costs 2 or more. In practice a conversation lasts
about **2 to 3 user messages**.

After that, every message in the same session returns `429` with:

```text
The processing limit for this conversation was reached. Please start a new conversation.
```

The UI should show this message and offer (or automatically start) a new
conversation by clearing `session_id`. Resending with the same `session_id`
will keep failing.

## 6. Errors

| Status | `detail` | Cause | What the UI should do |
|--------|----------|-------|-----------------------|
| `422` | Array of validation errors | Empty message or more than 2000 characters | Validate before sending: trim, block empty, show a character counter |
| `429` | `"Too many requests from your IP. Please try again later."` | Per-IP limit hit (default `10/minute;100/day`) | Disable send and show a cooldown |
| `429` | `"The processing limit for this conversation was reached. Please start a new conversation."` | Conversation limit (section 5) | Start a new conversation |
| `500` | `"Something went wrong while processing your request."` | LLM, tool or database failure | Show the message with a "Retry" button |

Notes:

- Both limits use status `429`. Tell them apart by the `detail` text, e.g.
  `detail.includes("new conversation")`.
- The IP rate-limit response sets a `Retry-After` header (seconds), but the
  browser **cannot read it yet** because the API does not list it in CORS
  `expose_headers`. Until that is added, use a fixed cooldown (e.g. 60 s).
- `detail` is a string for `429`/`500` and an array for `422`. Handle both.
- Network errors and timeouts (the API is down, or `AbortController` fired)
  have no response body. Show a generic "Can't reach the server" message.

## 7. UX notes

- **Slow responses.** Replies are not streamed and can take several seconds
  (free OpenRouter model plus tool round-trips to the database). Show a typing
  indicator, disable the send button while a request is pending, and use a
  generous timeout (about 60 s).
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
  and restart the API. The conversation limit (section 5) still applies.

## 9. Known gaps / backend follow-ups

| Item | Impact on frontend |
|------|--------------------|
| `Retry-After` not in CORS `expose_headers` | Cannot show an exact cooldown; use a fixed one |
| No streaming endpoint | Cannot show the reply word by word |
| No machine-readable error codes | UI has to match on `detail` text |
| Sessions stored in server memory only | Conversations end when the API restarts; no history endpoint |
| Short conversation limit (5 LLM calls) | Users will need to start new chats often |

Raise these with the backend team if any of them block the UI.
