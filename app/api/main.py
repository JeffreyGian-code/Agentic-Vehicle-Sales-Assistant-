import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.rate_limit import limiter, rate_limit_exceeded_handler
from app.api.routes import chat, health

load_dotenv()

DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"


def create_app() -> FastAPI:
    app = FastAPI(
        title="Vehicle Sales Assistant API",
        version="1.0.0",
    )

    # Per-IP rate limiting on POST /api/chat (see rate_limit.py).
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


    origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Only two public routes. Vehicle search/details and EMI are agent tools,
    # reached through /api/chat, not separate endpoints.
    for router in (health.router, chat.router):
        app.include_router(router, prefix="/api")

    return app


app = create_app()
