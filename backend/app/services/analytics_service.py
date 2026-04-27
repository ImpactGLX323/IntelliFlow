from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from math import fabs
from typing import Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import Product, ReturnOrder, ReturnOrderItem, Sale
from app.services import returns_service, sales_service
from app.services.stock_ledger_service import get_available


def _parse_channel_from_sale(sale: Sale) -> tuple[str, list[str]]:
    # Channel is not modeled yet, so analytics expose the limitation explicitly.
    return "UNSPECIFIED", ["channel_not_modeled"]


def _safe_growth(current_value: float, previous_value: float) -> Optional[float]:
    if previous_value == 0:
        return None
    return (current_value - previous_value) / previous_value


def _product_return_metrics(
    db: Session,
    *,
    product_id: int,
    start_date: datetime,
    end_date: datetime,
    units_sold: int,
) -> dict:
    returned_quantity = (
        db.query(func.coalesce(func.sum(ReturnOrderItem.quantity), 0))
        .join(ReturnOrder, ReturnOrder.id == ReturnOrderItem.return_order_id)
        .filter(
            ReturnOrderItem.product_id == product_id,
            ReturnOrder.return_date >= start_date,
            ReturnOrder.return_date <= end_date,
        )
        .scalar()
        or 0
    )
    return_rate = None if units_sold <= 0 else float(returned_quantity) / float(units_sold)
    return {
        "returned_units": int(returned_quantity),
        "return_rate": return_rate,
    }


def _product_discount_metrics() -> dict:
    return {
        "discount_impact": None,
        "missing_data": ["discount_not_modeled"],
    }


def get_inventory_risk_snapshot(*, db: Session) -> list[dict]:
    products = db.query(Product).all()
    snapshot: list[dict] = []
    for product in products:
        available = get_available(db, product.id)
        snapshot.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "available_stock": available,
                "min_threshold": product.min_stock_threshold,
                "is_below_threshold": available <= product.min_stock_threshold,
            }
        )
    return snapshot


def get_sales_summary(*, db: Session, days: int = 30, limit: int = 10) -> list[dict]:
    start_date = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            Sale.product_id,
            Product.name,
            func.sum(Sale.quantity).label("total_quantity"),
            func.sum(Sale.total_amount).label("total_revenue"),
            func.count(Sale.id).label("total_sales"),
        )
        .join(Product)
        .filter(Sale.sale_date >= start_date)
        .group_by(Sale.product_id, Product.name)
        .order_by(desc("total_revenue"))
        .limit(limit)
        .all()
    )
    return [
        {
            "product_id": row.product_id,
            "product_name": row.name,
            "total_quantity": int(row.total_quantity or 0),
            "total_revenue": float(row.total_revenue or 0),
            "total_sales": int(row.total_sales or 0),
        }
        for row in rows
    ]


def calculate_sales_velocity(
    *,
    db: Session,
    product_id: int,
    days: int = 30,
) -> dict:
    if days <= 0:
        raise ValueError("days must be greater than zero")
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    previous_start = start_date - timedelta(days=days)

    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise ValueError("product not found")

    current_sales = sales_service.list_sales(db, product_id=product_id, start_date=start_date, end_date=end_date)
    previous_sales = sales_service.list_sales(db, product_id=product_id, start_date=previous_start, end_date=start_date)

    current_units = sum(sale.quantity for sale in current_sales)
    previous_units = sum(sale.quantity for sale in previous_sales)
    current_velocity = current_units / days
    previous_velocity = previous_units / days
    velocity_change = _safe_growth(current_velocity, previous_velocity)

    return {
        "product_id": product.id,
        "sku": product.sku,
        "product_name": product.name,
        "lookback_days": days,
        "units_sold_current_period": current_units,
        "units_sold_previous_period": previous_units,
        "sales_velocity": current_velocity,
        "previous_sales_velocity": previous_velocity,
        "sales_velocity_change": velocity_change,
    }


def calculate_product_margin(
    *,
    db: Session,
    product_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict:
    end = end_date or datetime.utcnow()
    start = start_date or (end - timedelta(days=30))
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise ValueError("product not found")

    sales = sales_service.list_sales(db, product_id=product_id, start_date=start, end_date=end)
    units_sold = sum(sale.quantity for sale in sales)
    revenue = float(sum(sale.total_amount for sale in sales))
    cost_of_goods = float(sum((product.cost or 0.0) * sale.quantity for sale in sales))
    gross_margin_value = revenue - cost_of_goods
    gross_margin_rate = None if revenue == 0 else gross_margin_value / revenue
    return_adjusted = returns_service.calculate_return_adjusted_margin(db, product_id, start, end)

    result = {
        "product_id": product.id,
        "sku": product.sku,
        "product_name": product.name,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "units_sold": units_sold,
        "revenue": revenue,
        "cost_of_goods_sold": cost_of_goods,
        "gross_margin": gross_margin_value,
        "gross_margin_rate": gross_margin_rate,
        "return_adjusted_margin": return_adjusted["return_adjusted_margin"],
        "refund_amount": return_adjusted["refund_amount"],
        "replacement_cost": return_adjusted["replacement_cost"],
        "missing_data": list(return_adjusted.get("missing_data", [])),
    }
    result["missing_data"].append("discount_not_modeled")
    return result


def get_best_selling_products(
    *,
    db: Session,
    days: int = 30,
    limit: int = 10,
) -> list[dict]:
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    rows = (
        db.query(Product)
        .order_by(Product.name.asc())
        .all()
    )
    ranked: list[dict] = []
    for product in rows:
        sales = sales_service.list_sales(db, product_id=product.id, start_date=start_date, end_date=end_date)
        if not sales:
            continue
        units_sold = sum(sale.quantity for sale in sales)
        revenue = float(sum(sale.total_amount for sale in sales))
        gross_margin = float(sum((sale.unit_price - (product.cost or 0.0)) * sale.quantity for sale in sales))
        availability = get_available(db, product.id)
        returns_data = _product_return_metrics(
            db,
            product_id=product.id,
            start_date=start_date,
            end_date=end_date,
            units_sold=units_sold,
        )
        velocity_data = calculate_sales_velocity(db=db, product_id=product.id, days=days)

        channels: dict[str, dict[str, float]] = defaultdict(lambda: {"units_sold": 0, "revenue": 0.0})
        missing_data: set[str] = set()
        for sale in sales:
            channel, channel_missing = _parse_channel_from_sale(sale)
            missing_data.update(channel_missing)
            channels[channel]["units_sold"] += sale.quantity
            channels[channel]["revenue"] += sale.total_amount

        discount_metrics = _product_discount_metrics()
        missing_data.update(discount_metrics["missing_data"])
        score = units_sold * 1.0 + gross_margin * 0.1 + revenue * 0.01
        ranked.append(
            {
                "product_id": product.id,
                "sku": product.sku,
                "product_name": product.name,
                "units_sold": units_sold,
                "revenue": revenue,
                "gross_margin": gross_margin,
                "return_rate": returns_data["return_rate"],
                "returned_units": returns_data["returned_units"],
                "stock_availability": availability,
                "discount_impact": discount_metrics["discount_impact"],
                "sales_velocity": velocity_data["sales_velocity"],
                "sales_velocity_change": velocity_data["sales_velocity_change"],
                "channel_performance": [
                    {
                        "channel": channel,
                        "units_sold": int(values["units_sold"]),
                        "revenue": float(values["revenue"]),
                    }
                    for channel, values in channels.items()
                ],
                "ranking_score": score,
                "missing_data": sorted(missing_data),
            }
        )
    ranked.sort(key=lambda item: (item["ranking_score"], item["units_sold"], item["revenue"]), reverse=True)
    return ranked[:limit]


def detect_sales_anomaly(
    *,
    db: Session,
    product_id: int,
    days: int = 7,
    threshold_ratio: float = 0.5,
) -> dict:
    if days <= 0:
        raise ValueError("days must be greater than zero")
    velocity = calculate_sales_velocity(db=db, product_id=product_id, days=days)
    current_velocity = velocity["sales_velocity"]
    previous_velocity = velocity["previous_sales_velocity"]
    delta = current_velocity - previous_velocity
    baseline = previous_velocity if previous_velocity != 0 else 1.0
    relative_change = delta / baseline if baseline else None
    is_anomaly = previous_velocity > 0 and fabs(relative_change) >= threshold_ratio
    anomaly_type = "NONE"
    if is_anomaly and delta > 0:
        anomaly_type = "SPIKE"
    elif is_anomaly and delta < 0:
        anomaly_type = "DROP"

    return {
        **velocity,
        "threshold_ratio": threshold_ratio,
        "relative_change": relative_change,
        "is_anomaly": is_anomaly,
        "anomaly_type": anomaly_type,
        "recommendation": {
            "action": "INVESTIGATE" if is_anomaly else "MONITOR",
            "reason": "Sales velocity changed materially against the prior comparison window" if is_anomaly else "Velocity change is within tolerance",
        },
    }


def compare_sales_by_channel(
    *,
    db: Session,
    days: int = 30,
    channel: Optional[str] = None,
) -> dict:
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    sales = sales_service.list_sales(db, start_date=start_date, end_date=end_date)

    performance: dict[str, dict[str, float | int | list[str]]] = defaultdict(
        lambda: {
            "units_sold": 0,
            "revenue": 0.0,
            "gross_margin": 0.0,
            "orders": 0,
            "missing_data": [],
        }
    )

    for sale in sales:
        product = db.query(Product).filter(Product.id == sale.product_id).first()
        channel_name, missing = _parse_channel_from_sale(sale)
        if channel is not None and channel_name != channel:
            continue
        performance[channel_name]["units_sold"] += sale.quantity
        performance[channel_name]["revenue"] += sale.total_amount
        performance[channel_name]["gross_margin"] += (sale.unit_price - ((product.cost if product else 0.0) or 0.0)) * sale.quantity
        performance[channel_name]["orders"] += 1
        merged_missing = set(performance[channel_name]["missing_data"])
        merged_missing.update(missing)
        merged_missing.add("discount_not_modeled")
        performance[channel_name]["missing_data"] = sorted(merged_missing)

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "channels": [
            {
                "channel": name,
                "units_sold": int(values["units_sold"]),
                "revenue": float(values["revenue"]),
                "gross_margin": float(values["gross_margin"]),
                "orders": int(values["orders"]),
                "missing_data": list(values["missing_data"]),
            }
            for name, values in performance.items()
        ],
        "missing_data": ["channel_not_modeled", "discount_not_modeled"],
    }


def get_weekly_sales(
    *,
    db: Session,
    sku: Optional[str] = None,
    weeks: int = 8,
) -> dict:
    if weeks <= 0:
        raise ValueError("weeks must be greater than zero")
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=weeks * 7)
    product = sales_service.get_product_by_sku(db, sku) if sku else None
    sales = sales_service.list_sales(db, product_id=product.id if product else None, start_date=start_date, end_date=end_date)

    buckets: dict[str, dict[str, float | int]] = defaultdict(lambda: {"units_sold": 0, "revenue": 0.0, "gross_margin": 0.0})
    for sale in sales:
        bucket = f"{sale.sale_date.isocalendar().year}-W{sale.sale_date.isocalendar().week:02d}"
        product_row = product if product is not None else db.query(Product).filter(Product.id == sale.product_id).first()
        cost = (product_row.cost if product_row else 0.0) or 0.0
        buckets[bucket]["units_sold"] += sale.quantity
        buckets[bucket]["revenue"] += sale.total_amount
        buckets[bucket]["gross_margin"] += (sale.unit_price - cost) * sale.quantity

    return {
        "sku": product.sku if product else None,
        "product_id": product.id if product else None,
        "weeks": [
            {
                "week": week,
                "units_sold": int(values["units_sold"]),
                "revenue": float(values["revenue"]),
                "gross_margin": float(values["gross_margin"]),
            }
            for week, values in sorted(buckets.items())
        ],
        "missing_data": ["channel_not_modeled", "discount_not_modeled"],
    }


def get_top_products(
    *,
    db: Session,
    days: int = 30,
    limit: int = 10,
) -> dict:
    return {
        "days": days,
        "products": get_best_selling_products(db=db, days=days, limit=limit),
    }


def get_channel_performance_resource(
    *,
    db: Session,
    channel: str,
    days: int = 30,
) -> dict:
    return compare_sales_by_channel(db=db, days=days, channel=channel)
