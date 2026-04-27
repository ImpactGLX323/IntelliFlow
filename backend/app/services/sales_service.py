from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Product, SalesOrder, SalesOrderItem, StockReservation, Warehouse
from app.services.stock_ledger_service import create_inventory_transaction, reserve_stock, sync_product_current_stock

SALES_ORDER_STATUSES = {
    "DRAFT",
    "CONFIRMED",
    "PARTIALLY_FULFILLED",
    "FULFILLED",
    "CANCELLED",
}


def _generate_sales_order_number(db: Session) -> str:
    count = db.query(SalesOrder).count() + 1
    return f"SO-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"


def _load_sales_order(db: Session, sales_order_id: int) -> SalesOrder:
    sales_order = (
        db.query(SalesOrder)
        .options(joinedload(SalesOrder.items))
        .filter(SalesOrder.id == sales_order_id)
        .first()
    )
    if sales_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")
    return sales_order


def _ensure_sales_order_not_cancelled(sales_order: SalesOrder) -> None:
    if sales_order.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sales order is cancelled")


def _update_sales_order_status(sales_order: SalesOrder) -> None:
    if sales_order.status == "CANCELLED":
        return
    total_ordered = sum(item.quantity_ordered for item in sales_order.items)
    total_fulfilled = sum(item.quantity_fulfilled for item in sales_order.items)
    if total_fulfilled == 0:
        sales_order.status = "CONFIRMED"
    elif total_fulfilled < total_ordered:
        sales_order.status = "PARTIALLY_FULFILLED"
    else:
        sales_order.status = "FULFILLED"


def create_sales_order(
    db: Session,
    *,
    customer_id: Optional[int],
    items: list[dict],
    order_date: Optional[datetime] = None,
    expected_ship_date: Optional[datetime] = None,
    notes: Optional[str] = None,
) -> SalesOrder:
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sales order must include at least one item")

    sales_order = SalesOrder(
        order_number=_generate_sales_order_number(db),
        customer_id=customer_id,
        status="DRAFT",
        order_date=order_date or datetime.utcnow(),
        expected_ship_date=expected_ship_date,
        notes=notes,
    )
    db.add(sales_order)
    db.flush()

    for item_data in items:
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_data['product_id']} not found")
        item = SalesOrderItem(
            sales_order_id=sales_order.id,
            product_id=item_data["product_id"],
            warehouse_id=item_data.get("warehouse_id"),
            quantity_ordered=item_data["quantity_ordered"],
            unit_price=item_data.get("unit_price", 0),
        )
        db.add(item)

    db.commit()
    return _load_sales_order(db, sales_order.id)


def confirm_sales_order(db: Session, sales_order_id: int) -> SalesOrder:
    sales_order = _load_sales_order(db, sales_order_id)
    _ensure_sales_order_not_cancelled(sales_order)
    if sales_order.status not in {"DRAFT", "CONFIRMED"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sales order cannot be confirmed from current status")

    try:
        for item in sales_order.items:
            warehouse_id = item.warehouse_id
            if warehouse_id is None:
                default_warehouse = db.query(Warehouse).order_by(Warehouse.id.asc()).first()
                if default_warehouse is None:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No warehouse available for reservation")
                warehouse_id = default_warehouse.id
                item.warehouse_id = warehouse_id

            outstanding = item.quantity_ordered - item.quantity_reserved - item.quantity_fulfilled
            if outstanding <= 0:
                continue

            reservation = reserve_stock(
                db,
                product_id=item.product_id,
                warehouse_id=warehouse_id,
                quantity=outstanding,
                reference_type="SALES_ORDER_ITEM",
                reference_id=str(item.id),
                commit=False,
            )
            item.quantity_reserved += reservation.quantity
            db.add(item)

        sales_order.status = "CONFIRMED"
        db.add(sales_order)
        db.commit()
        return _load_sales_order(db, sales_order.id)
    except Exception:
        db.rollback()
        raise


def _find_active_reservations_for_item(db: Session, item: SalesOrderItem) -> list[StockReservation]:
    return (
        db.query(StockReservation)
        .filter(
            StockReservation.product_id == item.product_id,
            StockReservation.warehouse_id == item.warehouse_id,
            StockReservation.status == "ACTIVE",
            StockReservation.reference_type == "SALES_ORDER_ITEM",
            StockReservation.reference_id == str(item.id),
        )
        .order_by(StockReservation.created_at.asc(), StockReservation.id.asc())
        .all()
    )


def fulfill_sales_order_item(
    db: Session,
    *,
    order_id: int,
    item_id: int,
    quantity: int,
) -> SalesOrder:
    sales_order = _load_sales_order(db, order_id)
    _ensure_sales_order_not_cancelled(sales_order)
    item = next((row for row in sales_order.items if row.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order item not found")
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
    remaining = item.quantity_ordered - item.quantity_fulfilled
    if quantity > remaining:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fulfillment quantity exceeds outstanding quantity")
    if item.warehouse_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sales order item does not have a warehouse assigned")

    reservations = _find_active_reservations_for_item(db, item)
    reserved_available = sum(reservation.quantity for reservation in reservations)
    if reserved_available < quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient reserved stock to fulfill this item")

    try:
        to_consume = quantity
        for reservation in reservations:
            if to_consume <= 0:
                break
            consume_qty = min(to_consume, reservation.quantity)
            create_inventory_transaction(
                db,
                product_id=item.product_id,
                warehouse_id=item.warehouse_id,
                transaction_type="SALE_SHIPPED",
                quantity=consume_qty,
                direction="OUT",
                reference_type="SALES_ORDER_ITEM",
                reference_id=str(item.id),
                reason="Sales order fulfilled",
                commit=False,
            )
            reservation.quantity -= consume_qty
            reservation.status = "CONSUMED" if reservation.quantity == 0 else "ACTIVE"
            db.add(reservation)
            to_consume -= consume_qty

        item.quantity_fulfilled += quantity
        item.quantity_reserved = max(item.quantity_reserved - quantity, 0)
        db.add(item)
        _update_sales_order_status(sales_order)
        db.add(sales_order)
        sync_product_current_stock(db, item.product_id)
        db.commit()
        return _load_sales_order(db, sales_order.id)
    except Exception:
        db.rollback()
        raise


def cancel_sales_order(db: Session, sales_order_id: int) -> SalesOrder:
    sales_order = _load_sales_order(db, sales_order_id)
    if sales_order.status == "CANCELLED":
        return sales_order

    try:
        for item in sales_order.items:
            reservations = _find_active_reservations_for_item(db, item)
            for reservation in reservations:
                create_inventory_transaction(
                    db,
                    product_id=reservation.product_id,
                    warehouse_id=reservation.warehouse_id,
                    transaction_type="RESERVATION_RELEASED",
                    quantity=reservation.quantity,
                    direction="RELEASE",
                    reference_type="SALES_ORDER_ITEM",
                    reference_id=str(item.id),
                    reason="Sales order cancelled",
                    commit=False,
                )
                reservation.status = "RELEASED"
                db.add(reservation)
            item.quantity_reserved = 0
            db.add(item)
        sales_order.status = "CANCELLED"
        db.add(sales_order)
        db.commit()
        return _load_sales_order(db, sales_order.id)
    except Exception:
        db.rollback()
        raise


def get_sales_order(db: Session, sales_order_id: int) -> SalesOrder:
    return _load_sales_order(db, sales_order_id)


def list_sales_orders(db: Session, status_filter: Optional[str] = None) -> list[SalesOrder]:
    query = db.query(SalesOrder).options(joinedload(SalesOrder.items)).order_by(SalesOrder.created_at.desc())
    if status_filter:
        query = query.filter(SalesOrder.status == status_filter)
    return query.all()
