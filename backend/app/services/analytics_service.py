from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import Product, Sale
from app.services.stock_ledger_service import get_available


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
