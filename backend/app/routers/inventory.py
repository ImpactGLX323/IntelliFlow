from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.plan import require_plan
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
    WarehouseUpdate,
)
from app.services.stock_ledger_service import (
    adjust_stock,
    consume_reservation,
    get_default_warehouse,
    get_stock_position,
    receive_purchase,
    release_reservation,
    reserve_stock,
    transfer_stock,
)
from app.services.notification_service import create_notification
from app.services.tenant_service import get_owned_product, get_owned_warehouse

router = APIRouter()


@router.get("/inventory/stock/{product_id}", response_model=StockPositionRead)
async def get_inventory_stock(
    product_id: int,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = get_owned_product(db, owner_id=current_user.id, product_id=product_id)
    if warehouse_id is not None:
        get_owned_warehouse(db, owner_id=current_user.id, warehouse_id=warehouse_id)
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
    product = get_owned_product(db, owner_id=current_user.id, product_id=payload.product_id)
    get_owned_warehouse(db, owner_id=current_user.id, warehouse_id=payload.warehouse_id)
    transaction = receive_purchase(
        db,
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        quantity=payload.quantity,
        reference_id=payload.reference_id,
        created_by=current_user.id,
    )
    db.refresh(product)
    create_notification(
        db,
        user=current_user,
        category="stock_received",
        title="Stock received",
        body=f"Received {payload.quantity} units into warehouse #{payload.warehouse_id}.",
        severity="info",
        data={"product_id": payload.product_id, "warehouse_id": payload.warehouse_id, "quantity": payload.quantity},
    )
    if product.current_stock <= product.min_stock_threshold:
        create_notification(
            db,
            user=current_user,
            category="low_stock",
            title="Low stock threshold reached",
            body=f"{product.name} is at or below its minimum stock threshold after receiving activity.",
            severity="warning",
            data={"product_id": product.id, "current_stock": product.current_stock},
        )
    return transaction


@router.post("/inventory/adjust", response_model=InventoryTransactionRead, status_code=status.HTTP_201_CREATED)
async def adjust_inventory(
    payload: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = get_owned_product(db, owner_id=current_user.id, product_id=payload.product_id)
    get_owned_warehouse(db, owner_id=current_user.id, warehouse_id=payload.warehouse_id)
    transaction = adjust_stock(
        db,
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        quantity=payload.quantity,
        adjustment_type=payload.adjustment_type,
        reason=payload.reason,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.refresh(product)
    create_notification(
        db,
        user=current_user,
        category="stock_adjusted",
        title="Stock adjusted",
        body=f"{payload.adjustment_type.title()} adjustment posted for product #{payload.product_id}.",
        severity="warning" if payload.adjustment_type == "NEGATIVE" else "info",
        data={"product_id": payload.product_id, "warehouse_id": payload.warehouse_id, "quantity": payload.quantity},
    )
    if product.current_stock <= product.min_stock_threshold:
        create_notification(
            db,
            user=current_user,
            category="low_stock",
            title="Low stock threshold reached",
            body=f"{product.name} is at or below its minimum stock threshold after an adjustment.",
            severity="warning",
            data={"product_id": product.id, "current_stock": product.current_stock},
        )
    return transaction


@router.post("/inventory/reserve", response_model=StockReservationRead, status_code=status.HTTP_201_CREATED)
async def reserve_inventory_stock(
    payload: StockReservationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_owned_product(db, owner_id=current_user.id, product_id=payload.product_id)
    get_owned_warehouse(db, owner_id=current_user.id, warehouse_id=payload.warehouse_id)
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
    plan_user: User = Depends(require_plan("PRO")),
    current_user: User = Depends(get_current_user),
):
    _ = plan_user
    get_owned_product(db, owner_id=current_user.id, product_id=payload.product_id)
    get_owned_warehouse(db, owner_id=current_user.id, warehouse_id=payload.from_warehouse_id)
    get_owned_warehouse(db, owner_id=current_user.id, warehouse_id=payload.to_warehouse_id)
    transfer = transfer_stock(
        db,
        product_id=payload.product_id,
        from_warehouse_id=payload.from_warehouse_id,
        to_warehouse_id=payload.to_warehouse_id,
        quantity=payload.quantity,
        notes=payload.notes,
        created_by=current_user.id,
    )
    create_notification(
        db,
        user=current_user,
        category="stock_adjusted",
        title="Stock transferred",
        body=f"Transferred {payload.quantity} units from warehouse #{payload.from_warehouse_id} to #{payload.to_warehouse_id}.",
        severity="info",
        data={"product_id": payload.product_id, "transfer_id": transfer.id},
    )
    return transfer


@router.get("/warehouses", response_model=List[WarehouseRead])
async def get_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_default_warehouse(db, owner_id=current_user.id)
    return db.query(Warehouse).filter(Warehouse.owner_id == current_user.id).order_by(Warehouse.name.asc()).all()


@router.post("/warehouses", response_model=WarehouseRead, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db),
    plan_user: User = Depends(require_plan("PRO")),
    current_user: User = Depends(get_current_user),
):
    _ = plan_user
    existing = db.query(Warehouse).filter(
        Warehouse.owner_id == current_user.id,
        ((Warehouse.name == warehouse.name) | (Warehouse.code == warehouse.code))
    ).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Warehouse name or code already exists")
    db_warehouse = Warehouse(**warehouse.model_dump(), owner_id=current_user.id)
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseRead)
async def update_warehouse(
    warehouse_id: int,
    payload: WarehouseUpdate,
    db: Session = Depends(get_db),
    plan_user: User = Depends(require_plan("PRO")),
    current_user: User = Depends(get_current_user),
):
    _ = plan_user
    warehouse = get_owned_warehouse(db, owner_id=current_user.id, warehouse_id=warehouse_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != warehouse.name:
        existing = db.query(Warehouse).filter(Warehouse.name == update_data["name"], Warehouse.owner_id == current_user.id).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Warehouse name already exists")
    if "code" in update_data and update_data["code"] != warehouse.code:
        existing = db.query(Warehouse).filter(Warehouse.code == update_data["code"], Warehouse.owner_id == current_user.id).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Warehouse code already exists")

    for field, value in update_data.items():
        setattr(warehouse, field, value)

    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse
