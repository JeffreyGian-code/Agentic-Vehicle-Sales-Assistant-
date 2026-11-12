-- Vehicles table used by app/repositories/postgres_vehicle_repository.py.
-- Columns match app/models/vehicle.py (id, model, brand, price, vehicle_type).

CREATE TABLE IF NOT EXISTS vehicles (
    id           SERIAL PRIMARY KEY,
    model        TEXT    NOT NULL,
    brand        TEXT    NOT NULL,
    price        INTEGER NOT NULL CHECK (price > 0),
    vehicle_type TEXT    NOT NULL
);

-- The repository filters with LOWER(column) = LOWER(:value), so index the expressions.
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_lower        ON vehicles (LOWER(brand));
CREATE INDEX IF NOT EXISTS idx_vehicles_model_lower        ON vehicles (LOWER(model));
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type_lower ON vehicles (LOWER(vehicle_type));
CREATE INDEX IF NOT EXISTS idx_vehicles_price              ON vehicles (price);
