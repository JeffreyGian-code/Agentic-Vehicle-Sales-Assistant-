import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_agent, get_vehicle_service
from app.api.main import app
from app.models.vehicle import Vehicle


VEHICLES = [
    Vehicle(id=1, model="Amaze Base", brand="Honda", price=700000, vehicle_type="Sedan"),
    Vehicle(id=2, model="City VX", brand="Honda", price=1300000, vehicle_type="Sedan"),
]


class FakeVehicleService:
    def __init__(self):
        self.last_filters = None

    def search(self, brand=None, model=None, max_price=None, vehicle_type=None):
        self.last_filters = dict(
            brand=brand, model=model, max_price=max_price, vehicle_type=vehicle_type
        )
        return [v for v in VEHICLES if max_price is None or v.price <= max_price]

    def get_by_id(self, vehicle_id):
        return next((v for v in VEHICLES if v.id == vehicle_id), None)


class FakeMessage:
    def __init__(self, content):
        self.content = content


class FakeAgent:
    def __init__(self, error=None):
        self.error = error
        self.calls = []

    def invoke(self, payload, config):
        self.calls.append((payload, config))
        if self.error:
            raise self.error
        return {"messages": [FakeMessage("Hello from the agent")]}


@pytest.fixture
def vehicle_service():
    service = FakeVehicleService()
    app.dependency_overrides[get_vehicle_service] = lambda: service
    yield service
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def use_agent(agent):
    app.dependency_overrides[get_agent] = lambda: agent
    return agent


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_search_vehicles(client, vehicle_service):
    response = client.get(
        "/api/vehicles",
        params={"brand": "Honda", "max_price": 1000000, "vehicle_type": "Sedan"},
    )

    assert response.status_code == 200
    assert [v["model"] for v in response.json()] == ["Amaze Base"]
    assert vehicle_service.last_filters == {
        "brand": "Honda",
        "model": None,
        "max_price": 1000000,
        "vehicle_type": "Sedan",
    }


def test_search_rejects_negative_price(client, vehicle_service):
    response = client.get("/api/vehicles", params={"max_price": -1})
    assert response.status_code == 422


def test_get_vehicle(client, vehicle_service):
    response = client.get("/api/vehicles/2")
    assert response.status_code == 200
    assert response.json()["model"] == "City VX"


def test_get_missing_vehicle(client, vehicle_service):
    response = client.get("/api/vehicles/999")
    assert response.status_code == 404


def test_calculate_emi(client):
    response = client.post(
        "/api/finance/emi",
        json={"principal": 800000, "annual_rate": 8.5, "months": 60},
    )

    assert response.status_code == 200
    assert response.json()["monthly_emi"] == pytest.approx(16413.23)


def test_calculate_emi_validation(client):
    response = client.post(
        "/api/finance/emi",
        json={"principal": 0, "annual_rate": 8.5, "months": 60},
    )
    assert response.status_code == 422


def test_chat_starts_new_session(client):
    agent = use_agent(FakeAgent())

    response = client.post("/api/chat", json={"message": "Hi"})

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Hello from the agent"
    assert body["session_id"]
    _, config = agent.calls[0]
    assert config["configurable"]["thread_id"] == body["session_id"]


def test_chat_reuses_session(client):
    agent = use_agent(FakeAgent())

    response = client.post(
        "/api/chat", json={"message": "Hi", "session_id": "abc"}
    )

    assert response.json()["session_id"] == "abc"
    assert agent.calls[0][1]["configurable"]["thread_id"] == "abc"


def test_chat_limit_reached(client):
    use_agent(FakeAgent(error=RuntimeError("Model call limits exceeded: 5")))

    response = client.post("/api/chat", json={"message": "Hi"})

    assert response.status_code == 429


def test_chat_unexpected_error(client):
    use_agent(FakeAgent(error=RuntimeError("boom")))

    response = client.post("/api/chat", json={"message": "Hi"})

    assert response.status_code == 500
    assert "boom" not in response.text
