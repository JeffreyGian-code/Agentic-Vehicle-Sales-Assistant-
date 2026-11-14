"""Exercise ranking SQL with a small isolated catalogue and deliberate ties."""

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, text

from app.models.SearchRequest import SearchRequest
from app.repositories import postgres_vehicle_repository
from app.services.vehicle_service import VehicleService
from app.tools.agent_tools import AgentTools


@pytest.fixture
def catalogue(monkeypatch):
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE vehicles (
                id INTEGER PRIMARY KEY, brand TEXT, model TEXT, variant TEXT,
                price INTEGER, vehicle_type TEXT
            )
        """))
        connection.execute(text("""
            INSERT INTO vehicles VALUES
                (1, 'Alpha', 'One', 'Base', 100, 'SUV'),
                (2, 'alpha', 'one', 'Plus', 200, 'SUV'),
                (3, 'Alpha', 'One', 'Premium', 300, 'SUV'),
                (4, 'Alpha', 'One', 'Top', 400, 'SUV'),
                (5, 'Beta', 'Two', 'Base', 100, 'SUV'),
                (6, 'Beta', 'Two', 'Plus', 350, 'SUV'),
                (7, 'Gamma', 'Three', 'Base', 250, 'Sedan'),
                (8, 'Delta', 'Four', 'Base', 500, 'SUV'),
                (9, 'Other', 'One', 'Base', 150, 'SUV'),
                (10, 'ALPHA', 'ONE', 'Tie', 100, 'SUV')
        """))
    monkeypatch.setattr(postgres_vehicle_repository, "engine", engine)
    yield postgres_vehicle_repository.PostgresVehicleRepository()
    engine.dispose()


@pytest.mark.parametrize(("filters", "expected"), [
    ({}, [1, 5, 9]),
    ({"sort_order": "price_desc"}, [8, 4, 6]),
    ({"brand": "ALPHA"}, [1]),
    ({"brand": "Alpha", "model": "ONE"}, [1, 10, 2]),
    ({"brand": "Alpha", "model": "One", "sort_order": "price_desc"}, [4, 3, 2]),
    ({"min_price": 200, "max_price": 350}, [2, 7, 6]),
    ({"vehicle_type": "suv", "min_price": 200, "max_price": 350}, [2, 6]),
    ({"variant": "PLUS", "max_price": 350}, [2, 6]),
    ({"min_price": 100, "max_price": 100}, [1, 5]),
    ({"max_price": 99}, []),
    ({"brand": "missing"}, []),
    ({"min_price": 500}, [8]),
])
def test_ranked_shortlist(catalogue, filters, expected):
    assert [v.id for v in catalogue.search(**filters)] == expected


def test_invalid_sort_order(catalogue):
    with pytest.raises(ValueError, match="sort_order"):
        catalogue.search(sort_order="invalid")


@pytest.mark.parametrize("values", [
    {"min_price": -1},
    {"max_price": -1},
    {"min_price": 200, "max_price": 100},
    {"sort_order": "invalid"},
])
def test_invalid_request(values):
    with pytest.raises(ValidationError):
        SearchRequest(**values)


def test_structured_tool_passes_range_and_order(catalogue):
    tools = AgentTools()
    tools.vehicle_service = VehicleService(catalogue)
    search = next(tool for tool in tools.get_tools() if tool.name == "search_vehicles")
    results = search.invoke({"request": {
        "brand": "Alpha", "model": "One", "min_price": 200,
        "max_price": 300, "sort_order": "price_desc",
    }})
    assert [v.id for v in results] == [3, 2]
    assert SearchRequest().sort_order == "price_asc"
