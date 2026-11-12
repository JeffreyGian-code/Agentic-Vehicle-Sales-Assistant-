from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_finance_service
from app.api.schemas import EmiRequest, EmiResponse
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/finance", tags=["finance"])


@router.post("/emi", response_model=EmiResponse)
def calculate_emi(
    request: EmiRequest,
    service: Annotated[FinanceService, Depends(get_finance_service)],
) -> dict:
    return service.calculate_emi(
        principal=request.principal,
        annual_rate=request.annual_rate,
        months=request.months,
    )
