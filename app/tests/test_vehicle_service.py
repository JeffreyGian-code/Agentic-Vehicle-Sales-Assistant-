from app.repositories.postgres_vehicle_repository import (
    PostgresVehicleRepository,
)
from app.services.vehicle_service import VehicleService


def create_service():
    repository = PostgresVehicleRepository()

    return VehicleService(
        repository=repository
    )


def test_search_by_brand_and_price():
    service = create_service()

    results = service.search(
        brand="Honda",
        max_price=1000000,
    )

    assert len(results) == 5

    names = [vehicle.model for vehicle in results]

    assert "Amaze Base" in names
    assert "Amaze VX" in names


def test_get_vehicle_by_id():
    service = create_service()

    vehicle = service.get_by_id(1)

    assert vehicle is not None
    assert vehicle.model == "Amaze Base"
    assert vehicle.brand == "Honda"


def test_get_missing_vehicle():
    service = create_service()

    vehicle = service.get_by_id(999)

    assert vehicle is None