import asyncio
import os

import httpx
from fastapi import APIRouter, Request
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

from app.api.rate_limit import limiter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def check_database() -> dict[str, str]:
    url = os.getenv("DATABASE_URL")
    if not url:
        return {"status": "unavailable", "detail": "Not configured."}
    engine = None
    try:
        engine = create_engine(
            url, poolclass=NullPool,
            connect_args={"connect_timeout": 3, "options": "-c statement_timeout=3000"},
        )
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "detail": "Connected & query succeeded."}
    except Exception:
        return {"status": "unavailable", "detail": "Connection or query failed."}
    finally:
        if engine is not None:
            engine.dispose()


async def check_ai() -> dict[str, str]:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return {"status": "unavailable", "detail": "Key not configured."}
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/key",
                headers={"Authorization": f"Bearer {key}"},
            )
        if response.status_code == 200 and isinstance(response.json().get("data"), dict):
            return {"status": "ok", "detail": "Reachable & key accepted."}
        return {"status": "unavailable", "detail": "Provider access check failed."}
    except Exception:
        return {"status": "unavailable", "detail": "Could not verify provider access."}


@router.get("/health/services")
@limiter.limit("6/minute")
async def service_health(request: Request) -> dict:
    database, ai = await asyncio.gather(asyncio.to_thread(check_database), check_ai())
    return {
        "api": {"status": "ok", "detail": "API reachable."},
        "database": database,
        "ai": ai,
    }
