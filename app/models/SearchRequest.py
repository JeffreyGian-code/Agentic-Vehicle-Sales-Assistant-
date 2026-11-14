from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    brand: str | None = None
    model: str | None = None
    max_price: int | None = Field(default=None, ge=0)
    vehicle_type: str | None = None
    variant: str | None = None
