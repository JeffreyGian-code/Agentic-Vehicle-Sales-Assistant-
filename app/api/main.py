import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, finance, health, vehicles

load_dotenv()

DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"


def create_app() -> FastAPI:
    app = FastAPI(
        title="Vehicle Sales Assistant API",
        version="1.0.0",
    )

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

    for router in (health.router, chat.router, vehicles.router, finance.router):
        app.include_router(router, prefix="/api")

    return app


app = create_app()
