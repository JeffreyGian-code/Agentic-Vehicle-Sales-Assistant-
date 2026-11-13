from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api import chat_usage
from app.api.dependencies import get_agent
from app.api.main import app
from app.api.rate_limit import limiter
from app.tests.test_api import FakeAgent
from app.tests.test_chat_stream import StreamAgent, frames


def test_reset_changes_context_but_preserves_budget_across_routes():
    limiter.reset()
    agent = FakeAgent()
    app.dependency_overrides[get_agent] = lambda: agent
    try:
        client = TestClient(app)
        assert client.post('/api/chat', json={'message': 'Remember Honda', 'session_id': 'reset-test'}).status_code == 200
        original_thread = agent.calls[0][1]['configurable']['thread_id']
        stream_agent = StreamAgent()
        app.dependency_overrides[get_agent] = lambda: stream_agent
        response = client.post('/api/chat/stream', json={'message': 'Start fresh', 'session_id': 'reset-test', 'reset_context': True})
        assert frames(response)[-1][0] == 'completed'
        fresh_thread = stream_agent.calls[0][1]['configurable']['thread_id']
        assert fresh_thread != original_thread
        assert client.get('/api/chat/usage/reset-test').json()['calls'] == 2
        app.dependency_overrides[get_agent] = lambda: agent
        client.post('/api/chat', json={'message': 'Continue', 'session_id': 'reset-test'})
        assert agent.calls[-1][1]['configurable']['thread_id'] == fresh_thread
    finally:
        app.dependency_overrides.clear()
        limiter.reset()


def test_budget_blocks_reset_until_24_hours(monkeypatch):
    now = 1000
    monkeypatch.setattr(chat_usage.time, 'time', lambda: now)
    for count in range(1, 8):
        usage = chat_usage.session_usage('user', consume=True, reset_context=True)
        assert usage['calls'] == count
        assert usage['resets_at'] == 87400
    with pytest.raises(HTTPException) as error:
        chat_usage.session_usage('user', consume=True, reset_context=True)
    assert error.value.status_code == 429
    assert chat_usage.session_usage('other', consume=True)['calls'] == 1
    now = 87400
    assert chat_usage.session_usage('user')['calls'] == 0
    assert chat_usage.session_usage('user', consume=True)['calls'] == 1


def test_concurrent_requests_cannot_overspend():
    def call(_):
        try:
            chat_usage.session_usage('concurrent', consume=True)
            return True
        except HTTPException:
            return False
    with ThreadPoolExecutor(max_workers=8) as pool:
        assert sum(pool.map(call, range(12))) == 7
    assert chat_usage.session_usage('concurrent')['calls'] == 7
