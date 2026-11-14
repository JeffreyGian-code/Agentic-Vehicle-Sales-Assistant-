from abc import ABC, abstractmethod

from app.models.vehicle import Vehicle


class VehicleRepository(ABC):

    @abstractmethod
    def search(
        self,
        brand: str | None = None,
        model: str | None = None,
        variant: str | None = None,
        max_price: int | None = None,
        vehicle_type: str | None = None,
    ) -> list[Vehicle]:
        pass

    @abstractmethod
    def get_by_id(
        self,
        vehicle_id: int,
    ) -> Vehicle | None:
        pass