from pydantic import BaseModel

class Vehicle(BaseModel):
    id: int
    model: str
    brand: str
    price: int
    vehicle_type: str
    variant: str | None = None
