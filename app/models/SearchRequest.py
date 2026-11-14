from typing import Literal

from pydantic import BaseModel, Field, model_validator


SortOrder = Literal["price_asc", "price_desc"]


class SearchRequest(BaseModel):
    brand: str | None = None
    model: str | None = None
    max_price: int | None = Field(default=None, ge=0)
    vehicle_type: str | None = None
    variant: str | None = None
    min_price: int | None = Field(default=None, ge=0)
    sort_order: SortOrder = "price_asc"

    @model_validator(mode="after")
    def validate_price_range(self):
        if self.min_price is not None and self.max_price is not None:
            if self.min_price > self.max_price:
                raise ValueError("min_price cannot exceed max_price")
        return self
