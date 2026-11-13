from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi.testclient import TestClient

from app.api.main import app
from app.api.rate_limit import limiter
from app.api.routes.health import check_ai, check_database


def test_manual_check_reports_dependencies_independently():
    limiter.reset()
    with patch("app.api.routes.health.check_database", return_value={"status": "unavailable", "detail": "Database query failed."}), patch(
        "app.api.routes.health.check_ai", new=AsyncMock(return_value={"status": "ok", "detail": "Key accepted."})
    ):
        client = TestClient(app)
        response = client.get("/api/health/services")
        assert response.status_code == 200
        assert response.json()["api"]["status"] == "ok"
        assert response.json()["database"]["status"] == "unavailable"
        assert response.json()["ai"]["status"] == "ok"
        for _ in range(5):
            assert client.get("/api/health/services").status_code == 200
        assert client.get("/api/health/services").status_code == 429
        assert client.get("/api/health").json() == {"status": "ok"}
    limiter.reset()


def test_database_missing_configuration(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert check_database()["status"] == "unavailable"


def test_database_failure_does_not_expose_secrets(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://secret")
    engine = MagicMock()
    engine.connect.side_effect = RuntimeError("secret password")
    with patch("app.api.routes.health.create_engine", return_value=engine):
        result = check_database()
    assert result["status"] == "unavailable"
    assert "secret" not in result["detail"]
    engine.dispose.assert_called_once()


def test_ai_provider_checks(monkeypatch):
    import asyncio

    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    for status, expected in [(200, "ok"), (401, "unavailable"), (503, "unavailable")]:
        client = AsyncMock()
        client.get.return_value = httpx.Response(status, json={"data": {}})
        client.__aenter__.return_value = client
        with patch("app.api.routes.health.httpx.AsyncClient", return_value=client):
            result = asyncio.run(check_ai())
        assert result["status"] == expected
        assert "test-key" not in result["detail"]
    monkeypatch.delenv("OPENROUTER_API_KEY")
    assert asyncio.run(check_ai())["status"] == "unavailable"
