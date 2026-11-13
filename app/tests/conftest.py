import pytest

from app.api import chat_usage


@pytest.fixture(autouse=True)
def isolated_chat_usage(tmp_path, monkeypatch):
    monkeypatch.setattr(chat_usage, "DATABASE_PATH", str(tmp_path / "usage.sqlite3"))
