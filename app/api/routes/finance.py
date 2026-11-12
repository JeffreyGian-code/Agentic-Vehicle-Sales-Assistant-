from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.api.dependencies import get_finance_service
from app.api.rate_limit import DEFAULT_LIMIT, limiter
from app.api.schemas import EmiRequest, EmiResponse
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/finance", tags=["finance"])


@router.post("/emi", response_model=EmiResponse)
@limiter.limit(DEFAULT_LIMIT)
def calculate_emi(
    request: Request,
    body: EmiRequest,
    service: Annotated[FinanceService, Depends(get_finance_service)],
) -> dict:
    return service.calculate_emi(
        principal=body.principal,
        annual_rate=body.annual_rate,
        months=body.months,
    )
