import logging
import asyncio
import json
from contextlib import suppress
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_agent
from app.api.rate_limit import CHAT_LIMIT, limiter
from app.api.schemas import ChatProgress, ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

FALLBACK_REPLY = "I was unable to generate a response."


def _message_text(message: Any) -> str:
    content = getattr(message, "content", message)

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts = [
            part if isinstance(part, str) else part.get("text", "")
            for part in content
            if isinstance(part, (str, dict))
        ]
        return "".join(parts)

    return str(content)


@router.post("", response_model=ChatResponse)
@limiter.shared_limit(CHAT_LIMIT, scope="chat")
def chat(
    request: Request,
    body: ChatRequest,
    agent: Annotated[Any, Depends(get_agent)],
) -> ChatResponse:
    session_id = body.session_id or str(uuid.uuid4())

    try:
        result = agent.invoke(
            {"messages": [{"role": "user", "content": body.message}]},
            config={"configurable": {"thread_id": session_id}},
        )
    except Exception as exc:
        if "Model call limits exceeded" in str(exc):
            raise HTTPException(
                status_code=429,
                detail=(
                    "The processing limit for this conversation was "
                    "reached. Please start a new conversation."
                ),
            ) from exc

        logger.exception("Agent call failed for session %s", session_id)
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while processing your request.",
        ) from exc

    messages = result.get("messages", []) if isinstance(result, dict) else []
    reply = _message_text(messages[-1]) if messages else ""

    return ChatResponse(reply=reply or FALLBACK_REPLY, session_id=session_id)


TOOL_LABELS = {
    "search_vehicles": "Searching vehicle inventory…",
    "get_vehicle_details": "Fetching vehicle details…",
    "calculate_emi": "Calculating EMI…",
}
STREAM_HEARTBEAT_SECONDS = 15


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


class ChatStreamResponse(StreamingResponse):
    async def stream_response(self, send):
        try:
            await super().stream_response(send)
        finally:
            # Also close the generator when an ASGI 2.4 send raises on disconnect.
            await self.body_iterator.aclose()


@router.post("/stream")
@limiter.shared_limit(CHAT_LIMIT, scope="chat")
async def stream_chat(
    request: Request,
    body: ChatRequest,
    agent: Annotated[Any, Depends(get_agent)],
) -> StreamingResponse:
    session_id = body.session_id or str(uuid.uuid4())

    async def events():
        # One queue and task per request: no callbacks or status shared across users.
        queue: asyncio.Queue = asyncio.Queue(maxsize=64)

        async def produce():
            try:
                writing = False
                async for event in agent.astream_events(
                    {"messages": [{"role": "user", "content": body.message}]},
                    config={"configurable": {"thread_id": session_id}},
                    version="v2",
                ):
                    kind = event["event"]
                    name = event.get("name", "")
                    run_id = str(event.get("run_id", ""))
                    progress = None
                    if kind == "on_chat_model_start":
                        if writing:
                            # A tool round-trip starts a new answer; replace any preamble.
                            await queue.put(("delta", {"text": "", "reset": True}))
                        writing = False
                        progress = ChatProgress(phase="processing", label="Processing your request…")
                    elif kind == "on_tool_start":
                        progress = ChatProgress(
                            phase="tool_started", label=TOOL_LABELS.get(name, f"Calling {name}…"),
                            run_id=run_id, tool=name,
                        )
                    elif kind in {"on_tool_end", "on_tool_error"}:
                        progress = ChatProgress(
                            phase="tool_finished" if kind == "on_tool_end" else "tool_failed",
                            label="Processing tool results…" if kind == "on_tool_end" else "Tool failed; processing the result…",
                            run_id=run_id, tool=name,
                        )
                    elif kind == "on_chat_model_stream":
                        chunk = event.get("data", {}).get("chunk")
                        content = getattr(chunk, "content", None)
                        # Only text content counts; tool arguments/reasoning are not a reply.
                        text = content if isinstance(content, str) else "".join(
                            part.get("text", "")
                            for part in (content or [])
                            if isinstance(part, dict) and part.get("type") == "text"
                        )
                        if text:
                            if not writing:
                                writing = True
                                await queue.put(("progress", ChatProgress(
                                    phase="writing", label="Writing a response…",
                                ).model_dump()))
                            await queue.put(("delta", {"text": text}))
                    elif kind == "on_chain_end" and not event.get("parent_ids"):
                        result = event.get("data", {}).get("output", {})
                        messages = result.get("messages", []) if isinstance(result, dict) else []
                        reply = _message_text(messages[-1]) if messages else ""
                        await queue.put(("completed", ChatResponse(
                            reply=reply or FALLBACK_REPLY, session_id=session_id,
                        ).model_dump()))
                        return
                    if progress:
                        await queue.put(("progress", progress.model_dump()))
                raise RuntimeError("Agent stream ended without a final result")
            except Exception as exc:
                limited = "Model call limits exceeded" in str(exc)
                if not limited:
                    logger.exception("Agent stream failed for session %s", session_id)
                await queue.put(("error", {
                    "status": 429 if limited else 500,
                    "detail": (
                        "The processing limit for this conversation was reached. Please start a new conversation."
                        if limited else "Something went wrong while processing your request."
                    ),
                }))

        yield _sse("started", {"session_id": session_id})
        task = asyncio.create_task(produce())
        try:
            while True:
                try:
                    event, data = await asyncio.wait_for(queue.get(), timeout=STREAM_HEARTBEAT_SECONDS)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
                    continue
                yield _sse(event, data)
                if event in {"completed", "error"}:
                    break
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    return ChatStreamResponse(events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "X-Accel-Buffering": "no",
    })
