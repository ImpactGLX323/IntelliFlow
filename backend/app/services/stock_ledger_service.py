from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models import (
    InventoryTransaction,
    Product,
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
        db.commit()
        db.refresh(reservation)
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


def consume_reservation(db: Session, reservation_id: int, *, created_by: Optional[int] = None) -> StockReservation:
    reservation = db.query(StockReservation).filter(StockReservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation is not active")

    try:
        reservation.status = "CONSUMED"
        db.add(reservation)
        create_inventory_transaction(
            db,
            product_id=reservation.product_id,
            warehouse_id=reservation.warehouse_id,
            transaction_type="SALE_SHIPPED",
            quantity=reservation.quantity,
            direction="OUT",
            reference_type=reservation.reference_type,
            reference_id=reservation.reference_id,
            reason="Reserved stock consumed by shipment",
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


def receive_purchase(
    db: Session,
    *,
    product_id: int,
    warehouse_id: int,
    quantity: int,
    reference_id: Optional[str] = None,
    created_by: Optional[int] = None,
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

