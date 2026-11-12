import pytest
from fastapi.testclient import TestClient
from limits import parse_many

from app.api.dependencies import get_agent
from app.api.main import app
from app.api.rate_limit import CHAT_LIMIT, limiter


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
def client():
    return TestClient(app)


def use_agent(agent):
    app.dependency_overrides[get_agent] = lambda: agent
    return agent


@pytest.fixture(autouse=True)
def clear_overrides():
    limiter.reset()
    yield
    app.dependency_overrides.clear()
    limiter.reset()


def per_window(limit_string):
    return min(item.amount for item in parse_many(limit_string))


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


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


def test_chat_rate_limited_per_ip(client):
    use_agent(FakeAgent())
    allowed = per_window(CHAT_LIMIT)

    for _ in range(allowed):
        assert client.post("/api/chat", json={"message": "Hi"}).status_code == 200

    response = client.post("/api/chat", json={"message": "Hi"})

    assert response.status_code == 429
    assert "Too many requests" in response.json()["detail"]
    assert int(response.headers["Retry-After"]) > 0


def test_chat_limits_are_per_ip(client):
    use_agent(FakeAgent())
    allowed = per_window(CHAT_LIMIT)
    other_ip = TestClient(app, client=("10.0.0.2", 5000))

    for _ in range(allowed + 1):
        client.post("/api/chat", json={"message": "Hi"})

    assert client.post("/api/chat", json={"message": "Hi"}).status_code == 429
    assert other_ip.post("/api/chat", json={"message": "Hi"}).status_code == 200


def test_health_is_never_rate_limited(client):
    for _ in range(per_window(CHAT_LIMIT) + 5):
        assert client.get("/api/health").status_code == 200


@pytest.mark.parametrize(
    "method, path",
    [
        ("get", "/api/vehicles"),
        ("get", "/api/vehicles/1"),
        ("post", "/api/finance/emi"),
    ],
)
def test_only_chat_and_health_are_exposed(client, method, path):
    # Vehicle search/details and EMI are agent tools, not public endpoints.
    assert getattr(client, method)(path).status_code == 404
