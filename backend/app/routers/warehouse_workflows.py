from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CycleCount, User
from app.schemas import (
    CycleCountCreate,
    CycleCountRead,
    InventoryConditionRequest,
    InventoryTransactionRead,
    PackingRecordCreate,
    PackingRecordRead,
    PickItemRequest,
    PickListRead,
    SubmitCycleCountItemRequest,
    WarehouseLocationCreate,
    WarehouseLocationRead,
)
from app.services.warehouse_workflow_service import (
    complete_cycle_count,
    complete_pick_list,
    create_cycle_count,
    create_packing_record,
    create_pick_list_for_sales_order,
    create_warehouse_location,
    list_warehouse_locations,
    mark_packed,
    mark_pick_item_picked,
    mark_stock_damaged,
    mark_stock_quarantined,
    submit_cycle_count_item,
)

router = APIRouter()


@router.get("/warehouse-locations", response_model=List[WarehouseLocationRead])
async def get_warehouse_locations(
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list_warehouse_locations(db, warehouse_id)


@router.post("/warehouse-locations", response_model=WarehouseLocationRead, status_code=status.HTTP_201_CREATED)
async def post_warehouse_location(
    payload: WarehouseLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_warehouse_location(db, **payload.model_dump())


@router.post("/picking/sales-orders/{sales_order_id}/create", response_model=PickListRead)
async def create_pick_list(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_pick_list_for_sales_order(db, sales_order_id)


@router.post("/picking/items/{pick_item_id}/pick", response_model=PickListRead)
async def pick_item(
    pick_item_id: int,
    payload: PickItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return mark_pick_item_picked(
        db,
        pick_item_id=pick_item_id,
        quantity=payload.quantity,
        warehouse_location_id=payload.warehouse_location_id,
    )


@router.post("/picking/{pick_list_id}/complete", response_model=PickListRead)
async def finish_pick_list(
    pick_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return complete_pick_list(db, pick_list_id)


@router.post("/packing/sales-orders/{sales_order_id}/create", response_model=PackingRecordRead)
async def create_pack_record(
    sales_order_id: int,
    payload: PackingRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_packing_record(db, sales_order_id, payload.package_reference)


@router.post("/packing/{packing_record_id}/mark-packed", response_model=PackingRecordRead)
async def finish_packing(
    packing_record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return mark_packed(db, packing_record_id)


@router.post("/cycle-counts", response_model=CycleCountRead, status_code=status.HTTP_201_CREATED)
async def post_cycle_count(
    payload: CycleCountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return create_cycle_count(db, payload.warehouse_id, [item.model_dump() for item in payload.items])


@router.get("/cycle-counts", response_model=List[CycleCountRead])
async def get_cycle_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return db.query(CycleCount).order_by(CycleCount.created_at.desc()).all()


@router.post("/cycle-counts/{cycle_count_id}/items/{item_id}/submit", response_model=CycleCountRead)
async def submit_count_item(
    cycle_count_id: int,
    item_id: int,
    payload: SubmitCycleCountItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return submit_cycle_count_item(db, cycle_count_id=cycle_count_id, item_id=item_id, counted_quantity=payload.counted_quantity)


@router.post("/cycle-counts/{cycle_count_id}/complete", response_model=CycleCountRead)
async def finish_cycle_count(
    cycle_count_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return complete_cycle_count(db, cycle_count_id)


@router.post("/inventory/damaged", response_model=InventoryTransactionRead)
async def inventory_damaged(
    payload: InventoryConditionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return mark_stock_damaged(db, **payload.model_dump())


@router.post("/inventory/quarantine", response_model=InventoryTransactionRead)
async def inventory_quarantine(
    payload: InventoryConditionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return mark_stock_quarantined(db, **payload.model_dump())
