from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
# Intentionally not rate limited so uptime monitors never get blocked.
def health() -> dict[str, str]:
    return {"status": "ok"}
