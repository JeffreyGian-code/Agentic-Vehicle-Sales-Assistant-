"""Daily session budgets, kept separately from the agent's conversation context."""

import os
import sqlite3
import time
import uuid
from contextlib import closing
from pathlib import Path

from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

CALL_LIMIT = 7
WINDOW_SECONDS = 24 * 60 * 60
DATABASE_PATH = os.getenv(
    "CHAT_USAGE_DATABASE", str(Path(__file__).resolve().parents[2] / ".chat-usage.sqlite3")
)


def session_usage(session_id: str, *, consume: bool = False, reset_context: bool = False):
    # A transaction prevents simultaneous requests from spending the same last call.
    with closing(sqlite3.connect(DATABASE_PATH, timeout=10)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS chat_usage (session_id TEXT PRIMARY KEY, calls INTEGER, resets_at REAL, thread_id TEXT)")
        db.execute("BEGIN IMMEDIATE")
        now = time.time()
        row = db.execute("SELECT calls, resets_at, thread_id FROM chat_usage WHERE session_id = ?", (session_id,)).fetchone()
        calls, resets_at, thread_id = row or (0, now + WINDOW_SECONDS, session_id)
        if resets_at <= now:
            calls, resets_at = 0, now + WINDOW_SECONDS
        if consume:
            if calls >= CALL_LIMIT:
                raise HTTPException(
                    status_code=429,
                    detail="Your session has used all 7 calls. Your budget resets 24 hours after your first call; resetting the conversation does not renew it.",
                )
            if reset_context:
                thread_id = str(uuid.uuid4())
            calls += 1
            db.execute("INSERT OR REPLACE INTO chat_usage VALUES (?, ?, ?, ?)", (session_id, calls, resets_at, thread_id))
        return {"calls": calls, "limit": CALL_LIMIT, "resets_at": resets_at if calls else None, "thread_id": thread_id}
