import json
import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_agent
from app.api.main import app
from app.api.rate_limit import limiter
from app.tests.test_api import CHAT_LIMIT, FakeAgent, per_window


@pytest.fixture(autouse=True)
def cleanup(monkeypatch):
    monkeypatch.setenv("LANGSMITH_TRACING", "false")
    limiter.reset()
    yield
    app.dependency_overrides.clear()
    limiter.reset()


def frames(response):
    assert response.headers["content-type"].startswith("text/event-stream")
    return [
        (lines[0][7:], json.loads(lines[1][6:]))
        for frame in response.text.strip().split("\n\n")
        if (lines := frame.splitlines()) and lines[0].startswith("event:")
    ]


class StreamAgent:
    def __init__(self, error=None):
        self.error = error
        self.calls = []

    async def astream_events(self, payload, config, version):
        self.calls.append((payload, config, version))
        yield {"event": "on_chat_model_start"}
        yield {"event": "on_tool_start", "name": "search_vehicles", "run_id": "tool-1",
               "data": {"input": {"request": {"brand": "Honda", "max_price": 1000000}}}}
        yield {"event": "on_tool_end", "name": "search_vehicles", "run_id": "tool-1",
               "data": {"output": SimpleNamespace(content='{"vehicles": [{"id": 1, "brand": "Honda"}]}', response_metadata={"secret": "hidden"})}}
        if self.error:
            raise self.error
        yield {"event": "on_chain_end", "parent_ids": ["root"], "data": {"output": "nested"}}
        yield {"event": "on_chain_end", "parent_ids": [],
               "data": {"output": {"messages": [SimpleNamespace(content="Here are the cars")]}}}


def test_stream_lifecycle_and_session(monkeypatch):
    from app.api.routes import chat

    clock = iter([10.0, 10.125])
    monkeypatch.setattr(chat, "perf_counter", lambda: next(clock))
    agent = StreamAgent()
    app.dependency_overrides[get_agent] = lambda: agent
    response = TestClient(app).post("/api/chat/stream", json={"message": "cars", "session_id": "session-a"})
    events = frames(response)
    assert [name for name, _ in events] == ["started", "progress", "progress", "progress", "completed"]
    assert events[0][1]["session_id"] == "session-a"
    assert [data["phase"] for name, data in events if name == "progress"] == [
        "processing", "tool_started", "tool_finished",
    ]
    assert events[2][1]["tool"] == "search_vehicles"
    assert events[2][1]["run_id"] == events[3][1]["run_id"]
    assert events[3][1]["duration_ms"] == 125.0
    assert agent.calls[0][1]["configurable"]["thread_id"] == "session-a"
    assert events[2][1]["input"] == {"request": {"brand": "Honda", "max_price": 1000000}}
    assert json.loads(events[3][1]["output"]) == {"vehicles": [{"id": 1, "brand": "Honda"}]}
    assert "response_metadata" not in response.text
    assert "hidden" not in response.text
    assert events[-1][1]["reply"] == "Here are the cars"


def test_heartbeat_and_disconnect_cancel_agent(monkeypatch):
    from starlette.requests import Request
    from app.api.routes import chat

    monkeypatch.setattr(chat, "STREAM_HEARTBEAT_SECONDS", 0.01)

    async def exercise():
        stopped = asyncio.Event()

        class WaitingAgent:
            async def astream_events(self, *args, **kwargs):
                try:
                    yield {"event": "on_chat_model_start"}
                    await asyncio.Event().wait()
                finally:
                    stopped.set()

        response = await chat.stream_chat.__wrapped__(
            Request({"type": "http"}), chat.ChatRequest(message="Hi"), WaitingAgent(),
        )
        iterator = response.body_iterator
        assert "event: started" in await anext(iterator)
        for _ in range(20):
            if "event: progress" in await anext(iterator):
                break
        else:
            pytest.fail("Agent progress did not arrive")
        assert "heartbeat" in await anext(iterator)
        await iterator.aclose()
        assert stopped.is_set()

    asyncio.run(exercise())


def test_writing_requires_text_not_tool_arguments_or_reasoning():
    class TextAgent:
        async def astream_events(self, *args, **kwargs):
            for content in ["", [{"type": "reasoning", "text": "private reasoning"}], [{"type": "text", "text": "Hello"}], " again"]:
                yield {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content=content)}}
            yield {"event": "on_chain_end", "parent_ids": [], "data": {"output": {"messages": [SimpleNamespace(content="Hello again")]}}}

    app.dependency_overrides[get_agent] = lambda: TextAgent()
    response = TestClient(app).post("/api/chat/stream", json={"message": "Hi"})
    events = frames(response)
    assert [data["phase"] for name, data in events if name == "progress"] == ["writing"]
    assert "private reasoning" not in response.text
    assert [data["text"] for name, data in events if name == "delta"] == ["Hello", " again"]


def test_text_arrives_before_generation_finishes():
    from starlette.requests import Request
    from app.api.routes import chat

    async def exercise():
        finish = asyncio.Event()

        class IncrementalAgent:
            async def astream_events(self, *args, **kwargs):
                yield {"event": "on_chat_model_start"}
                yield {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content="Hello")}}
                await finish.wait()
                yield {"event": "on_chain_end", "parent_ids": [],
                       "data": {"output": {"messages": [SimpleNamespace(content="Hello world")]}}}

        response = await chat.stream_chat.__wrapped__(
            Request({"type": "http"}), chat.ChatRequest(message="Hi"), IncrementalAgent(),
        )
        iterator = response.body_iterator
        try:
            async with asyncio.timeout(2):
                while "event: delta" not in (chunk := await anext(iterator)):
                    pass
            assert '"text": "Hello"' in chunk
            assert not finish.is_set()
            finish.set()
            assert "event: completed" in await anext(iterator)
        finally:
            await iterator.aclose()

    asyncio.run(exercise())


def test_new_model_call_resets_streamed_preamble():
    class ToolRoundTripAgent:
        async def astream_events(self, *args, **kwargs):
            for text in ["Let me search.", "Found a car."]:
                yield {"event": "on_chat_model_start"}
                yield {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content=text)}}
            yield {"event": "on_chain_end", "parent_ids": [],
                   "data": {"output": {"messages": [SimpleNamespace(content="Found a car.")]}}}

    app.dependency_overrides[get_agent] = lambda: ToolRoundTripAgent()
    events = frames(TestClient(app).post("/api/chat/stream", json={"message": "cars"}))
    assert [data for name, data in events if name == "delta"] == [
        {"text": "Let me search."}, {"text": "", "reset": True}, {"text": "Found a car."},
    ]


def test_send_disconnect_closes_stream_and_cancels_work():
    from starlette.requests import Request
    from app.api.routes import chat

    async def exercise():
        stopped = asyncio.Event()

        class WaitingAgent:
            async def astream_events(self, *args, **kwargs):
                try:
                    yield {"event": "on_chat_model_start"}
                    await asyncio.Event().wait()
                finally:
                    stopped.set()

        response = await chat.stream_chat.__wrapped__(
            Request({"type": "http"}), chat.ChatRequest(message="Hi"), WaitingAgent(),
        )

        async def disconnected_send(message):
            if message.get("body", b"").startswith(b"event: progress"):
                raise OSError("Disconnected")

        with pytest.raises(OSError):
            await response.stream_response(disconnected_send)
        assert stopped.is_set()

    asyncio.run(exercise())


@pytest.mark.parametrize("error,status", [("Model call limits exceeded", 429), ("secret exception", 500)])
def test_stream_errors_are_terminal_and_sanitized(error, status):
    app.dependency_overrides[get_agent] = lambda: StreamAgent(RuntimeError(error))
    events = frames(TestClient(app).post("/api/chat/stream", json={"message": "Hi"}))
    assert events[-1][0] == "error"
    assert events[-1][1]["status"] == status
    assert error not in events[-1][1]["detail"]
    assert not any(name == "completed" for name, _ in events)


def test_stream_and_legacy_share_rate_limit():
    app.dependency_overrides[get_agent] = lambda: FakeAgent()
    client = TestClient(app)
    for _ in range(per_window(CHAT_LIMIT)):
        assert client.post("/api/chat", json={"message": "Hi"}).status_code == 200
    assert client.post("/api/chat/stream", json={"message": "Hi"}).status_code == 429


def test_real_langchain_agent_stream():
    # Exercise the installed create_agent event protocol without API keys or a DB.
    from langchain.agents import create_agent
    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.messages import AIMessage, AIMessageChunk, ToolMessage
    from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult

    class LocalModel(BaseChatModel):
        @property
        def _llm_type(self):
            return "local-test"

        def bind_tools(self, tools, **kwargs):
            return self

        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            message = AIMessage(content="Here are your vehicles.") if isinstance(messages[-1], ToolMessage) else AIMessage(
                content="", tool_calls=[{"name": "search_vehicles", "args": {}, "id": "call-1", "type": "tool_call"}],
            )
            return ChatResult(generations=[ChatGeneration(message=message)])

        def _stream(self, messages, stop=None, run_manager=None, **kwargs):
            if isinstance(messages[-1], ToolMessage):
                for text in ["Here are ", "your vehicles."]:
                    yield ChatGenerationChunk(message=AIMessageChunk(content=text))
            else:
                yield ChatGenerationChunk(message=AIMessageChunk(
                    content="", tool_calls=[{"name": "search_vehicles", "args": {}, "id": "call-1", "type": "tool_call"}],
                ))

    def search_vehicles() -> str:
        """Search vehicle inventory."""
        return "One matching vehicle"

    agent = create_agent(LocalModel(), tools=[search_vehicles])
    app.dependency_overrides[get_agent] = lambda: agent
    events = frames(TestClient(app).post("/api/chat/stream", json={"message": "cars"}))
    assert events[-1][0] == "completed"
    assert events[-1][1]["reply"] == "Here are your vehicles."
    assert events[0][1]["session_id"] == events[-1][1]["session_id"]
    assert any(data.get("phase") == "tool_started" and data["tool"] == "search_vehicles" for _, data in events)
    assert any(data.get("phase") == "tool_finished" and data["output"] == "One matching vehicle" for _, data in events)
    assert [data["text"] for name, data in events if name == "delta"] == ["Here are ", "your vehicles."]
