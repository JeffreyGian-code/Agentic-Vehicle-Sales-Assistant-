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

    assert len(results) == 1

    assert {vehicle.model for vehicle in results} == {"Amaze"}
    assert results[0].variant == "Base"


def test_search_shortlist_and_price_order():
    service = create_service()
    for order in ("price_asc", "price_desc"):
        results = service.search(sort_order=order)
        assert len(results) == 3
        assert len({(v.brand.lower(), v.model.lower()) for v in results}) == 3
        assert [v.price for v in results] == sorted(
            (v.price for v in results), reverse=order == "price_desc"
        )


def test_search_model_variants_and_inclusive_range():
    service = create_service()
    results = service.search(
        brand="honda", model="amaze", min_price=800000, max_price=900000
    )
    assert [v.price for v in results] == [800000, 850000, 900000]
    assert [v.price for v in service.search(
        brand="Honda", model="Amaze", min_price=800000, max_price=900000,
        sort_order="price_desc",
    )] == [900000, 850000, 800000]


def test_get_vehicle_by_id():
    service = create_service()

    vehicle = service.get_by_id(1)

    assert vehicle is not None
    assert vehicle.model == "Amaze"
    assert vehicle.variant == "Base"
    assert vehicle.brand == "Honda"


def test_get_missing_vehicle():
    service = create_service()

    vehicle = service.get_by_id(999)

    assert vehicle is None

def test_separate_variant_search_and_details():
    """Keep trims separate and combine model/variant filters without case sensitivity."""
    from sqlalchemy import text
    from app.database import engine

    with engine.begin() as connection:
        vehicle_id = connection.execute(text("""
            INSERT INTO vehicles (model, brand, price, vehicle_type, variant)
            VALUES ('Variant test model', 'Variant test brand', 900000, 'Sedan', 'VX')
            RETURNING id
        """)).scalar_one()
    try:
        service = create_service()
        results = service.search(
            brand="variant test brand", model="variant test model", variant="vx"
        )
        assert [vehicle.id for vehicle in results] == [vehicle_id]
        assert results[0].model == "Variant test model"
        assert results[0].variant == "VX"
        assert service.get_by_id(vehicle_id).model_dump()["variant"] == "VX"
        assert service.search(model="Variant test model", variant="missing") == []
    finally:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM vehicles WHERE id = :id"), {"id": vehicle_id})


def test_missing_variant_is_optional():
    from app.models.vehicle import Vehicle

    vehicle = Vehicle(id=1, model="City", brand="Honda", price=1000000, vehicle_type="Sedan")
    assert vehicle.variant is None
