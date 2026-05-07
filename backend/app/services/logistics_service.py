from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import (
    PortOrNode,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    Route,
    Sale,
    SalesOrder,
    SalesOrderItem,
    Shipment,
    ShipmentLeg,
    StockTransfer,
)
from app.services import purchasing_service, sales_service
from app.services.stock_ledger_service import get_available


def _generate_shipment_number(db: Session, *, owner_id: int) -> str:
    count = db.query(Shipment).filter(Shipment.owner_id == owner_id).count() + 1
    return f"SHP-{datetime.utcnow().strftime('%Y%m%d')}-{count:04d}"


def _normalize_dt(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _estimate_inventory_cover_days(db: Session, product_id: int) -> Optional[float]:
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    sales = (
        db.query(Sale)
        .filter(Sale.product_id == product_id, Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        .all()
    )
    units_sold = sum(sale.quantity for sale in sales)
    average_daily_demand = units_sold / 30.0 if units_sold > 0 else 0.0
    if average_daily_demand <= 0:
        return None
    available = get_available(db, product_id)
    return available / average_daily_demand


def _product_summary(db: Session, product_id: int, quantity: int) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    cover_days = _estimate_inventory_cover_days(db, product_id)
    return {
        "product_id": product_id,
        "sku": product.sku if product else None,
        "product_name": product.name if product else None,
        "quantity": quantity,
        "inventory_cover_remaining_days": cover_days,
        "available_stock": get_available(db, product_id),
    }


def _resolve_related_context(db: Session, shipment: Shipment, *, owner_id: int) -> dict:
    affected_purchase_orders: list[dict] = []
    affected_sales_orders: list[dict] = []
    affected_products: list[dict] = []
    revenue_at_risk = None

    if shipment.related_type == "PURCHASE_ORDER" and shipment.related_id:
        purchase_order = purchasing_service.get_purchase_order(db, int(shipment.related_id), owner_id=owner_id)
        affected_purchase_orders.append(
            {
                "id": purchase_order.id,
                "po_number": purchase_order.po_number,
                "status": purchase_order.status,
                "expected_arrival_date": purchase_order.expected_arrival_date.isoformat() if purchase_order.expected_arrival_date else None,
            }
        )
        for item in purchase_order.items:
            remaining = max(item.quantity_ordered - item.quantity_received, 0)
            affected_products.append(_product_summary(db, item.product_id, remaining))

    elif shipment.related_type == "SALES_ORDER" and shipment.related_id:
        sales_order = sales_service.get_sales_order(db, int(shipment.related_id), owner_id=owner_id)
        affected_sales_orders.append(
            {
                "id": sales_order.id,
                "order_number": sales_order.order_number,
                "status": sales_order.status,
                "expected_ship_date": sales_order.expected_ship_date.isoformat() if sales_order.expected_ship_date else None,
            }
        )
        revenue_at_risk = 0.0
        for item in sales_order.items:
            outstanding = max(item.quantity_ordered - item.quantity_fulfilled, 0)
            affected_products.append(_product_summary(db, item.product_id, outstanding))
            revenue_at_risk += outstanding * item.unit_price

    elif shipment.related_type == "TRANSFER" and shipment.related_id:
        transfer = (
            db.query(StockTransfer)
            .join(Product, Product.id == StockTransfer.product_id)
            .filter(StockTransfer.id == int(shipment.related_id), Product.owner_id == owner_id)
            .first()
        )
        if transfer:
            affected_products.append(_product_summary(db, transfer.product_id, transfer.quantity))

    return {
        "affected_purchase_orders": affected_purchase_orders,
        "affected_sales_orders": affected_sales_orders,
        "affected_products": affected_products,
        "revenue_at_risk": revenue_at_risk,
    }


def _estimate_delay_days(shipment: Shipment) -> int:
    now = datetime.now(timezone.utc)
    estimated_arrival = _normalize_dt(shipment.estimated_arrival)
    actual_arrival = _normalize_dt(shipment.actual_arrival)
    if estimated_arrival and actual_arrival:
        return max((actual_arrival - estimated_arrival).days, 0)
    if estimated_arrival and shipment.status in {"DELAYED", "CUSTOMS_HOLD"}:
        return max((now - estimated_arrival).days, 0)
    return 0


def _is_international(shipment: Shipment) -> bool:
    if shipment.customs_status:
        return True
    if shipment.origin and shipment.destination and shipment.origin != shipment.destination:
        return True
    return False


def _route_shipments(db: Session, route: Route, *, owner_id: int) -> list[Shipment]:
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.origin == route.origin, Shipment.destination == route.destination, Shipment.owner_id == owner_id)
        .all()
    )


def _build_mitigation(delay_days: int, affected_products: list[dict], revenue_at_risk: Optional[float]) -> list[str]:
    actions: list[str] = []
    if delay_days >= 7:
        actions.append("Escalate with carrier and review alternate route or mode immediately.")
    elif delay_days >= 3:
        actions.append("Notify operations and review whether existing inventory cover is sufficient.")
    else:
        actions.append("Monitor shipment closely and prepare customer or receiving updates.")

    if any(product["inventory_cover_remaining_days"] is not None and product["inventory_cover_remaining_days"] < delay_days for product in affected_products):
        actions.append("Inventory cover is below projected delay for at least one SKU; prioritize internal reallocation or substitute sourcing.")
    if revenue_at_risk and revenue_at_risk > 0:
        actions.append("Revenue is exposed on delayed outbound demand; proactively flag affected sales orders.")
    return actions


def create_shipment(db: Session, *, owner_id: int, **payload) -> Shipment:
    # TODO: gate advanced logistics features by subscription tier once feature flags exist.
    # TODO: when carrier APIs are configured, enrich shipment creation with upstream references here.
    shipment = Shipment(shipment_number=_generate_shipment_number(db, owner_id=owner_id), status="CREATED", owner_id=owner_id, **payload)
    db.add(shipment)
    db.commit()
    return get_shipment(db, shipment.id, owner_id=owner_id)


def update_shipment_status(db: Session, shipment_id: int, *, owner_id: int, **payload) -> Shipment:
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id, Shipment.owner_id == owner_id).first()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    if not payload.get("status"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shipment status is required")
    for field, value in payload.items():
        setattr(shipment, field, value)
    db.add(shipment)
    db.commit()
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.id == shipment.id, Shipment.owner_id == owner_id)
        .first()
    )


def add_shipment_leg(db: Session, shipment_id: int, *, owner_id: int, **payload) -> Shipment:
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id, Shipment.owner_id == owner_id).first()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    leg = ShipmentLeg(shipment_id=shipment_id, **payload)
    db.add(leg)
    db.commit()
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.id == shipment_id, Shipment.owner_id == owner_id)
        .first()
    )


def get_shipment(db: Session, shipment_id: int, *, owner_id: int) -> Shipment:
    shipment = (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.id == shipment_id, Shipment.owner_id == owner_id)
        .first()
    )
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment


def get_active_shipments(db: Session, *, owner_id: int) -> list[Shipment]:
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.owner_id == owner_id, Shipment.status.in_(["CREATED", "IN_TRANSIT", "DELAYED", "CUSTOMS_HOLD"]))
        .order_by(Shipment.created_at.desc())
        .all()
    )


def get_international_active_shipments(db: Session, *, owner_id: int) -> list[dict]:
    shipments = get_active_shipments(db, owner_id=owner_id)
    return [serialize_shipment_status(db, shipment.id, owner_id=owner_id) for shipment in shipments if _is_international(shipment)]


def get_delayed_shipments(db: Session, *, owner_id: int) -> list[Shipment]:
    return (
        db.query(Shipment)
        .options(joinedload(Shipment.legs))
        .filter(Shipment.owner_id == owner_id, Shipment.status.in_(["DELAYED", "CUSTOMS_HOLD"]))
        .order_by(Shipment.updated_at.desc())
        .all()
    )


def get_eta(db: Session, shipment_id: int, *, owner_id: int) -> dict:
    shipment = get_shipment(db, shipment_id, owner_id=owner_id)
    estimated_arrival = _normalize_dt(shipment.estimated_arrival)
    actual_arrival = _normalize_dt(shipment.actual_arrival)
    delay_days = _estimate_delay_days(shipment)
    eta_status = "UNKNOWN"
    if actual_arrival:
        eta_status = "ARRIVED"
    elif estimated_arrival:
        eta_status = "LATE" if delay_days > 0 else "ON_TRACK"
    return {
        "shipment_id": shipment.id,
        "shipment_number": shipment.shipment_number,
        "estimated_arrival": estimated_arrival.isoformat() if estimated_arrival else None,
        "actual_arrival": actual_arrival.isoformat() if actual_arrival else None,
        "delay_days": delay_days,
        "eta_status": eta_status,
    }


def find_affected_orders(db: Session, shipment_id: int, *, owner_id: int) -> dict:
    shipment = get_shipment(db, shipment_id, owner_id=owner_id)
    related = _resolve_related_context(db, shipment, owner_id=owner_id)
    return {
        "shipment_id": shipment.id,
        "shipment_number": shipment.shipment_number,
        "affected_purchase_orders": related["affected_purchase_orders"],
        "affected_sales_orders": related["affected_sales_orders"],
        "affected_products": related["affected_products"],
        "revenue_at_risk": related["revenue_at_risk"],
    }


def calculate_delay_impact(db: Session, shipment_id: int, *, owner_id: int) -> dict:
    shipment = get_shipment(db, shipment_id, owner_id=owner_id)
    delay_days = _estimate_delay_days(shipment)
    related = _resolve_related_context(db, shipment, owner_id=owner_id)
    risk_level = "LOW"
    if delay_days >= 7 or shipment.status == "CUSTOMS_HOLD":
        risk_level = "HIGH"
    elif delay_days >= 3 or shipment.status == "DELAYED":
        risk_level = "MEDIUM"

    recommended_mitigation = _build_mitigation(delay_days, related["affected_products"], related["revenue_at_risk"])

    return {
        "shipment_id": shipment.id,
        "shipment_number": shipment.shipment_number,
        "related_type": shipment.related_type,
        "related_id": shipment.related_id,
        "delayed_shipment": shipment.status in {"DELAYED", "CUSTOMS_HOLD"},
        "delay_days": delay_days,
        "affected_skus": related["affected_products"],
        "affected_purchase_orders": related["affected_purchase_orders"],
        "affected_sales_orders": related["affected_sales_orders"],
        "revenue_at_risk": related["revenue_at_risk"],
        "inventory_cover_remaining": [
            {
                "product_id": item["product_id"],
                "sku": item["sku"],
                "inventory_cover_remaining_days": item["inventory_cover_remaining_days"],
            }
            for item in related["affected_products"]
        ],
        "risk_level": risk_level,
        "recommended_mitigation": recommended_mitigation,
    }


def detect_late_shipments(db: Session, threshold_days: int = 1, *, owner_id: int) -> list[dict]:
    delayed: list[dict] = []
    for shipment in get_active_shipments(db, owner_id=owner_id):
        delay_days = _estimate_delay_days(shipment)
        if delay_days >= threshold_days:
            delayed.append(serialize_shipment_status(db, shipment.id, owner_id=owner_id))
    delayed.sort(key=lambda item: item["delay_days"], reverse=True)
    return delayed


def get_route(db: Session, route_id: int, *, owner_id: int) -> Route:
    route = db.query(Route).filter(Route.id == route_id, Route.owner_id == owner_id).first()
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return route


def get_route_status(db: Session, route_id: int, *, owner_id: int) -> dict:
    route = get_route(db, route_id, owner_id=owner_id)
    shipments = _route_shipments(db, route, owner_id=owner_id)
    active_shipments = [shipment for shipment in shipments if shipment.status in {"CREATED", "IN_TRANSIT", "DELAYED", "CUSTOMS_HOLD"}]
    delayed_shipments = [shipment for shipment in active_shipments if _estimate_delay_days(shipment) > 0 or shipment.status in {"DELAYED", "CUSTOMS_HOLD"}]
    average_delay = None
    if delayed_shipments:
        average_delay = sum(_estimate_delay_days(shipment) for shipment in delayed_shipments) / len(delayed_shipments)
    return {
        "route_id": route.id,
        "name": route.name,
        "origin": route.origin,
        "destination": route.destination,
        "mode": route.mode,
        "risk_level": route.risk_level,
        "average_transit_days": route.average_transit_days,
        "active_shipments": len(active_shipments),
        "delayed_shipments": len(delayed_shipments),
        "average_delay_days": average_delay,
        "status": "DISRUPTED" if delayed_shipments else "NORMAL",
        "missing_data": ["carrier_api_not_configured"],
    }


def get_route_delays(db: Session, *, owner_id: int) -> list[dict]:
    return [get_route_status(db, route.id, owner_id=owner_id) for route in list_routes(db, owner_id=owner_id)]


def recommend_reroute(db: Session, shipment_id: int, *, owner_id: int) -> dict:
    shipment = get_shipment(db, shipment_id, owner_id=owner_id)
    delay_impact = calculate_delay_impact(db, shipment_id, owner_id=owner_id)
    candidate_routes = (
        db.query(Route)
        .filter(Route.origin == shipment.origin, Route.destination == shipment.destination, Route.owner_id == owner_id)
        .order_by(Route.risk_level.asc(), Route.average_transit_days.asc())
        .all()
    )
    recommended_route = None
    for route in candidate_routes:
        if route.average_transit_days is None:
            continue
        if route.risk_level == "HIGH":
            continue
        recommended_route = route
        break
    return {
        "shipment_id": shipment.id,
        "shipment_number": shipment.shipment_number,
        "current_delay_days": delay_impact["delay_days"],
        "affected_skus": delay_impact["affected_skus"],
        "revenue_at_risk": delay_impact["revenue_at_risk"],
        "recommended_mitigation": delay_impact["recommended_mitigation"],
        "recommended_route": (
            {
                "route_id": recommended_route.id,
                "name": recommended_route.name,
                "origin": recommended_route.origin,
                "destination": recommended_route.destination,
                "mode": recommended_route.mode,
                "average_transit_days": recommended_route.average_transit_days,
                "risk_level": recommended_route.risk_level,
            }
            if recommended_route
            else None
        ),
        "missing_data": ["carrier_api_not_configured"],
        "todo": "Carrier API handoff is not configured; reroute output is advisory only.",
    }


def create_logistics_exception(
    db: Session,
    *,
    owner_id: int,
    shipment_id: int,
    issue_summary: Optional[str] = None,
) -> dict:
    # TODO: when carrier integrations exist, attach live carrier references to exception records.
    shipment = get_shipment(db, shipment_id, owner_id=owner_id)
    delay_impact = calculate_delay_impact(db, shipment_id, owner_id=owner_id)
    reroute = recommend_reroute(db, shipment_id, owner_id=owner_id)
    return {
        "exception_type": "LOGISTICS_EXCEPTION",
        "status": "OPEN_RECOMMENDATION",
        "shipment_id": shipment.id,
        "shipment_number": shipment.shipment_number,
        "issue_summary": issue_summary or "Delayed or disrupted shipment requires logistics review.",
        "delay_days": delay_impact["delay_days"],
        "affected_skus": delay_impact["affected_skus"],
        "affected_purchase_orders": delay_impact["affected_purchase_orders"],
        "affected_sales_orders": delay_impact["affected_sales_orders"],
        "revenue_at_risk": delay_impact["revenue_at_risk"],
        "inventory_cover_remaining": delay_impact["inventory_cover_remaining"],
        "recommended_mitigation": delay_impact["recommended_mitigation"],
        "recommended_reroute": reroute["recommended_route"],
        "exception_reference": f"logex-{shipment.id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "mutated_tables": [],
        "missing_data": ["carrier_api_not_configured"],
    }


def serialize_shipment_status(db: Session, shipment_id: int, *, owner_id: int) -> dict:
    shipment = get_shipment(db, shipment_id, owner_id=owner_id)
    eta = get_eta(db, shipment_id, owner_id=owner_id)
    related = _resolve_related_context(db, shipment, owner_id=owner_id)
    return {
        "shipment_id": shipment.id,
        "shipment_number": shipment.shipment_number,
        "status": shipment.status,
        "carrier_name": shipment.carrier_name,
        "tracking_number": shipment.tracking_number,
        "origin": shipment.origin,
        "destination": shipment.destination,
        "related_type": shipment.related_type,
        "related_id": shipment.related_id,
        "delay_days": eta["delay_days"],
        "eta": eta["estimated_arrival"],
        "affected_skus": related["affected_products"],
        "affected_purchase_orders": related["affected_purchase_orders"],
        "affected_sales_orders": related["affected_sales_orders"],
        "revenue_at_risk": related["revenue_at_risk"],
        "inventory_cover_remaining": [
            {
                "product_id": item["product_id"],
                "sku": item["sku"],
                "inventory_cover_remaining_days": item["inventory_cover_remaining_days"],
            }
            for item in related["affected_products"]
        ],
        "recommended_mitigation": _build_mitigation(
            eta["delay_days"],
            related["affected_products"],
            related["revenue_at_risk"],
        ),
    }


def create_route(db: Session, *, owner_id: int, **payload) -> Route:
    route = Route(owner_id=owner_id, **payload)
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


def list_routes(db: Session, *, owner_id: int) -> list[Route]:
    return db.query(Route).filter(Route.owner_id == owner_id).order_by(Route.name.asc()).all()


def create_port_or_node(db: Session, *, owner_id: int, **payload) -> PortOrNode:
    # TODO: integrate external maps or carrier network metadata if needed later.
    node = PortOrNode(owner_id=owner_id, **payload)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


def list_ports_or_nodes(db: Session, *, owner_id: int) -> list[PortOrNode]:
    return db.query(PortOrNode).filter(PortOrNode.owner_id == owner_id).order_by(PortOrNode.name.asc()).all()
