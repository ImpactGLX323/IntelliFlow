from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models import (
    InventoryTransaction,
    Product,
    Sale,
    StockReservation,
    StockTransfer,
    Warehouse,
)

DEFAULT_WAREHOUSE_CODE = "MAIN"
DEFAULT_WAREHOUSE_NAME = "Main Warehouse"

INVENTORY_TRANSACTION_TYPES = {
    "PURCHASE_RECEIVED",
    "SALE_RESERVED",
    "SALE_SHIPPED",
    "RESERVATION_RELEASED",
    "TRANSFER_OUT",
    "TRANSFER_IN",
    "RETURN_RECEIVED",
    "ADJUSTMENT_POSITIVE",
    "ADJUSTMENT_NEGATIVE",
    "DAMAGED",
    "QUARANTINED",
    "MANUFACTURED",
    "CONSUMED_IN_PRODUCTION",
}

INVENTORY_DIRECTIONS = {"IN", "OUT", "RESERVE", "RELEASE", "NEUTRAL"}
RESERVATION_ACTIVE_STATUSES = {"ACTIVE"}
RESERVATION_OPEN_STATUSES = {"ACTIVE", "RELEASED", "CONSUMED", "CANCELLED"}
TRANSFER_STATUSES = {"DRAFT", "IN_TRANSIT", "RECEIVED", "CANCELLED"}


def _get_product_by_sku(db: Session, sku: str) -> Product:
    product = db.query(Product).filter(Product.sku == sku).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _apply_inventory_filters(query, product_id: int, warehouse_id: Optional[int] = None):
    query = query.filter(InventoryTransaction.product_id == product_id)
    if warehouse_id is not None:
        query = query.filter(InventoryTransaction.warehouse_id == warehouse_id)
    return query


def get_default_warehouse(db: Session) -> Warehouse:
    warehouse = db.query(Warehouse).filter(Warehouse.code == DEFAULT_WAREHOUSE_CODE).first()
    if warehouse is None:
        warehouse = Warehouse(name=DEFAULT_WAREHOUSE_NAME, code=DEFAULT_WAREHOUSE_CODE)
        db.add(warehouse)
        db.commit()
        db.refresh(warehouse)
    return warehouse


def _validate_product_and_warehouse(
    db: Session,
    product_id: int,
    warehouse_id: int,
) -> tuple[Product, Warehouse]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if warehouse is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    return product, warehouse


def get_on_hand(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> int:
    # Ledger is the source of truth: physical stock is derived only from IN and OUT movements.
    result = _apply_inventory_filters(
        db.query(
            func.coalesce(
                func.sum(
                    case(
                        (InventoryTransaction.direction == "IN", InventoryTransaction.quantity),
                        (InventoryTransaction.direction == "OUT", -InventoryTransaction.quantity),
                        else_=0,
                    )
                ),
                0,
            )
        ),
        product_id,
        warehouse_id,
    ).scalar()
    return int(result or 0)


def get_reserved(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> int:
    query = db.query(func.coalesce(func.sum(StockReservation.quantity), 0)).filter(
        StockReservation.product_id == product_id,
        StockReservation.status == "ACTIVE",
    )
    if warehouse_id is not None:
        query = query.filter(StockReservation.warehouse_id == warehouse_id)
    return int(query.scalar() or 0)


def _get_transaction_type_quantity(
    db: Session,
    product_id: int,
    transaction_type: str,
    warehouse_id: Optional[int] = None,
) -> int:
    result = _apply_inventory_filters(
        db.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).filter(
            InventoryTransaction.transaction_type == transaction_type
        ),
        product_id,
        warehouse_id,
    ).scalar()
    return int(result or 0)


def get_damaged(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> int:
    return _get_transaction_type_quantity(db, product_id, "DAMAGED", warehouse_id)


def get_quarantined(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> int:
    return _get_transaction_type_quantity(db, product_id, "QUARANTINED", warehouse_id)


def get_available(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> int:
    on_hand = get_on_hand(db, product_id, warehouse_id)
    reserved = get_reserved(db, product_id, warehouse_id)
    damaged = get_damaged(db, product_id, warehouse_id)
    quarantined = get_quarantined(db, product_id, warehouse_id)
    return on_hand - reserved - damaged - quarantined


def get_stock_position(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> dict:
    on_hand = get_on_hand(db, product_id, warehouse_id)
    reserved = get_reserved(db, product_id, warehouse_id)
    damaged = get_damaged(db, product_id, warehouse_id)
    quarantined = get_quarantined(db, product_id, warehouse_id)
    return {
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "on_hand": on_hand,
        "reserved": reserved,
        "available": on_hand - reserved - damaged - quarantined,
        "damaged": damaged,
        "quarantined": quarantined,
    }


def get_stock_position_by_sku(db: Session, sku: str, warehouse_id: Optional[int] = None) -> dict:
    product = _get_product_by_sku(db, sku)
    stock_position = get_stock_position(db, product.id, warehouse_id)
    stock_position["sku"] = product.sku
    stock_position["product_name"] = product.name
    return stock_position


def get_available_to_promise(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> dict:
    stock_position = get_stock_position(db, product_id, warehouse_id)
    stock_position["available_to_promise"] = stock_position["available"]
    return stock_position


def get_low_stock_items(db: Session, warehouse_id: Optional[int] = None) -> list[dict]:
    low_stock_items: list[dict] = []
    for product in db.query(Product).order_by(Product.name.asc()).all():
        stock_position = get_stock_position(db, product.id, warehouse_id)
        threshold = product.min_stock_threshold or 0
        if stock_position["available"] <= threshold:
            low_stock_items.append(
                {
                    **stock_position,
                    "sku": product.sku,
                    "product_name": product.name,
                    "min_stock_threshold": threshold,
                    "recommendation": {
                        "action": "REPLENISH",
                        "reason": "Available stock is at or below minimum threshold",
                    },
                }
            )
    return low_stock_items


def get_stock_movements_by_sku(
    db: Session,
    sku: str,
    warehouse_id: Optional[int] = None,
    limit: int = 100,
) -> dict:
    product = _get_product_by_sku(db, sku)
    query = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == product.id)
    if warehouse_id is not None:
        query = query.filter(InventoryTransaction.warehouse_id == warehouse_id)
    movements = (
        query.order_by(InventoryTransaction.created_at.desc(), InventoryTransaction.id.desc())
        .limit(limit)
        .all()
    )
    stock_position = get_stock_position(db, product.id, warehouse_id)
    return {
        **stock_position,
        "sku": product.sku,
        "product_name": product.name,
        "movements": [
            {
                "id": movement.id,
                "warehouse_id": movement.warehouse_id,
                "transaction_type": movement.transaction_type,
                "direction": movement.direction,
                "quantity": movement.quantity,
                "reference_type": movement.reference_type,
                "reference_id": movement.reference_id,
                "reason": movement.reason,
                "notes": movement.notes,
                "created_at": movement.created_at.isoformat() if movement.created_at else None,
            }
            for movement in movements
        ],
    }


def calculate_days_of_cover(
    db: Session,
    product_id: int,
    warehouse_id: Optional[int] = None,
    lookback_days: int = 30,
) -> dict:
    if lookback_days <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="lookback_days must be greater than zero")
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    start_date = datetime.utcnow() - timedelta(days=lookback_days)
    recent_sales_quantity = (
        db.query(func.coalesce(func.sum(Sale.quantity), 0))
        .filter(Sale.product_id == product_id, Sale.sale_date >= start_date)
        .scalar()
        or 0
    )
    average_daily_demand = float(recent_sales_quantity) / lookback_days if lookback_days else 0.0
    stock_position = get_stock_position(db, product_id, warehouse_id)
    days_of_cover = None if average_daily_demand <= 0 else stock_position["available"] / average_daily_demand
    recommendation = {
        "action": "REVIEW_REPLENISHMENT" if days_of_cover is not None and days_of_cover < 14 else "MONITOR",
        "reason": "Days of cover is below two weeks" if days_of_cover is not None and days_of_cover < 14 else "Coverage is within acceptable range or demand is insufficient to calculate",
    }
    return {
        **stock_position,
        "sku": product.sku,
        "product_name": product.name,
        "lookback_days": lookback_days,
        "recent_sales_quantity": int(recent_sales_quantity),
        "average_daily_demand": average_daily_demand,
        "days_of_cover": days_of_cover,
        "recommendation": recommendation,
    }


def recommend_stock_transfer(db: Session, product_id: int, target_warehouse_id: int) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    target_warehouse = db.query(Warehouse).filter(Warehouse.id == target_warehouse_id).first()
    if target_warehouse is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    target_position = get_stock_position(db, product_id, target_warehouse_id)
    threshold = product.min_stock_threshold or 0
    deficit = max(threshold - target_position["available"], 0)

    candidate_sources: list[dict] = []
    for warehouse in db.query(Warehouse).filter(Warehouse.id != target_warehouse_id, Warehouse.is_active.is_(True)).all():
        source_position = get_stock_position(db, product_id, warehouse.id)
        excess = max(source_position["available"] - threshold, 0)
        if excess <= 0:
            continue
        recommended_quantity = min(excess, deficit) if deficit > 0 else excess
        candidate_sources.append(
            {
                **source_position,
                "warehouse_name": warehouse.name,
                "transferable_quantity": excess,
                "recommended_quantity": recommended_quantity,
            }
        )

    candidate_sources.sort(key=lambda item: item["recommended_quantity"], reverse=True)
    best_source = candidate_sources[0] if candidate_sources else None
    return {
        "product_id": product.id,
        "sku": product.sku,
        "target_warehouse_id": target_warehouse_id,
        "target_position": target_position,
        "recommendation": {
            "action": "TRANSFER" if best_source and deficit > 0 else "NONE",
            "reason": "Target warehouse is below threshold" if deficit > 0 else "Target warehouse is sufficiently stocked",
            "recommended_source_warehouse_id": best_source["warehouse_id"] if best_source else None,
            "recommended_quantity": best_source["recommended_quantity"] if best_source else 0,
            "target_deficit": deficit,
            "candidate_sources": candidate_sources,
        },
    }


def create_stock_adjustment_request(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    quantity: int,
    adjustment_type: str,
    reason: str,
    requested_by: Optional[int] = None,
    notes: Optional[str] = None,
) -> dict:
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
    _validate_product_and_warehouse(db, product_id, warehouse_id)
    if adjustment_type not in {"POSITIVE", "NEGATIVE"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment_type")

    position = get_stock_position(db, product_id, warehouse_id)
    return {
        "request_type": "STOCK_ADJUSTMENT",
        "status": "PENDING_REVIEW",
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "on_hand": position["on_hand"],
        "reserved": position["reserved"],
        "available": position["available"],
        "damaged": position["damaged"],
        "quarantined": position["quarantined"],
        "adjustment_type": adjustment_type,
        "quantity": quantity,
        "reason": reason,
        "notes": notes,
        "requested_by": requested_by,
        "request_reference": f"adjreq-{product_id}-{warehouse_id}-{quantity}-{adjustment_type.lower()}",
        "mutated_stock": False,
    }


def create_transfer_request(
    db: Session,
    *,
    product_id: int,
    from_warehouse_id: int,
    to_warehouse_id: int,
    quantity: int,
    requested_by: Optional[int] = None,
    notes: Optional[str] = None,
) -> dict:
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
    _validate_product_and_warehouse(db, product_id, from_warehouse_id)
    _validate_product_and_warehouse(db, product_id, to_warehouse_id)
    if from_warehouse_id == to_warehouse_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source and destination warehouses must differ")

    source_position = get_stock_position(db, product_id, from_warehouse_id)
    destination_position = get_stock_position(db, product_id, to_warehouse_id)
    if source_position["available"] < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient available stock in source warehouse. Available: {source_position['available']}, Requested: {quantity}",
        )

    return {
        "request_type": "STOCK_TRANSFER",
        "status": "PENDING_REVIEW",
        "product_id": product_id,
        "from_warehouse_id": from_warehouse_id,
        "to_warehouse_id": to_warehouse_id,
        "quantity": quantity,
        "requested_by": requested_by,
        "notes": notes,
        "source_position": source_position,
        "destination_position": destination_position,
        "request_reference": f"xferreq-{product_id}-{from_warehouse_id}-{to_warehouse_id}-{quantity}",
        "mutated_stock": False,
    }


def sync_product_current_stock(
    db: Session,
    product_id: int,
    *,
    commit: bool = False,
) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.current_stock = get_available(db, product_id)
    db.add(product)
    if commit:
        db.commit()
        db.refresh(product)
    return product


def create_inventory_transaction(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    transaction_type: str,
    quantity: int,
    direction: str,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    reason: Optional[str] = None,
    notes: Optional[str] = None,
    created_by: Optional[int] = None,
    approved_by: Optional[int] = None,
    allow_negative: bool = False,
    commit: bool = True,
) -> InventoryTransaction:
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
    if transaction_type not in INVENTORY_TRANSACTION_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported transaction type")
    if direction not in INVENTORY_DIRECTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported inventory direction")

    product, warehouse = _validate_product_and_warehouse(db, product_id, warehouse_id)

    if direction == "OUT" and not allow_negative:
        available = get_available(db, product_id, warehouse_id)
        if available < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient available stock. Available: {available}, Requested: {quantity}",
            )

    transaction = InventoryTransaction(
        product_id=product.id,
        warehouse_id=warehouse.id,
        transaction_type=transaction_type,
        quantity=quantity,
        direction=direction,
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id is not None else None,
        reason=reason,
        notes=notes,
        created_by=created_by,
        approved_by=approved_by,
    )

    try:
        db.add(transaction)
        db.flush()
        sync_product_current_stock(db, product_id)
        if commit:
            db.commit()
            db.refresh(transaction)
        return transaction
    except Exception:
        db.rollback()
        raise


def reserve_stock(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    quantity: int,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    created_by: Optional[int] = None,
    commit: bool = True,
) -> StockReservation:
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")

    _validate_product_and_warehouse(db, product_id, warehouse_id)
    available = get_available(db, product_id, warehouse_id)
    if available < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient available stock. Available: {available}, Requested: {quantity}",
        )

    reservation = StockReservation(
        product_id=product_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
        status="ACTIVE",
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id is not None else None,
    )

    try:
        db.add(reservation)
        db.flush()
        create_inventory_transaction(
            db,
            product_id=product_id,
            warehouse_id=warehouse_id,
            transaction_type="SALE_RESERVED",
            quantity=quantity,
            direction="RESERVE",
            reference_type=reference_type,
            reference_id=reference_id,
            reason="Stock reserved",
            created_by=created_by,
            commit=False,
        )
        sync_product_current_stock(db, product_id)
        if commit:
            db.commit()
            db.refresh(reservation)
        else:
            db.flush()
        return reservation
    except Exception:
        db.rollback()
        raise


def release_reservation(db: Session, reservation_id: int, *, created_by: Optional[int] = None) -> StockReservation:
    reservation = db.query(StockReservation).filter(StockReservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation is not active")

    try:
        reservation.status = "RELEASED"
        db.add(reservation)
        create_inventory_transaction(
            db,
            product_id=reservation.product_id,
            warehouse_id=reservation.warehouse_id,
            transaction_type="RESERVATION_RELEASED",
            quantity=reservation.quantity,
            direction="RELEASE",
            reference_type=reservation.reference_type,
            reference_id=reservation.reference_id,
            reason="Reservation released",
            created_by=created_by,
            commit=False,
        )
        sync_product_current_stock(db, reservation.product_id)
        db.commit()
        db.refresh(reservation)
        return reservation
    except Exception:
        db.rollback()
        raise


def consume_reservation(
    db: Session,
    reservation_id: int,
    *,
    quantity: Optional[int] = None,
    created_by: Optional[int] = None,
    commit: bool = True,
) -> StockReservation:
    reservation = db.query(StockReservation).filter(StockReservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation is not active")
    consume_quantity = reservation.quantity if quantity is None else quantity
    if consume_quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
    if consume_quantity > reservation.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consumption quantity exceeds reserved quantity",
        )

    try:
        reservation.quantity -= consume_quantity
        reservation.status = "CONSUMED" if reservation.quantity == 0 else "ACTIVE"
        db.add(reservation)
        create_inventory_transaction(
            db,
            product_id=reservation.product_id,
            warehouse_id=reservation.warehouse_id,
            transaction_type="SALE_SHIPPED",
            quantity=consume_quantity,
            direction="OUT",
            reference_type=reservation.reference_type,
            reference_id=reservation.reference_id,
            reason="Reserved stock consumed by shipment",
            created_by=created_by,
            commit=False,
        )
        sync_product_current_stock(db, reservation.product_id)
        if commit:
            db.commit()
            db.refresh(reservation)
        else:
            db.flush()
        return reservation
    except Exception:
        db.rollback()
        raise


def receive_purchase(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    quantity: int,
    reference_id: Optional[str] = None,
    created_by: Optional[int] = None,
    commit: bool = True,
) -> InventoryTransaction:
    return create_inventory_transaction(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type="PURCHASE_RECEIVED",
        quantity=quantity,
        direction="IN",
        reference_type="PURCHASE",
        reference_id=reference_id,
        reason="Purchase received",
        created_by=created_by,
        commit=commit,
    )


def adjust_stock(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    quantity: int,
    adjustment_type: str,
    reason: str,
    notes: Optional[str] = None,
    created_by: Optional[int] = None,
    commit: bool = True,
) -> InventoryTransaction:
    if adjustment_type not in {"POSITIVE", "NEGATIVE"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment_type")

    transaction_type = "ADJUSTMENT_POSITIVE" if adjustment_type == "POSITIVE" else "ADJUSTMENT_NEGATIVE"
    direction = "IN" if adjustment_type == "POSITIVE" else "OUT"

    return create_inventory_transaction(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type=transaction_type,
        quantity=quantity,
        direction=direction,
        reason=reason,
        notes=notes,
        created_by=created_by,
        commit=commit,
    )


def transfer_stock(
    db: Session,
    *,
    product_id: int,
    from_warehouse_id: int,
    to_warehouse_id: int,
    quantity: int,
    notes: Optional[str] = None,
    created_by: Optional[int] = None,
) -> StockTransfer:
    if from_warehouse_id == to_warehouse_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transfer warehouses must be different")
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")

    _validate_product_and_warehouse(db, product_id, from_warehouse_id)
    _validate_product_and_warehouse(db, product_id, to_warehouse_id)

    available = get_available(db, product_id, from_warehouse_id)
    if available < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient available stock in source warehouse. Available: {available}, Requested: {quantity}",
        )

    transfer = StockTransfer(
        product_id=product_id,
        from_warehouse_id=from_warehouse_id,
        to_warehouse_id=to_warehouse_id,
        quantity=quantity,
        status="RECEIVED",
        notes=notes,
    )

    try:
        db.add(transfer)
        db.flush()
        reference_id = str(transfer.id)
        create_inventory_transaction(
            db,
            product_id=product_id,
            warehouse_id=from_warehouse_id,
            transaction_type="TRANSFER_OUT",
            quantity=quantity,
            direction="OUT",
            reference_type="STOCK_TRANSFER",
            reference_id=reference_id,
            reason="Stock transferred out",
            notes=notes,
            created_by=created_by,
            commit=False,
        )
        create_inventory_transaction(
            db,
            product_id=product_id,
            warehouse_id=to_warehouse_id,
            transaction_type="TRANSFER_IN",
            quantity=quantity,
            direction="IN",
            reference_type="STOCK_TRANSFER",
            reference_id=reference_id,
            reason="Stock transferred in",
            notes=notes,
            created_by=created_by,
            commit=False,
        )
        sync_product_current_stock(db, product_id)
        db.commit()
        db.refresh(transfer)
        return transfer
    except Exception:
        db.rollback()
        raise


def seed_product_stock_from_legacy_current_stock(
    db: Session,
    *,
    product: Product,
    quantity: int,
    created_by: Optional[int] = None,
) -> Optional[InventoryTransaction]:
    if quantity <= 0:
        sync_product_current_stock(db, product.id, commit=True)
        return None

    warehouse = get_default_warehouse(db)
    return create_inventory_transaction(
        db,
        product_id=product.id,
        warehouse_id=warehouse.id,
        transaction_type="ADJUSTMENT_POSITIVE",
        quantity=quantity,
        direction="IN",
        reference_type="LEGACY_PRODUCT_CREATE",
        reference_id=str(product.id),
        reason="Seeded legacy current_stock into ledger",
        created_by=created_by,
    )


def record_damaged_stock(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    quantity: int,
    reason: str,
    created_by: Optional[int] = None,
    commit: bool = True,
) -> InventoryTransaction:
    return create_inventory_transaction(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type="DAMAGED",
        quantity=quantity,
        direction="NEUTRAL",
        reason=reason,
        created_by=created_by,
        commit=commit,
    )


def record_quarantined_stock(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    quantity: int,
    reason: str,
    created_by: Optional[int] = None,
    commit: bool = True,
) -> InventoryTransaction:
    return create_inventory_transaction(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        transaction_type="QUARANTINED",
        quantity=quantity,
        direction="NEUTRAL",
        reason=reason,
        created_by=created_by,
        commit=commit,
    )
