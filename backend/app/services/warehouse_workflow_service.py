from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import (
    CycleCount,
    CycleCountItem,
    PackingRecord,
    PickList,
    PickListItem,
    SalesOrder,
    Warehouse,
    WarehouseLocation,
)
from app.services.stock_ledger_service import (
    adjust_stock,
    get_on_hand,
    record_damaged_stock,
    record_quarantined_stock,
)


def create_warehouse_location(
    db: Session,
    *,
    owner_id: int,
    warehouse_id: int,
    name: str,
    code: Optional[str],
    location_type: str,
    is_active: bool,
) -> WarehouseLocation:
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id, Warehouse.owner_id == owner_id).first()
    if warehouse is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    location = WarehouseLocation(
        warehouse_id=warehouse_id,
        name=name,
        code=code,
        location_type=location_type,
        is_active=is_active,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


def list_warehouse_locations(db: Session, *, owner_id: int, warehouse_id: Optional[int] = None) -> list[WarehouseLocation]:
    query = db.query(WarehouseLocation).join(Warehouse, Warehouse.id == WarehouseLocation.warehouse_id).filter(Warehouse.owner_id == owner_id).order_by(WarehouseLocation.name.asc())
    if warehouse_id is not None:
        query = query.filter(WarehouseLocation.warehouse_id == warehouse_id)
    return query.all()


def create_pick_list_for_sales_order(db: Session, sales_order_id: int, *, owner_id: int) -> PickList:
    sales_order = (
        db.query(SalesOrder)
        .options(joinedload(SalesOrder.items))
        .filter(SalesOrder.id == sales_order_id, SalesOrder.owner_id == owner_id)
        .first()
    )
    if sales_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")
    if sales_order.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot pick a cancelled sales order")

    pick_list = PickList(sales_order_id=sales_order.id, status="OPEN")
    db.add(pick_list)
    db.flush()

    for item in sales_order.items:
        quantity_to_pick = max(item.quantity_ordered - item.quantity_fulfilled, 0)
        if quantity_to_pick <= 0 or item.warehouse_id is None:
            continue
        db.add(
            PickListItem(
                pick_list_id=pick_list.id,
                sales_order_item_id=item.id,
                product_id=item.product_id,
                warehouse_id=item.warehouse_id,
                quantity_to_pick=quantity_to_pick,
            )
        )

    db.commit()
    return (
        db.query(PickList)
        .options(joinedload(PickList.items))
        .filter(PickList.id == pick_list.id)
        .first()
    )


def mark_pick_item_picked(
    db: Session,
    *,
    pick_item_id: int,
    quantity: int,
    warehouse_location_id: Optional[int] = None,
) -> PickList:
    # TODO: attach barcode scan metadata here once scanning workflows are introduced.
    pick_item = db.query(PickListItem).filter(PickListItem.id == pick_item_id).first()
    if pick_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pick item not found")
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero")
    if pick_item.quantity_picked + quantity > pick_item.quantity_to_pick:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Picked quantity exceeds required quantity")

    pick_item.quantity_picked += quantity
    if warehouse_location_id is not None:
        pick_item.warehouse_location_id = warehouse_location_id
    db.add(pick_item)

    pick_list = db.query(PickList).filter(PickList.id == pick_item.pick_list_id).first()
    pick_list.status = "PICKING"
    db.add(pick_list)
    db.commit()
    return (
        db.query(PickList)
        .options(joinedload(PickList.items))
        .filter(PickList.id == pick_list.id)
        .first()
    )


def complete_pick_list(db: Session, pick_list_id: int) -> PickList:
    pick_list = (
        db.query(PickList)
        .options(joinedload(PickList.items))
        .filter(PickList.id == pick_list_id)
        .first()
    )
    if pick_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pick list not found")
    if any(item.quantity_picked < item.quantity_to_pick for item in pick_list.items):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All pick items must be fully picked before completion")
    pick_list.status = "PICKED"
    db.add(pick_list)
    db.commit()
    return pick_list


def create_packing_record(db: Session, sales_order_id: int, package_reference: Optional[str] = None) -> PackingRecord:
    packing_record = PackingRecord(sales_order_id=sales_order_id, status="OPEN", package_reference=package_reference)
    db.add(packing_record)
    db.commit()
    db.refresh(packing_record)
    return packing_record


def mark_packed(db: Session, packing_record_id: int) -> PackingRecord:
    packing_record = db.query(PackingRecord).filter(PackingRecord.id == packing_record_id).first()
    if packing_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packing record not found")
    packing_record.status = "PACKED"
    db.add(packing_record)
    db.commit()
    db.refresh(packing_record)
    return packing_record


def create_cycle_count(db: Session, warehouse_id: int, items: list[dict]) -> CycleCount:
    cycle_count = CycleCount(warehouse_id=warehouse_id, status="OPEN")
    db.add(cycle_count)
    db.flush()

    for item in items:
        expected_quantity = get_on_hand(db, item["product_id"], warehouse_id)
        db.add(
            CycleCountItem(
                cycle_count_id=cycle_count.id,
                product_id=item["product_id"],
                warehouse_location_id=item.get("warehouse_location_id"),
                expected_quantity=expected_quantity,
            )
        )

    db.commit()
    return (
        db.query(CycleCount)
        .options(joinedload(CycleCount.items))
        .filter(CycleCount.id == cycle_count.id)
        .first()
    )


def submit_cycle_count_item(db: Session, *, cycle_count_id: int, item_id: int, counted_quantity: int) -> CycleCount:
    cycle_count = (
        db.query(CycleCount)
        .options(joinedload(CycleCount.items))
        .filter(CycleCount.id == cycle_count_id)
        .first()
    )
    if cycle_count is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle count not found")
    cycle_item = next((row for row in cycle_count.items if row.id == item_id), None)
    if cycle_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle count item not found")

    cycle_item.counted_quantity = counted_quantity
    cycle_item.variance = counted_quantity - cycle_item.expected_quantity
    db.add(cycle_item)

    if cycle_item.variance:
        adjust_stock(
            db,
            product_id=cycle_item.product_id,
            warehouse_id=cycle_count.warehouse_id,
            quantity=abs(cycle_item.variance),
            adjustment_type="POSITIVE" if cycle_item.variance > 0 else "NEGATIVE",
            reason="Cycle count variance adjustment",
            commit=False,
        )

    db.commit()
    return (
        db.query(CycleCount)
        .options(joinedload(CycleCount.items))
        .filter(CycleCount.id == cycle_count.id)
        .first()
    )


def complete_cycle_count(db: Session, cycle_count_id: int) -> CycleCount:
    cycle_count = db.query(CycleCount).filter(CycleCount.id == cycle_count_id).first()
    if cycle_count is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle count not found")
    cycle_count.status = "COMPLETED"
    cycle_count.completed_at = datetime.utcnow()
    db.add(cycle_count)
    db.commit()
    db.refresh(cycle_count)
    return cycle_count


def mark_stock_damaged(db: Session, *, product_id: int, warehouse_id: int, quantity: int, reason: str):
    return record_damaged_stock(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
        reason=reason,
    )


def mark_stock_quarantined(db: Session, *, product_id: int, warehouse_id: int, quantity: int, reason: str):
    return record_quarantined_stock(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
        reason=reason,
    )
