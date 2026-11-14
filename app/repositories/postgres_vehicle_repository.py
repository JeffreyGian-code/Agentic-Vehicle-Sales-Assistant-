from sqlalchemy import text

from app.database import engine
from app.models.SearchRequest import SortOrder
from app.models.vehicle import Vehicle
from app.repositories.vehicle_repository import VehicleRepository


class PostgresVehicleRepository(VehicleRepository):
    """PostgreSQL implementation of the vehicle repository."""

    def search(
        self,
        brand: str | None = None,
        model: str | None = None,
        variant: str | None = None,
        max_price: int | None = None,
        vehicle_type: str | None = None,
        min_price: int | None = None,
        sort_order: SortOrder = "price_asc",
    ) -> list[Vehicle]:

        # Only allow fixed SQL directions; customer input is never interpolated.
        directions = {"price_asc": "ASC", "price_desc": "DESC"}
        if sort_order not in directions:
            raise ValueError("Unsupported sort_order")
        direction = directions[sort_order]
        query = """
            SELECT id, model, brand, price, vehicle_type, variant
            FROM vehicles
        """

        conditions: list[str] = []
        parameters: dict[str, str | int] = {}

        if brand:
            conditions.append("LOWER(brand) = LOWER(:brand)")
            parameters["brand"] = brand

        if model:
            conditions.append("LOWER(model) = LOWER(:model)")
            parameters["model"] = model

        if variant:
            conditions.append("LOWER(variant) = LOWER(:variant)")
            parameters["variant"] = variant

        if max_price is not None:
            conditions.append("price <= :max_price")
            parameters["max_price"] = max_price

        if min_price is not None:
            conditions.append("price >= :min_price")
            parameters["min_price"] = min_price

        if vehicle_type:
            conditions.append(
                "LOWER(vehicle_type) = LOWER(:vehicle_type)"
            )
            parameters["vehicle_type"] = vehicle_type

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        if not model:
            # Filter before choosing one representative per brand/model.
            query = f"""
                SELECT id, model, brand, price, vehicle_type, variant
                FROM (
                    SELECT filtered.*, ROW_NUMBER() OVER (
                        PARTITION BY LOWER(brand), LOWER(model)
                        ORDER BY price {direction}, id ASC
                    ) AS model_rank
                    FROM ({query}) AS filtered
                ) AS ranked
                WHERE model_rank = 1
            """

        query += f" ORDER BY price {direction}, id ASC LIMIT 3"

        with engine.connect() as connection:
            result = connection.execute(
                text(query),
                parameters,
            )

            rows = result.mappings().all()

        return [
            Vehicle.model_validate(row)
            for row in rows
        ]

    def get_by_id(
        self,
        vehicle_id: int,
    ) -> Vehicle | None:

        query = """
            SELECT id, model, brand, price, vehicle_type, variant
            FROM vehicles
            WHERE id = :vehicle_id
        """

        with engine.connect() as connection:
            result = connection.execute(
                text(query),
                {"vehicle_id": vehicle_id},
            )

            row = result.mappings().first()

        return (
            Vehicle.model_validate(row)
            if row
            else None
        )
