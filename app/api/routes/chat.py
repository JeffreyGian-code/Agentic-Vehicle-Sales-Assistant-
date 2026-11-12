import logging
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_agent
from app.api.schemas import ChatRequest, ChatResponse

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
def chat(
    request: ChatRequest,
    agent: Annotated[Any, Depends(get_agent)],
) -> ChatResponse:
    session_id = request.session_id or str(uuid.uuid4())

    try:
        result = agent.invoke(
            {"messages": [{"role": "user", "content": request.message}]},
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
