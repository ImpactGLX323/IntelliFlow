from typing import List, Optional

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.plan import require_plan
from app.database import get_db
from app.models import User
from app.schemas import PurchaseOrderCreate, PurchaseOrderRead, ReceivePurchaseOrderItemRequest
from app.services.csv_service import export_purchase_orders_csv
from app.services.purchasing_service import (
    cancel_purchase_order,
    create_purchase_order,
    get_purchase_order,
    list_purchase_orders,
    mark_purchase_order_ordered,
    receive_purchase_order_item,
)
from app.services.notification_service import create_notification

router = APIRouter(dependencies=[Depends(require_plan("PRO"))])


@router.get("/export/csv")
async def get_purchase_orders_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    csv_content = export_purchase_orders_csv(db, user=current_user)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="intelliflow-purchase-orders.csv"'},
    )


@router.get("/", response_model=List[PurchaseOrderRead])
async def get_purchase_orders(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list_purchase_orders(db, owner_id=current_user.id, status_filter=status_filter)


@router.post("/", response_model=PurchaseOrderRead, status_code=status.HTTP_201_CREATED)
async def post_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    order = create_purchase_order(
        db,
        owner_id=current_user.id,
        supplier_id=payload.supplier_id,
        items=[item.model_dump() for item in payload.items],
        order_date=payload.order_date,
        expected_arrival_date=payload.expected_arrival_date,
        notes=payload.notes,
    )
    create_notification(
        db,
        user=current_user,
        category="purchase_order_due_overdue",
        title="Purchase order created",
        body=f"Purchase order {order.po_number} was created.",
        data={"purchase_order_id": order.id, "status": order.status},
    )
    return order


@router.get("/{purchase_order_id}", response_model=PurchaseOrderRead)
async def fetch_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_purchase_order(db, purchase_order_id, owner_id=current_user.id)


@router.post("/{purchase_order_id}/mark-ordered", response_model=PurchaseOrderRead)
async def mark_ordered(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    order = mark_purchase_order_ordered(db, purchase_order_id, owner_id=current_user.id)
    create_notification(
        db,
        user=current_user,
        category="purchase_order_due_overdue",
        title="Purchase order placed",
        body=f"Purchase order {order.po_number} is now ordered.",
        data={"purchase_order_id": order.id, "status": order.status},
    )
    return order


@router.post("/{purchase_order_id}/cancel", response_model=PurchaseOrderRead)
async def cancel_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return cancel_purchase_order(db, purchase_order_id, owner_id=current_user.id)


@router.post("/{order_id}/items/{item_id}/receive", response_model=PurchaseOrderRead)
async def receive_order_item(
    order_id: int,
    item_id: int,
    payload: ReceivePurchaseOrderItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    order = receive_purchase_order_item(db, owner_id=current_user.id, purchase_order_id=order_id, item_id=item_id, quantity=payload.quantity)
    create_notification(
        db,
        user=current_user,
        category="stock_received",
        title="Purchase stock received",
        body=f"Receiving posted for purchase order {order.po_number}.",
        data={"purchase_order_id": order.id, "status": order.status},
    )
    return order
