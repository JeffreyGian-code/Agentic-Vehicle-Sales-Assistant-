from pydantic import BaseModel, Field
from typing import Literal


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
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

