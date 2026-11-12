"""Per-IP rate limiting (slowapi).

Every request is counted against the caller's IP address. When an IP goes
over its allowance inside the time window, the API answers 429 until the
window frees up.
"""

import math
import os
import time

from dotenv import load_dotenv
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
DEFAULT_LIMIT = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
CHAT_LIMIT = os.getenv("RATE_LIMIT_CHAT", "10/minute;100/day")

# memory:// keeps counters inside this process. Use e.g. "redis://host:6379"
# when running several workers/servers so they share the same counters.
STORAGE_URI = os.getenv("RATE_LIMIT_STORAGE_URI", "memory://")

# Every route must be decorated with @limiter.limit(CHAT_LIMIT or
# DEFAULT_LIMIT) and take a `request: Request` parameter; routes without a
# decorator (e.g. /api/health) are not limited.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=STORAGE_URI,
    enabled=RATE_LIMIT_ENABLED,
)


def _retry_after_seconds(request: Request, exc: RateLimitExceeded) -> int:
    try:
        limit_item, keys = request.state.view_rate_limit
        reset_at, _ = limiter.limiter.get_window_stats(limit_item, *keys)
        return max(1, math.ceil(reset_at - time.time()))
    except Exception:
        return exc.limit.limit.get_expiry()


def rate_limit_exceeded_handler(
    request: Request,
    exc: RateLimitExceeded,
) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests from your IP. Please try again later."
        },
        headers={"Retry-After": str(_retry_after_seconds(request, exc))},
    )
