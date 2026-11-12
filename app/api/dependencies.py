from functools import lru_cache

from app.services.finance_service import FinanceService
from app.services.vehicle_service import VehicleService


# Heavy modules (database engine, LLM agent) are imported lazily so the API
# can be imported -- and tested with dependency overrides -- without a
# configured DATABASE_URL or OpenRouter key.

@lru_cache
def get_vehicle_service() -> VehicleService:
    from app.repositories.postgres_vehicle_repository import (
        PostgresVehicleRepository,
    )

    return VehicleService(repository=PostgresVehicleRepository())


@lru_cache
def get_finance_service() -> FinanceService:
    return FinanceService()


@lru_cache
def get_agent():
    from app.agents.agent import agent

    return agent
