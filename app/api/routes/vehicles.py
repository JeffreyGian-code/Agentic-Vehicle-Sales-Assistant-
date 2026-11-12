from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.api.dependencies import get_vehicle_service
from app.api.rate_limit import DEFAULT_LIMIT, limiter
from app.models.SearchRequest import SearchRequest
from app.models.vehicle import Vehicle
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

VehicleServiceDep = Annotated[VehicleService, Depends(get_vehicle_service)]


@router.get("", response_model=list[Vehicle])
@limiter.limit(DEFAULT_LIMIT)
def search_vehicles(
    request: Request,
    filters: Annotated[SearchRequest, Query()],
    service: VehicleServiceDep,
) -> list[Vehicle]:
    return service.search(
        brand=filters.brand,
        model=filters.model,
        max_price=filters.max_price,
        vehicle_type=filters.vehicle_type,
    )


@router.get("/{vehicle_id}", response_model=Vehicle)
@limiter.limit(DEFAULT_LIMIT)
def get_vehicle(
    request: Request,
    vehicle_id: int,
    service: VehicleServiceDep,
) -> Vehicle:
    vehicle = service.get_by_id(vehicle_id)

    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    return vehicle
