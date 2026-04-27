from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Product, ReorderPoint, Supplier
from app.services.stock_ledger_service import get_available


def set_reorder_point(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    minimum_quantity: int,
    reorder_quantity: int,
) -> ReorderPoint:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    reorder_point = (
        db.query(ReorderPoint)
        .filter(ReorderPoint.product_id == product_id, ReorderPoint.warehouse_id == warehouse_id)
        .first()
    )
    if reorder_point is None:
        reorder_point = ReorderPoint(
            product_id=product_id,
            warehouse_id=warehouse_id,
            minimum_quantity=minimum_quantity,
            reorder_quantity=reorder_quantity,
        )
        db.add(reorder_point)
    else:
        reorder_point.minimum_quantity = minimum_quantity
        reorder_point.reorder_quantity = reorder_quantity
        db.add(reorder_point)

    db.commit()
    db.refresh(reorder_point)
    return reorder_point


def get_reorder_suggestions(db: Session) -> list[dict]:
    suggestions: list[dict] = []
    reorder_points = db.query(ReorderPoint).all()
    for reorder_point in reorder_points:
        available = get_available(db, reorder_point.product_id, reorder_point.warehouse_id)
        if available > reorder_point.minimum_quantity:
            continue
        product = db.query(Product).filter(Product.id == reorder_point.product_id).first()
        supplier = None
        if product and product.supplier:
            supplier = db.query(Supplier).filter(Supplier.name == product.supplier).first()
        suggestions.append(
            {
                "product_id": reorder_point.product_id,
                "warehouse_id": reorder_point.warehouse_id,
                "available_quantity": available,
                "minimum_quantity": reorder_point.minimum_quantity,
                "suggested_reorder_quantity": reorder_point.reorder_quantity,
                "supplier_name": supplier.name if supplier else product.supplier if product else None,
                "supplier_lead_time_days": supplier.lead_time_days if supplier else None,
            }
        )
    return suggestions
