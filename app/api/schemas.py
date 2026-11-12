from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(
        default=None,
        description="Conversation id. Omit to start a new conversation.",
    )


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class EmiRequest(BaseModel):
    principal: float = Field(gt=0)
    annual_rate: float = Field(ge=0, le=100)
    months: int = Field(gt=0, le=600)


class EmiResponse(BaseModel):
    monthly_emi: float
    total_payment: float
    total_interest: float
