from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Product, PurchaseOrder, PurchaseOrderItem, Warehouse
from app.services.stock_ledger_service import receive_purchase


def _generate_po_number(db: Session) -> str:
    count = db.query(PurchaseOrder).count() + 1
    return f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"


def _load_purchase_order(db: Session, purchase_order_id: int) -> PurchaseOrder:
    purchase_order = (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )
    if purchase_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    return purchase_order


def _recompute_purchase_order_status(purchase_order: PurchaseOrder) -> None:
    if purchase_order.status == "CANCELLED":
        return
    total_ordered = sum(item.quantity_ordered for item in purchase_order.items)
    total_received = sum(item.quantity_received for item in purchase_order.items)
    if total_received == 0:
        purchase_order.status = "ORDERED"
    elif total_received < total_ordered:
        purchase_order.status = "PARTIALLY_RECEIVED"
    else:
        purchase_order.status = "RECEIVED"


def create_purchase_order(
    db: Session,
    *,
    supplier_id: Optional[int],
    items: list[dict],
    order_date: Optional[datetime] = None,
    expected_arrival_date: Optional[datetime] = None,
    notes: Optional[str] = None,
) -> PurchaseOrder:
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase order must include at least one item")

    purchase_order = PurchaseOrder(
        po_number=_generate_po_number(db),
        supplier_id=supplier_id,
        status="DRAFT",
        order_date=order_date or datetime.utcnow(),
        expected_arrival_date=expected_arrival_date,
        notes=notes,
    )
    db.add(purchase_order)
    db.flush()

    for item_data in items:
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_data['product_id']} not found")
        item = PurchaseOrderItem(
            purchase_order_id=purchase_order.id,
            product_id=item_data["product_id"],
            warehouse_id=item_data.get("warehouse_id"),
            quantity_ordered=item_data["quantity_ordered"],
            unit_cost=item_data.get("unit_cost", 0),
        )
        db.add(item)

    db.commit()
    return _load_purchase_order(db, purchase_order.id)


def mark_purchase_order_ordered(db: Session, purchase_order_id: int) -> PurchaseOrder:
    purchase_order = _load_purchase_order(db, purchase_order_id)
    if purchase_order.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase order is cancelled")
    if purchase_order.status not in {"DRAFT", "ORDERED"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase order cannot be marked ordered from current status")
    purchase_order.status = "ORDERED"
    db.add(purchase_order)
    db.commit()
    return _load_purchase_order(db, purchase_order.id)


def receive_purchase_order_item(
    db: Session,
    *,
    purchase_order_id: int,
    item_id: int,
    quantity: int,
) -> PurchaseOrder:
    purchase_order = _load_purchase_order(db, purchase_order_id)
    if purchase_order.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase order is cancelled")
    item = next((row for row in purchase_order.items if row.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order item not found")
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
    if item.quantity_received + quantity > item.quantity_ordered:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Received quantity exceeds ordered quantity")

    warehouse_id = item.warehouse_id
    if warehouse_id is None:
        default_warehouse = db.query(Warehouse).order_by(Warehouse.id.asc()).first()
        if default_warehouse is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No warehouse available for receiving")
        warehouse_id = default_warehouse.id
        item.warehouse_id = warehouse_id

    try:
        receive_purchase(
            db,
            product_id=item.product_id,
            warehouse_id=warehouse_id,
            quantity=quantity,
            reference_id=str(item.id),
            commit=False,
        )
        item.quantity_received += quantity
        db.add(item)
        _recompute_purchase_order_status(purchase_order)
        db.add(purchase_order)
        db.commit()
        return _load_purchase_order(db, purchase_order.id)
    except Exception:
        db.rollback()
        raise


def cancel_purchase_order(db: Session, purchase_order_id: int) -> PurchaseOrder:
    purchase_order = _load_purchase_order(db, purchase_order_id)
    if purchase_order.status == "RECEIVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fully received purchase order cannot be cancelled")
    purchase_order.status = "CANCELLED"
    db.add(purchase_order)
    db.commit()
    return _load_purchase_order(db, purchase_order.id)


def get_purchase_order(db: Session, purchase_order_id: int) -> PurchaseOrder:
    return _load_purchase_order(db, purchase_order_id)


def list_purchase_orders(db: Session, status_filter: Optional[str] = None) -> list[PurchaseOrder]:
    query = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.items)).order_by(PurchaseOrder.created_at.desc())
    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter)
    return query.all()
