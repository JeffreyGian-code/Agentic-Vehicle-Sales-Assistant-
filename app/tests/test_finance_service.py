import pytest

from app.services.finance_service import FinanceService


def test_calculate_emi():

    service = FinanceService()

    result = service.calculate_emi(
        principal=800000,
        annual_rate=8.5,
        months=60,
    )

    assert result["monthly_emi"] == pytest.approx(16413.23)
    assert result["total_payment"] == pytest.approx(984793.80)
    assert result["total_interest"] == pytest.approx(184793.80)

def test_calculate_emi_zero_interest():

    service = FinanceService()

    result = service.calculate_emi(
        principal=120000,
        annual_rate=0,
        months=12,
    )

    assert result["monthly_emi"] == pytest.approx(10000)
    assert result["total_interest"] == pytest.approx(0)
