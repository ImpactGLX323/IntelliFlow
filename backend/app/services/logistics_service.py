from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import PortOrNode, PurchaseOrder, PurchaseOrderItem, Route, SalesOrder, SalesOrderItem, Shipment, ShipmentLeg, StockTransfer


def _generate_shipment_number(db: Session) -> str:
    count = db.query(Shipment).count() + 1
    return f"SHP-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"


def create_shipment(db: Session, **payload) -> Shipment:
    # TODO: gate advanced logistics features by subscription tier once feature flags exist.
    shipment = Shipment(shipment_number=_generate_shipment_number(db), status="CREATED", **payload)
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


def update_shipment_status(db: Session, shipment_id: int, **payload) -> Shipment:
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    for field, value in payload.items():
        setattr(shipment, field, value)
    db.add(shipment)
    db.commit()
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.id == shipment.id)
        .first()
    )


def add_shipment_leg(db: Session, shipment_id: int, **payload) -> Shipment:
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    leg = ShipmentLeg(shipment_id=shipment_id, **payload)
    db.add(leg)
    db.commit()
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.id == shipment_id)
        .first()
    )


def get_shipment(db: Session, shipment_id: int) -> Shipment:
    shipment = (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.id == shipment_id)
        .first()
    )
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment


def get_active_shipments(db: Session) -> list[Shipment]:
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.status.in_(["CREATED", "IN_TRANSIT", "DELAYED", "CUSTOMS_HOLD"]))
        .order_by(Shipment.created_at.desc())
        .all()
    )


def get_delayed_shipments(db: Session) -> list[Shipment]:
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.status.in_(["DELAYED", "CUSTOMS_HOLD"]))
        .order_by(Shipment.updated_at.desc())
        .all()
    )


def calculate_delay_impact(db: Session, shipment_id: int) -> dict:
    shipment = get_shipment(db, shipment_id)
    now = datetime.now(timezone.utc)
    estimated_arrival = shipment.estimated_arrival
    actual_arrival = shipment.actual_arrival
    if estimated_arrival is not None and estimated_arrival.tzinfo is None:
        estimated_arrival = estimated_arrival.replace(tzinfo=timezone.utc)
    if actual_arrival is not None and actual_arrival.tzinfo is None:
        actual_arrival = actual_arrival.replace(tzinfo=timezone.utc)
    estimated_delay_days = 0
    if estimated_arrival and actual_arrival:
        estimated_delay_days = max((actual_arrival - estimated_arrival).days, 0)
    elif estimated_arrival and shipment.status in {"DELAYED", "CUSTOMS_HOLD"}:
        estimated_delay_days = max((now - estimated_arrival).days, 0)

    affected_order = None
    affected_products: list[dict] = []

    if shipment.related_type == "PURCHASE_ORDER" and shipment.related_id:
        purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == int(shipment.related_id)).first()
        if purchase_order:
            affected_order = {"id": purchase_order.id, "po_number": purchase_order.po_number, "status": purchase_order.status}
            items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.purchase_order_id == purchase_order.id).all()
            affected_products = [{"product_id": item.product_id, "quantity": item.quantity_ordered} for item in items]
    elif shipment.related_type == "SALES_ORDER" and shipment.related_id:
        sales_order = db.query(SalesOrder).filter(SalesOrder.id == int(shipment.related_id)).first()
        if sales_order:
            affected_order = {"id": sales_order.id, "order_number": sales_order.order_number, "status": sales_order.status}
            items = db.query(SalesOrderItem).filter(SalesOrderItem.sales_order_id == sales_order.id).all()
            affected_products = [{"product_id": item.product_id, "quantity": item.quantity_ordered} for item in items]
    elif shipment.related_type == "TRANSFER" and shipment.related_id:
        transfer = db.query(StockTransfer).filter(StockTransfer.id == int(shipment.related_id)).first()
        if transfer:
            affected_order = {"id": transfer.id, "status": transfer.status}
            affected_products = [{"product_id": transfer.product_id, "quantity": transfer.quantity}]

    risk_level = "LOW"
    if estimated_delay_days >= 7 or shipment.status == "CUSTOMS_HOLD":
        risk_level = "HIGH"
    elif estimated_delay_days >= 3 or shipment.status == "DELAYED":
        risk_level = "MEDIUM"

    return {
        "shipment_id": shipment.id,
        "related_type": shipment.related_type,
        "related_id": shipment.related_id,
        "affected_order": affected_order,
        "affected_products": affected_products,
        "estimated_delay_days": estimated_delay_days,
        "risk_level": risk_level,
    }


def create_route(db: Session, **payload) -> Route:
    route = Route(**payload)
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


def list_routes(db: Session) -> list[Route]:
    return db.query(Route).order_by(Route.name.asc()).all()


def create_port_or_node(db: Session, **payload) -> PortOrNode:
    # TODO: integrate external maps or carrier network metadata if needed later.
    node = PortOrNode(**payload)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


def list_ports_or_nodes(db: Session) -> list[PortOrNode]:
    return db.query(PortOrNode).order_by(PortOrNode.name.asc()).all()
