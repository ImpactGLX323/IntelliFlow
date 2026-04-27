from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models import Product, ReturnOrder, ReturnOrderItem, Sale
from app.services.stock_ledger_service import create_inventory_transaction, record_damaged_stock, record_quarantined_stock


def _generate_return_number(db: Session) -> str:
    count = db.query(ReturnOrder).count() + 1
    return f"RTN-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"


def _load_return_order(db: Session, return_order_id: int) -> ReturnOrder:
    return_order = (
        db.query(ReturnOrder)
        .options(joinedload(ReturnOrder.items))
        .filter(ReturnOrder.id == return_order_id)
        .first()
    )
    if return_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return order not found")
    return return_order


def create_return_order(
    db: Session,
    *,
    sales_order_id: int | None,
    customer_id: int | None,
    items: list[dict],
    return_date: datetime | None = None,
    notes: str | None = None,
) -> ReturnOrder:
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return order must include at least one item")

    return_order = ReturnOrder(
        return_number=_generate_return_number(db),
        sales_order_id=sales_order_id,
        customer_id=customer_id,
        status="REQUESTED",
        return_date=return_date or datetime.utcnow(),
        notes=notes,
    )
    db.add(return_order)
    db.flush()

    for item_data in items:
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_data['product_id']} not found")
        return_item = ReturnOrderItem(return_order_id=return_order.id, **item_data)
        db.add(return_item)

    db.commit()
    return _load_return_order(db, return_order.id)


def approve_return_order(db: Session, return_order_id: int) -> ReturnOrder:
    return_order = _load_return_order(db, return_order_id)
    if return_order.status != "REQUESTED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return order is not awaiting approval")
    return_order.status = "APPROVED"
    db.add(return_order)
    db.commit()
    return _load_return_order(db, return_order.id)


def receive_return_item(db: Session, *, return_id: int, item_id: int, quantity: int) -> ReturnOrder:
    return_order = _load_return_order(db, return_id)
    if return_order.status not in {"APPROVED", "RECEIVED"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return order cannot receive items in current status")
    item = next((row for row in return_order.items if row.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return item not found")
    if quantity <= 0 or quantity > item.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid return quantity")
    if item.warehouse_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return item requires a warehouse")

    if item.condition == "RESTOCKABLE":
        create_inventory_transaction(
            db,
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            transaction_type="RETURN_RECEIVED",
            quantity=quantity,
            direction="IN",
            reference_type="RETURN_ORDER_ITEM",
            reference_id=str(item.id),
            reason="Restockable return received",
            commit=False,
        )
    elif item.condition == "DAMAGED":
        record_damaged_stock(
            db,
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            quantity=quantity,
            reason="Damaged returned item",
            commit=False,
        )
    elif item.condition == "QUARANTINE":
        record_quarantined_stock(
            db,
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            quantity=quantity,
            reason="Returned item sent to quarantine",
            commit=False,
        )
    elif item.condition == "SCRAP":
        pass
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported return condition")

    return_order.status = "RECEIVED"
    return_order.refund_amount = sum(return_item.refund_amount for return_item in return_order.items)
    return_order.replacement_cost = sum(return_item.replacement_cost for return_item in return_order.items)
    db.add(return_order)
    db.commit()
    return _load_return_order(db, return_order.id)


def mark_refunded(db: Session, *, return_order_id: int, refund_amount: float | None = None) -> ReturnOrder:
    return_order = _load_return_order(db, return_order_id)
    return_order.status = "REFUNDED"
    if refund_amount is not None:
        return_order.refund_amount = refund_amount
    else:
        return_order.refund_amount = sum(item.refund_amount for item in return_order.items)
    return_order.replacement_cost = sum(item.replacement_cost for item in return_order.items)
    db.add(return_order)
    db.commit()
    return _load_return_order(db, return_order.id)


def calculate_return_adjusted_margin(db: Session, product_id: int, start_date: datetime, end_date: datetime) -> dict:
    sales = (
        db.query(Sale, Product)
        .join(Product, Product.id == Sale.product_id)
        .filter(Sale.product_id == product_id, Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        .all()
    )
    missing_data: list[str] = []
    if not sales:
        missing_data.append("no_sales_in_range")
    if any(product.cost is None for _, product in sales):
        missing_data.append("missing_product_cost")

    gross_profit = 0.0
    for sale, product in sales:
        unit_cost = product.cost if product.cost is not None else 0.0
        gross_profit += sale.total_amount - (sale.quantity * unit_cost)

    refunds, replacements = (
        db.query(
            func.coalesce(func.sum(ReturnOrderItem.refund_amount), 0.0),
            func.coalesce(func.sum(ReturnOrderItem.replacement_cost), 0.0),
        )
        .join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id)
        .filter(
            ReturnOrderItem.product_id == product_id,
            ReturnOrder.return_date >= start_date,
            ReturnOrder.return_date <= end_date,
        )
        .one()
    )
    return {
        "product_id": product_id,
        "gross_profit": float(gross_profit),
        "refund_amount": float(refunds or 0),
        "replacement_cost": float(replacements or 0),
        "return_adjusted_margin": float(gross_profit - (refunds or 0) - (replacements or 0)),
        "missing_data": missing_data,
    }


def get_high_return_products(db: Session, start_date: datetime, end_date: datetime) -> list[dict]:
    rows = (
        db.query(
            ReturnOrderItem.product_id,
            func.coalesce(func.sum(ReturnOrderItem.quantity), 0).label("returned_quantity"),
            func.coalesce(func.sum(ReturnOrderItem.refund_amount), 0.0).label("refund_amount"),
            func.coalesce(func.sum(ReturnOrderItem.replacement_cost), 0.0).label("replacement_cost"),
        )
        .join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id)
        .filter(ReturnOrder.return_date >= start_date, ReturnOrder.return_date <= end_date)
        .group_by(ReturnOrderItem.product_id)
        .order_by(func.sum(ReturnOrderItem.quantity).desc())
        .all()
    )
    return [
        {
            "product_id": row.product_id,
            "returned_quantity": int(row.returned_quantity or 0),
            "refund_amount": float(row.refund_amount or 0),
            "replacement_cost": float(row.replacement_cost or 0),
        }
        for row in rows
    ]


def get_profit_leakage_report(db: Session, start_date: datetime, end_date: datetime) -> dict:
    by_product = []
    total_refunds = 0.0
    total_replacements = 0.0
    for row in get_high_return_products(db, start_date, end_date):
        leakage = row["refund_amount"] + row["replacement_cost"]
        total_refunds += row["refund_amount"]
        total_replacements += row["replacement_cost"]
        by_product.append(
            {
                "product_id": row["product_id"],
                "refund_amount": row["refund_amount"],
                "replacement_cost": row["replacement_cost"],
                "total_leakage": leakage,
            }
        )
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_refunds": total_refunds,
        "total_replacement_cost": total_replacements,
        "total_profit_leakage": total_refunds + total_replacements,
        "by_product": by_product,
    }


def get_return_order(db: Session, return_order_id: int) -> ReturnOrder:
    return _load_return_order(db, return_order_id)


def list_return_orders(db: Session) -> list[ReturnOrder]:
    return db.query(ReturnOrder).options(joinedload(ReturnOrder.items)).order_by(ReturnOrder.created_at.desc()).all()
