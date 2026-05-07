from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from math import fabs
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models import Product, ReturnOrder, ReturnOrderItem, Sale
from app.services.stock_ledger_service import create_inventory_transaction, record_damaged_stock, record_quarantined_stock


def _generate_return_number(db: Session, *, owner_id: int) -> str:
    count = db.query(ReturnOrder).filter(ReturnOrder.owner_id == owner_id).count() + 1
    return f"RTN-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"


def _load_return_order(db: Session, return_order_id: int, *, owner_id: int) -> ReturnOrder:
    return_order = (
        db.query(ReturnOrder)
        .options(joinedload(ReturnOrder.items))
        .filter(ReturnOrder.id == return_order_id, ReturnOrder.owner_id == owner_id)
        .first()
    )
    if return_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return order not found")
    return return_order


def _get_product_by_sku(db: Session, sku: str, *, owner_id: int) -> Product:
    product = db.query(Product).filter(Product.sku == sku, Product.owner_id == owner_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def get_product_by_sku(db: Session, sku: str, *, owner_id: int) -> Product:
    return _get_product_by_sku(db, sku, owner_id=owner_id)


def _get_return_items_for_product(
    db: Session,
    *,
    product_id: int,
    start_date: datetime,
    end_date: datetime,
) -> list[ReturnOrderItem]:
    return (
        db.query(ReturnOrderItem)
        .join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id)
        .filter(
            ReturnOrderItem.product_id == product_id,
            ReturnOrder.return_date >= start_date,
            ReturnOrder.return_date <= end_date,
        )
        .all()
    )


def _get_sales_for_product(
    db: Session,
    *,
    product_id: int,
    start_date: datetime,
    end_date: datetime,
) -> list[Sale]:
    return (
        db.query(Sale)
        .filter(
            Sale.product_id == product_id,
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date,
        )
        .all()
    )


def _confidence_level(missing_data: list[str]) -> str:
    if not missing_data:
        return "HIGH"
    if len(missing_data) <= 2:
        return "MEDIUM"
    return "LOW"


def create_return_order(
    db: Session,
    *,
    owner_id: int,
    sales_order_id: int | None,
    customer_id: int | None,
    items: list[dict],
    return_date: datetime | None = None,
    notes: str | None = None,
) -> ReturnOrder:
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return order must include at least one item")

    return_order = ReturnOrder(
        return_number=_generate_return_number(db, owner_id=owner_id),
        sales_order_id=sales_order_id,
        customer_id=customer_id,
        owner_id=owner_id,
        status="REQUESTED",
        return_date=return_date or datetime.utcnow(),
        notes=notes,
    )
    db.add(return_order)
    db.flush()

    for item_data in items:
        product = db.query(Product).filter(Product.id == item_data["product_id"], Product.owner_id == owner_id).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_data['product_id']} not found")
        return_item = ReturnOrderItem(return_order_id=return_order.id, **item_data)
        db.add(return_item)

    db.commit()
    return _load_return_order(db, return_order.id, owner_id=owner_id)


def approve_return_order(db: Session, return_order_id: int, *, owner_id: int) -> ReturnOrder:
    return_order = _load_return_order(db, return_order_id, owner_id=owner_id)
    if return_order.status != "REQUESTED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return order is not awaiting approval")
    return_order.status = "APPROVED"
    db.add(return_order)
    db.commit()
    return _load_return_order(db, return_order.id, owner_id=owner_id)


def receive_return_item(db: Session, *, owner_id: int, return_id: int, item_id: int, quantity: int) -> ReturnOrder:
    return_order = _load_return_order(db, return_id, owner_id=owner_id)
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
    return _load_return_order(db, return_order.id, owner_id=owner_id)


def mark_refunded(db: Session, *, owner_id: int, return_order_id: int, refund_amount: float | None = None) -> ReturnOrder:
    return_order = _load_return_order(db, return_order_id, owner_id=owner_id)
    return_order.status = "REFUNDED"
    if refund_amount is not None:
        return_order.refund_amount = refund_amount
    else:
        return_order.refund_amount = sum(item.refund_amount for item in return_order.items)
    return_order.replacement_cost = sum(item.replacement_cost for item in return_order.items)
    db.add(return_order)
    db.commit()
    return _load_return_order(db, return_order.id, owner_id=owner_id)


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

    reverse_logistics_cost = 0.0
    support_cost = 0.0
    marketplace_penalty = 0.0
    warranty_cost = 0.0
    missing_data.extend(
        [
            "reverse_logistics_cost_not_modeled",
            "support_cost_not_modeled",
            "marketplace_penalty_not_modeled",
            "warranty_cost_not_modeled",
        ]
    )
    return_adjusted_profit = float(
        gross_profit
        - (refunds or 0)
        - (replacements or 0)
        - reverse_logistics_cost
        - support_cost
        - marketplace_penalty
        - warranty_cost
    )
    return {
        "product_id": product_id,
        "gross_profit": float(gross_profit),
        "refund_cost": float(refunds or 0),
        "replacement_cost": float(replacements or 0),
        "reverse_logistics_cost": reverse_logistics_cost,
        "support_cost": support_cost,
        "marketplace_penalty": marketplace_penalty,
        "warranty_cost": warranty_cost,
        "return_adjusted_profit": return_adjusted_profit,
        "return_adjusted_margin": return_adjusted_profit,
        "best_available_estimate": return_adjusted_profit,
        "missing_data": sorted(set(missing_data)),
        "confidence_level": _confidence_level(sorted(set(missing_data))),
    }


def get_return_rate(
    db: Session,
    *,
    product_id: int,
    start_date: datetime,
    end_date: datetime,
) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    sales = _get_sales_for_product(db, product_id=product_id, start_date=start_date, end_date=end_date)
    return_items = _get_return_items_for_product(db, product_id=product_id, start_date=start_date, end_date=end_date)
    units_sold = sum(sale.quantity for sale in sales)
    units_returned = sum(item.quantity for item in return_items)
    return_rate = None if units_sold <= 0 else float(units_returned) / float(units_sold)
    missing_data = ["no_sales_in_range"] if units_sold == 0 else []
    return {
        "product_id": product.id,
        "sku": product.sku,
        "product_name": product.name,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "units_sold": units_sold,
        "units_returned": units_returned,
        "return_rate": return_rate,
        "missing_data": missing_data,
        "confidence_level": _confidence_level(missing_data),
    }


def classify_return_reasons(
    db: Session,
    *,
    product_id: Optional[int],
    start_date: datetime,
    end_date: datetime,
) -> dict:
    query = db.query(ReturnOrderItem).join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id).filter(
        ReturnOrder.return_date >= start_date,
        ReturnOrder.return_date <= end_date,
    )
    if product_id is not None:
        query = query.filter(ReturnOrderItem.product_id == product_id)
    items = query.all()
    by_reason: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {
            "count": 0,
            "quantity": 0,
            "refund_cost": 0.0,
            "replacement_cost": 0.0,
        }
    )
    for item in items:
        bucket = by_reason[item.return_reason]
        bucket["count"] += 1
        bucket["quantity"] += item.quantity
        bucket["refund_cost"] += item.refund_amount or 0.0
        bucket["replacement_cost"] += item.replacement_cost or 0.0
    return {
        "product_id": product_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "reason_breakdown": [
            {
                "return_reason": reason,
                "count": int(values["count"]),
                "quantity": int(values["quantity"]),
                "refund_cost": float(values["refund_cost"]),
                "replacement_cost": float(values["replacement_cost"]),
            }
            for reason, values in sorted(by_reason.items(), key=lambda item: item[1]["quantity"], reverse=True)
        ],
    }


def detect_return_spike(
    db: Session,
    *,
    product_id: int,
    days: int = 7,
    threshold_ratio: float = 0.5,
) -> dict:
    if days <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="days must be greater than zero")
    end_date = datetime.utcnow()
    current_start = end_date - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)
    current = get_return_rate(db, product_id=product_id, start_date=current_start, end_date=end_date)
    previous = get_return_rate(db, product_id=product_id, start_date=previous_start, end_date=current_start)
    current_rate = current["return_rate"] or 0.0
    previous_rate = previous["return_rate"] or 0.0
    relative_change = None if previous_rate == 0 else (current_rate - previous_rate) / previous_rate
    is_spike = previous_rate > 0 and relative_change is not None and relative_change >= threshold_ratio
    return {
        "product_id": product_id,
        "current_period": current,
        "previous_period": previous,
        "threshold_ratio": threshold_ratio,
        "relative_change": relative_change,
        "is_spike": is_spike,
        "recommendation": {
            "action": "INVESTIGATE" if is_spike else "MONITOR",
            "reason": "Return rate increased materially against the prior period" if is_spike else "Return rate is within tolerance",
        },
    }


def link_returns_to_supplier(
    db: Session,
    *,
    product_id: Optional[int],
    start_date: datetime,
    end_date: datetime,
) -> dict:
    query = db.query(ReturnOrderItem).join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id).filter(
        ReturnOrder.return_date >= start_date,
        ReturnOrder.return_date <= end_date,
    )
    if product_id is not None:
        query = query.filter(ReturnOrderItem.product_id == product_id)
    items = query.all()
    linked: dict[str, dict[str, float | int | None]] = defaultdict(
        lambda: {
            "supplier_id": None,
            "supplier_name": None,
            "quantity": 0,
            "refund_cost": 0.0,
            "replacement_cost": 0.0,
        }
    )
    missing_data = []
    for item in items:
        key = str(item.supplier_id) if item.supplier_id is not None else "UNLINKED"
        bucket = linked[key]
        bucket["supplier_id"] = item.supplier_id
        bucket["supplier_name"] = item.supplier.name if item.supplier else None
        bucket["quantity"] += item.quantity
        bucket["refund_cost"] += item.refund_amount or 0.0
        bucket["replacement_cost"] += item.replacement_cost or 0.0
        if item.supplier_id is None:
            missing_data.append("supplier_not_linked_for_some_returns")
    return {
        "product_id": product_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "supplier_links": list(linked.values()),
        "missing_data": sorted(set(missing_data)),
        "confidence_level": _confidence_level(sorted(set(missing_data))),
    }


def link_returns_to_warehouse(
    db: Session,
    *,
    product_id: Optional[int],
    start_date: datetime,
    end_date: datetime,
) -> dict:
    query = db.query(ReturnOrderItem).join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id).filter(
        ReturnOrder.return_date >= start_date,
        ReturnOrder.return_date <= end_date,
    )
    if product_id is not None:
        query = query.filter(ReturnOrderItem.product_id == product_id)
    items = query.all()
    linked: dict[str, dict[str, float | int | None]] = defaultdict(
        lambda: {
            "warehouse_id": None,
            "warehouse_name": None,
            "quantity": 0,
            "refund_cost": 0.0,
            "replacement_cost": 0.0,
        }
    )
    missing_data = []
    for item in items:
        key = str(item.warehouse_id) if item.warehouse_id is not None else "UNLINKED"
        bucket = linked[key]
        bucket["warehouse_id"] = item.warehouse_id
        bucket["warehouse_name"] = item.warehouse.name if item.warehouse else None
        bucket["quantity"] += item.quantity
        bucket["refund_cost"] += item.refund_amount or 0.0
        bucket["replacement_cost"] += item.replacement_cost or 0.0
        if item.warehouse_id is None:
            missing_data.append("warehouse_not_linked_for_some_returns")
    return {
        "product_id": product_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "warehouse_links": list(linked.values()),
        "missing_data": sorted(set(missing_data)),
        "confidence_level": _confidence_level(sorted(set(missing_data))),
    }


def create_quality_investigation(
    db: Session,
    *,
    product_id: int,
    start_date: datetime,
    end_date: datetime,
    issue_summary: Optional[str] = None,
) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return_rate_data = get_return_rate(db, product_id=product_id, start_date=start_date, end_date=end_date)
    reason_data = classify_return_reasons(db, product_id=product_id, start_date=start_date, end_date=end_date)
    supplier_linkage = link_returns_to_supplier(db, product_id=product_id, start_date=start_date, end_date=end_date)
    warehouse_linkage = link_returns_to_warehouse(db, product_id=product_id, start_date=start_date, end_date=end_date)

    top_reason = reason_data["reason_breakdown"][0]["return_reason"] if reason_data["reason_breakdown"] else None
    top_supplier = supplier_linkage["supplier_links"][0]["supplier_id"] if supplier_linkage["supplier_links"] else None
    top_warehouse = warehouse_linkage["warehouse_links"][0]["warehouse_id"] if warehouse_linkage["warehouse_links"] else None
    missing_data = sorted(
        set(return_rate_data.get("missing_data", []))
        | set(supplier_linkage.get("missing_data", []))
        | set(warehouse_linkage.get("missing_data", []))
    )

    return {
        "investigation_type": "QUALITY_INVESTIGATION",
        "status": "OPEN_RECOMMENDATION",
        "product_id": product.id,
        "sku": product.sku,
        "product_name": product.name,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "issue_summary": issue_summary or "Investigate elevated return behavior and possible quality leakage.",
        "trigger_metrics": {
            "return_rate": return_rate_data["return_rate"],
            "units_returned": return_rate_data["units_returned"],
            "top_return_reason": top_reason,
        },
        "linked_supplier_id": top_supplier,
        "linked_warehouse_id": top_warehouse,
        "recommended_actions": [
            "Review recent inbound lots and supplier quality for the product.",
            "Inspect warehouse handling and packing workflow for repeat failure points.",
            "Audit top return reasons and customer support notes before escalating replacement policy changes.",
        ],
        "investigation_reference": f"qin-{product.id}-{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}",
        "mutated_tables": [],
        "missing_data": missing_data,
        "confidence_level": _confidence_level(missing_data),
    }


def get_high_return_products(db: Session, start_date: datetime, end_date: datetime, *, owner_id: int) -> list[dict]:
    rows = (
        db.query(
            ReturnOrderItem.product_id,
            func.coalesce(func.sum(ReturnOrderItem.quantity), 0).label("returned_quantity"),
            func.coalesce(func.sum(ReturnOrderItem.refund_amount), 0.0).label("refund_amount"),
            func.coalesce(func.sum(ReturnOrderItem.replacement_cost), 0.0).label("replacement_cost"),
        )
        .join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id)
        .filter(ReturnOrder.return_date >= start_date, ReturnOrder.return_date <= end_date, ReturnOrder.owner_id == owner_id)
        .group_by(ReturnOrderItem.product_id)
        .order_by(func.sum(ReturnOrderItem.quantity).desc())
        .all()
    )
    results = []
    for row in rows:
        product = db.query(Product).filter(Product.id == row.product_id, Product.owner_id == owner_id).first()
        rate_data = get_return_rate(db, product_id=row.product_id, start_date=start_date, end_date=end_date)
        results.append(
            {
                "product_id": row.product_id,
                "sku": product.sku if product else None,
                "product_name": product.name if product else None,
                "returned_quantity": int(row.returned_quantity or 0),
                "refund_amount": float(row.refund_amount or 0),
                "replacement_cost": float(row.replacement_cost or 0),
                "return_rate": rate_data["return_rate"],
                "missing_data": rate_data.get("missing_data", []),
            }
        )
    return results


def get_weekly_returns(
    db: Session,
    *,
    owner_id: int,
    product_id: Optional[int] = None,
    weeks: int = 8,
) -> dict:
    if weeks <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="weeks must be greater than zero")
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=weeks * 7)
    query = db.query(ReturnOrderItem).join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id).filter(
        ReturnOrder.return_date >= start_date,
        ReturnOrder.return_date <= end_date,
        ReturnOrder.owner_id == owner_id,
    )
    if product_id is not None:
        query = query.filter(ReturnOrderItem.product_id == product_id)
    items = query.all()
    buckets: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {
            "returned_quantity": 0,
            "refund_cost": 0.0,
            "replacement_cost": 0.0,
        }
    )
    for item in items:
        bucket = f"{item.return_order.return_date.isocalendar().year}-W{item.return_order.return_date.isocalendar().week:02d}"
        buckets[bucket]["returned_quantity"] += item.quantity
        buckets[bucket]["refund_cost"] += item.refund_amount or 0.0
        buckets[bucket]["replacement_cost"] += item.replacement_cost or 0.0
    product = db.query(Product).filter(Product.id == product_id, Product.owner_id == owner_id).first() if product_id is not None else None
    return {
        "product_id": product_id,
        "sku": product.sku if product else None,
        "weeks": [
            {
                "week": week,
                "returned_quantity": int(values["returned_quantity"]),
                "refund_cost": float(values["refund_cost"]),
                "replacement_cost": float(values["replacement_cost"]),
            }
            for week, values in sorted(buckets.items())
        ],
    }


def get_profit_leakage_report(db: Session, start_date: datetime, end_date: datetime, *, owner_id: int) -> dict:
    by_product = []
    total_refunds = 0.0
    total_replacements = 0.0
    for row in get_high_return_products(db, start_date, end_date, owner_id=owner_id):
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


def get_return_order(db: Session, return_order_id: int, *, owner_id: int) -> ReturnOrder:
    return _load_return_order(db, return_order_id, owner_id=owner_id)


def list_return_orders(db: Session, *, owner_id: int) -> list[ReturnOrder]:
    return db.query(ReturnOrder).options(joinedload(ReturnOrder.items)).filter(ReturnOrder.owner_id == owner_id).order_by(ReturnOrder.created_at.desc()).all()
