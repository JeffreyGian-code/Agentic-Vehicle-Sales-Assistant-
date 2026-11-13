from pydantic import BaseModel, Field
from typing import Any, Literal


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    reset_context: bool = False
    session_id: str | None = Field(
        default=None,
        description="Conversation id. Omit to start a new conversation.",
    )


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class ChatProgress(BaseModel):
    phase: Literal["processing", "tool_started", "tool_finished", "tool_failed", "writing"]
    label: str
    run_id: str | None = None
    tool: str | None = None
    input: Any = None
    output: Any = None
    duration_ms: float | None = None

