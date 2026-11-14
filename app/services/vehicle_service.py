from app.models.SearchRequest import SortOrder
from app.models.vehicle import Vehicle
from app.repositories.vehicle_repository import VehicleRepository


class VehicleService:

    def __init__(self, repository: VehicleRepository):
        self.repository = repository

    def search(
        self,
        brand: str | None = None,
        max_price: int | None = None,
        vehicle_type: str | None = None,
        model: str | None = None,
        variant: str | None = None,
        min_price: int | None = None,
        sort_order: SortOrder = "price_asc",
    ) -> list[Vehicle]:

        return self.repository.search(
            brand=brand,
            max_price=max_price,
            vehicle_type=vehicle_type,
            model=model,
            variant=variant,
            min_price=min_price,
            sort_order=sort_order,
        )

    def get_by_id(
        self,
        vehicle_id: int,
    ) -> Vehicle | None:

        return self.repository.get_by_id(vehicle_id)
