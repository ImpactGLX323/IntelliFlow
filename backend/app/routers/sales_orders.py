from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.plan import require_plan
from app.database import get_db
from app.models import User
from app.schemas import FulfillSalesOrderItemRequest, SalesOrderCreate, SalesOrderRead
from app.services.sales_service import (
    cancel_sales_order,
    confirm_sales_order,
    create_sales_order,
    fulfill_sales_order_item,
    get_sales_order,
    list_sales_orders,
)
from app.services.notification_service import create_notification

router = APIRouter(dependencies=[Depends(require_plan("PRO"))])


@router.get("/", response_model=List[SalesOrderRead])
async def get_sales_orders(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list_sales_orders(db, owner_id=current_user.id, status_filter=status_filter)


@router.post("/", response_model=SalesOrderRead, status_code=status.HTTP_201_CREATED)
async def post_sales_order(
    payload: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    order = create_sales_order(
        db,
        owner_id=current_user.id,
        customer_id=payload.customer_id,
        items=[item.model_dump() for item in payload.items],
        order_date=payload.order_date,
        expected_ship_date=payload.expected_ship_date,
        notes=payload.notes,
    )
    create_notification(
        db,
        user=current_user,
        category="sales_order_alerts",
        title="Sales order created",
        body=f"Sales order {order.order_number} was created.",
        data={"sales_order_id": order.id, "status": order.status},
    )
    return order


@router.get("/{sales_order_id}", response_model=SalesOrderRead)
async def fetch_sales_order(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_sales_order(db, sales_order_id, owner_id=current_user.id)


@router.post("/{sales_order_id}/confirm", response_model=SalesOrderRead)
async def confirm_order(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    order = confirm_sales_order(db, sales_order_id, owner_id=current_user.id)
    create_notification(
        db,
        user=current_user,
        category="sales_order_alerts",
        title="Sales order confirmed",
        body=f"Sales order {order.order_number} reserved stock successfully.",
        data={"sales_order_id": order.id, "status": order.status},
    )
    return order


@router.post("/{sales_order_id}/cancel", response_model=SalesOrderRead)
async def cancel_order(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return cancel_sales_order(db, sales_order_id, owner_id=current_user.id)


@router.post("/{order_id}/items/{item_id}/fulfill", response_model=SalesOrderRead)
async def fulfill_order_item(
    order_id: int,
    item_id: int,
    payload: FulfillSalesOrderItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    order = fulfill_sales_order_item(db, owner_id=current_user.id, order_id=order_id, item_id=item_id, quantity=payload.quantity)
    create_notification(
        db,
        user=current_user,
        category="sales_order_alerts",
        title="Sales order fulfilled",
        body=f"Fulfillment posted for sales order {order.order_number}.",
        data={"sales_order_id": order.id, "status": order.status},
    )
    create_notification(
        db,
        user=current_user,
        category="stock_deducted",
        title="Stock deducted",
        body=f"Reserved stock was consumed for sales order {order.order_number}.",
        severity="info",
        data={"sales_order_id": order.id, "item_id": item_id, "quantity": payload.quantity},
    )
    return order
