from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    DelayImpactRead,
    PortOrNodeCreate,
    PortOrNodeRead,
    RouteCreate,
    RouteRead,
    ShipmentCreate,
    ShipmentLegCreate,
    ShipmentRead,
    ShipmentStatusUpdateRequest,
)
from app.services.logistics_service import (
    add_shipment_leg,
    calculate_delay_impact,
    create_port_or_node,
    create_route,
    create_shipment,
    get_active_shipments,
    get_delayed_shipments,
    get_shipment,
    list_ports_or_nodes,
    list_routes,
    update_shipment_status,
)

router = APIRouter()


@router.get("/shipments", response_model=List[ShipmentRead])
async def list_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_active_shipments(db)


@router.post("/shipments", response_model=ShipmentRead, status_code=status.HTTP_201_CREATED)
async def post_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_shipment(db, **payload.model_dump())


@router.get("/shipments/analytics/delayed", response_model=List[ShipmentRead])
async def delayed_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_delayed_shipments(db)


@router.get("/shipments/{shipment_id}", response_model=ShipmentRead)
async def fetch_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_shipment(db, shipment_id)


@router.post("/shipments/{shipment_id}/status", response_model=ShipmentRead)
async def post_shipment_status(
    shipment_id: int,
    payload: ShipmentStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return update_shipment_status(db, shipment_id, **payload.model_dump())


@router.post("/shipments/{shipment_id}/legs", response_model=ShipmentRead)
async def post_shipment_leg(
    shipment_id: int,
    payload: ShipmentLegCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return add_shipment_leg(db, shipment_id, **payload.model_dump())


@router.get("/shipments/{shipment_id}/delay-impact", response_model=DelayImpactRead)
async def shipment_delay_impact(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return calculate_delay_impact(db, shipment_id)


@router.get("/routes", response_model=List[RouteRead])
async def get_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list_routes(db)


@router.post("/routes", response_model=RouteRead, status_code=status.HTTP_201_CREATED)
async def post_route(
    payload: RouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_route(db, **payload.model_dump())


@router.get("/ports", response_model=List[PortOrNodeRead])
async def get_ports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list_ports_or_nodes(db)


@router.post("/ports", response_model=PortOrNodeRead, status_code=status.HTTP_201_CREATED)
async def post_port(
    payload: PortOrNodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_port_or_node(db, **payload.model_dump())
