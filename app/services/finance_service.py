class FinanceService:

    def calculate_emi(
        self,
        principal: float,
        annual_rate: float,
        months: int,
    ) -> dict:

        monthly_rate = annual_rate / 12 / 100

        if monthly_rate == 0:
            emi = principal / months
        else:
            emi = (
                principal
                * monthly_rate
                * (1 + monthly_rate) ** months
                / ((1 + monthly_rate) ** months - 1)
            )

        emi = round(emi, 2)

        total_payment = round(
            emi * months,
            2,
        )

        total_interest = round(
            total_payment - principal,
            2,
        )

        return {
            "monthly_emi": emi,
            "total_payment": total_payment,
            "total_interest": total_interest,
        }