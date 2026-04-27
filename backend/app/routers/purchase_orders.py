from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import PurchaseOrderCreate, PurchaseOrderRead, ReceivePurchaseOrderItemRequest
from app.services.purchasing_service import (
    cancel_purchase_order,
    create_purchase_order,
    get_purchase_order,
    list_purchase_orders,
    mark_purchase_order_ordered,
    receive_purchase_order_item,
)

router = APIRouter()


@router.get("/", response_model=List[PurchaseOrderRead])
async def get_purchase_orders(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list_purchase_orders(db, status_filter)


@router.post("/", response_model=PurchaseOrderRead, status_code=status.HTTP_201_CREATED)
async def post_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_purchase_order(
        db,
        supplier_id=payload.supplier_id,
        items=[item.model_dump() for item in payload.items],
        order_date=payload.order_date,
        expected_arrival_date=payload.expected_arrival_date,
        notes=payload.notes,
    )


@router.get("/{purchase_order_id}", response_model=PurchaseOrderRead)
async def fetch_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_purchase_order(db, purchase_order_id)


@router.post("/{purchase_order_id}/mark-ordered", response_model=PurchaseOrderRead)
async def mark_ordered(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return mark_purchase_order_ordered(db, purchase_order_id)


@router.post("/{purchase_order_id}/cancel", response_model=PurchaseOrderRead)
async def cancel_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return cancel_purchase_order(db, purchase_order_id)


@router.post("/{order_id}/items/{item_id}/receive", response_model=PurchaseOrderRead)
async def receive_order_item(
    order_id: int,
    item_id: int,
    payload: ReceivePurchaseOrderItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return receive_purchase_order_item(db, purchase_order_id=order_id, item_id=item_id, quantity=payload.quantity)
