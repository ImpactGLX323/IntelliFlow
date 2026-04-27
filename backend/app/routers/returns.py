from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    HighReturnProductRead,
    ProfitLeakageReportRead,
    ReceiveReturnItemRequest,
    RefundReturnOrderRequest,
    ReturnOrderCreate,
    ReturnOrderRead,
)
from app.services.returns_service import (
    approve_return_order,
    create_return_order,
    get_high_return_products,
    get_profit_leakage_report,
    get_return_order,
    list_return_orders,
    mark_refunded,
    receive_return_item,
)

router = APIRouter()


@router.get("/", response_model=List[ReturnOrderRead])
async def get_returns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list_return_orders(db)


@router.post("/", response_model=ReturnOrderRead, status_code=status.HTTP_201_CREATED)
async def post_return_order(
    payload: ReturnOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_return_order(
        db,
        sales_order_id=payload.sales_order_id,
        customer_id=payload.customer_id,
        items=[item.model_dump() for item in payload.items],
        return_date=payload.return_date,
        notes=payload.notes,
    )


@router.get("/{return_order_id}", response_model=ReturnOrderRead)
async def fetch_return_order(
    return_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_return_order(db, return_order_id)


@router.post("/{return_order_id}/approve", response_model=ReturnOrderRead)
async def approve_return(
    return_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return approve_return_order(db, return_order_id)


@router.post("/{return_id}/items/{item_id}/receive", response_model=ReturnOrderRead)
async def receive_return(
    return_id: int,
    item_id: int,
    payload: ReceiveReturnItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return receive_return_item(db, return_id=return_id, item_id=item_id, quantity=payload.quantity)


@router.post("/{return_order_id}/refund", response_model=ReturnOrderRead)
async def refund_return(
    return_order_id: int,
    payload: RefundReturnOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return mark_refunded(db, return_order_id=return_order_id, refund_amount=payload.refund_amount)


@router.get("/analytics/high-return-products", response_model=List[HighReturnProductRead])
async def high_return_products(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_high_return_products(db, start_date, end_date)


@router.get("/analytics/profit-leakage", response_model=ProfitLeakageReportRead)
async def profit_leakage(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_profit_leakage_report(db, start_date, end_date)
