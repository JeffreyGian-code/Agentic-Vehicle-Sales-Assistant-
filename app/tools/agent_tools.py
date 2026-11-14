from langchain_core.tools import StructuredTool

from app.models.SearchRequest import SearchRequest
from app.models.vehicle import Vehicle
from app.repositories.postgres_vehicle_repository import (
    PostgresVehicleRepository,
)
from app.services.finance_service import FinanceService
from app.services.vehicle_service import VehicleService


class AgentTools:

    def __init__(self):
        repository = PostgresVehicleRepository()

        self.vehicle_service = VehicleService(
            repository=repository
        )
        self.finance_service = FinanceService()

    def search_vehicles(
        self,
        request: SearchRequest,
    ) -> list[Vehicle]:
        """Search vehicles using the provided search criteria."""

        return self.vehicle_service.search(
            brand=request.brand,
            model=request.model,
            variant=request.variant,
            max_price=request.max_price,
            vehicle_type=request.vehicle_type,
            )

    def get_vehicle_details(
        self,
        vehicle_id: int,
    ):
        """Get detailed information about a vehicle using its ID."""

        vehicle = self.vehicle_service.get_by_id(vehicle_id)

        if vehicle is None:
            return "Vehicle not found."

        return vehicle

    def calculate_emi(
        self,
        principal: float,
        annual_rate: float,
        months: int,
    ):
        """Calculate monthly EMI and total loan cost."""

        return self.finance_service.calculate_emi(
            principal=principal,
            annual_rate=annual_rate,
            months=months,
        )

    def get_tools(self):
        return [
            StructuredTool.from_function(
                func=self.search_vehicles,
                name="search_vehicles",
                description=(
                    "Search vehicles using brand, model, variant, "
                    "maximum price, and vehicle type."
                ),
            ),
            StructuredTool.from_function(
                func=self.get_vehicle_details,
                name="get_vehicle_details",
                description=(
                    "Get detailed information about "
                    "a vehicle using its ID."
                ),
            ),
            StructuredTool.from_function(
                func=self.calculate_emi,
                name="calculate_emi",
                description=(
                    "Calculate monthly EMI and total "
                    "loan cost."
                ),
            ),
        ]