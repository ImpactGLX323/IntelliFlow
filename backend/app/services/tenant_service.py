from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Query, Session

from app.models import Customer, PortOrNode, Product, PurchaseOrder, ReturnOrder, Route, SalesOrder, Shipment, Supplier, User, Warehouse


def require_workspace_user(user: User) -> None:
    if getattr(user, "id", None) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user context is required")


def _owned(model, *, owner_id: int):
    return getattr(model, "owner_id") == owner_id


def scope_query(query: Query, model, *, owner_id: int) -> Query:
    return query.filter(_owned(model, owner_id=owner_id))


def get_owned_product(db: Session, *, owner_id: int, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id, Product.owner_id == owner_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def get_owned_warehouse(db: Session, *, owner_id: int, warehouse_id: int) -> Warehouse:
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id, Warehouse.owner_id == owner_id).first()
    if warehouse is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    return warehouse


def get_owned_supplier(db: Session, *, owner_id: int, supplier_id: int) -> Supplier:
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.owner_id == owner_id).first()
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier


def get_owned_customer(db: Session, *, owner_id: int, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.owner_id == owner_id).first()
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def get_owned_sales_order(db: Session, *, owner_id: int, sales_order_id: int) -> SalesOrder:
    order = db.query(SalesOrder).filter(SalesOrder.id == sales_order_id, SalesOrder.owner_id == owner_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")
    return order


def get_owned_purchase_order(db: Session, *, owner_id: int, purchase_order_id: int) -> PurchaseOrder:
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id, PurchaseOrder.owner_id == owner_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    return order


def get_owned_return_order(db: Session, *, owner_id: int, return_order_id: int) -> ReturnOrder:
    order = db.query(ReturnOrder).filter(ReturnOrder.id == return_order_id, ReturnOrder.owner_id == owner_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return order not found")
    return order


def get_owned_shipment(db: Session, *, owner_id: int, shipment_id: int) -> Shipment:
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id, Shipment.owner_id == owner_id).first()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment


def get_owned_route(db: Session, *, owner_id: int, route_id: int) -> Route:
    route = db.query(Route).filter(Route.id == route_id, Route.owner_id == owner_id).first()
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return route


def get_owned_port_or_node(db: Session, *, owner_id: int, port_id: int) -> PortOrNode:
    port = db.query(PortOrNode).filter(PortOrNode.id == port_id, PortOrNode.owner_id == owner_id).first()
    if port is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Port not found")
    return port
