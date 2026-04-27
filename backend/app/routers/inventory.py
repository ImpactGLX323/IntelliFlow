from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import InventoryTransaction, Product, StockReservation, User, Warehouse
from app.schemas import (
    InventoryTransactionRead,
    ReceivePurchaseRequest,
    StockAdjustmentRequest,
    StockPositionRead,
    StockReservationRead,
    StockReservationRequest,
    StockTransferRead,
    StockTransferRequest,
    WarehouseCreate,
    WarehouseRead,
)
from app.services.stock_ledger_service import (
    adjust_stock,
    consume_reservation,
    get_stock_position,
    receive_purchase,
    release_reservation,
    reserve_stock,
    transfer_stock,
)

router = APIRouter()


@router.get("/inventory/stock/{product_id}", response_model=StockPositionRead)
async def get_inventory_stock(
    product_id: int,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id, Product.owner_id == current_user.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if warehouse_id is not None:
        warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
        if warehouse is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    return get_stock_position(db, product_id, warehouse_id)


@router.get("/inventory/transactions", response_model=List[InventoryTransactionRead])
async def get_inventory_transactions(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(InventoryTransaction)
        .join(Product, Product.id == InventoryTransaction.product_id)
        .filter(Product.owner_id == current_user.id)
        .order_by(InventoryTransaction.created_at.desc())
    )
    if product_id is not None:
        query = query.filter(InventoryTransaction.product_id == product_id)
    if warehouse_id is not None:
        query = query.filter(InventoryTransaction.warehouse_id == warehouse_id)
    if transaction_type is not None:
        query = query.filter(InventoryTransaction.transaction_type == transaction_type)
    return query.limit(limit).all()


@router.post("/inventory/receive", response_model=InventoryTransactionRead, status_code=status.HTTP_201_CREATED)
async def receive_inventory(
    payload: ReceivePurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.owner_id == current_user.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return receive_purchase(
        db,
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        quantity=payload.quantity,
        reference_id=payload.reference_id,
        created_by=current_user.id,
    )


@router.post("/inventory/adjust", response_model=InventoryTransactionRead, status_code=status.HTTP_201_CREATED)
async def adjust_inventory(
    payload: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.owner_id == current_user.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return adjust_stock(
        db,
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        quantity=payload.quantity,
        adjustment_type=payload.adjustment_type,
        reason=payload.reason,
        notes=payload.notes,
        created_by=current_user.id,
    )


@router.post("/inventory/reserve", response_model=StockReservationRead, status_code=status.HTTP_201_CREATED)
async def reserve_inventory_stock(
    payload: StockReservationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.owner_id == current_user.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return reserve_stock(
        db,
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        quantity=payload.quantity,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        created_by=current_user.id,
    )


@router.post(
    "/inventory/reservations/{reservation_id}/release",
    response_model=StockReservationRead,
    status_code=status.HTTP_200_OK,
)
async def release_inventory_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation_record = (
        db.query(StockReservation)
        .join(Product, Product.id == StockReservation.product_id)
        .filter(StockReservation.id == reservation_id, Product.owner_id == current_user.id)
        .first()
    )
    if reservation_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return release_reservation(db, reservation_id, created_by=current_user.id)


@router.post(
    "/inventory/reservations/{reservation_id}/consume",
    response_model=StockReservationRead,
    status_code=status.HTTP_200_OK,
)
async def consume_inventory_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation_record = (
        db.query(StockReservation)
        .join(Product, Product.id == StockReservation.product_id)
        .filter(StockReservation.id == reservation_id, Product.owner_id == current_user.id)
        .first()
    )
    if reservation_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return consume_reservation(db, reservation_id, created_by=current_user.id)


@router.post("/inventory/transfer", response_model=StockTransferRead, status_code=status.HTTP_201_CREATED)
async def transfer_inventory_stock(
    payload: StockTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.owner_id == current_user.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return transfer_stock(
        db,
        product_id=payload.product_id,
        from_warehouse_id=payload.from_warehouse_id,
        to_warehouse_id=payload.to_warehouse_id,
        quantity=payload.quantity,
        notes=payload.notes,
        created_by=current_user.id,
    )


@router.get("/warehouses", response_model=List[WarehouseRead])
async def get_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return db.query(Warehouse).order_by(Warehouse.name.asc()).all()


@router.post("/warehouses", response_model=WarehouseRead, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    existing = db.query(Warehouse).filter(
        (Warehouse.name == warehouse.name) | (Warehouse.code == warehouse.code)
    ).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Warehouse name or code already exists")
    db_warehouse = Warehouse(**warehouse.model_dump())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse
