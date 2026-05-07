from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import AgentRecommendation, Customer, PortOrNode, Product, RiskAlert, Sale, Supplier, User, Warehouse
from app.services.logistics_service import add_shipment_leg, create_route, create_shipment, update_shipment_status
from app.services.purchasing_service import create_purchase_order, mark_purchase_order_ordered, receive_purchase_order_item
from app.services.returns_service import approve_return_order, create_return_order, receive_return_item
from app.services.sales_service import confirm_sales_order, create_sales_order, fulfill_sales_order_item
from app.services.stock_ledger_service import (
    adjust_stock,
    create_inventory_transaction,
    receive_purchase,
    reserve_stock,
    sync_product_current_stock,
    transfer_stock,
)


DEMO_EMAIL = "demo@intelliflow.local"
DEMO_NAME = "Demo User"
DEMO_FIREBASE_UID = "demo-user"

DEMO_PRODUCTS = [
    ("SKU-DEMO-001", "Basmati Rice 10kg", "Food Staples", 42.0, 28.5, 18),
    ("SKU-DEMO-002", "Cooking Oil 5L", "Food Staples", 31.0, 21.0, 16),
    ("SKU-DEMO-003", "Instant Coffee Pack", "Beverages", 18.0, 10.5, 14),
    ("SKU-DEMO-004", "Shampoo Refill", "Personal Care", 22.5, 11.0, 20),
    ("SKU-DEMO-005", "Detergent 2.5kg", "Home Care", 26.0, 15.5, 15),
    ("SKU-DEMO-006", "Infant Formula", "Health", 85.0, 61.0, 8),
    ("SKU-DEMO-007", "Pet Food 3kg", "Pet Care", 38.0, 24.0, 12),
    ("SKU-DEMO-008", "Latex Gloves Box", "Industrial", 29.0, 18.0, 25),
]

DEMO_RECOMMENDATIONS = [
    ("daily_inventory_scan", "inventory", "LOW_STOCK", "high", "Low stock risk on infant formula", "Available stock is near minimum threshold for SKU-DEMO-006."),
    ("logistics_scan", "logistics", "DELAYED_SHIPMENT", "critical", "Delayed shipment needs mitigation", "A delayed replenishment shipment is affecting downstream inventory cover."),
    ("returns_profit_scan", "returns", "PROFIT_LEAKAGE", "high", "Returns are eroding margin", "Damaged and defective returns are creating measurable refund and replacement drag."),
]


def ensure_demo_seed_data(db: Session, *, demo_user_id: int) -> dict[str, bool]:
    user = _ensure_demo_user(db, demo_user_id)
    warehouses = _ensure_demo_warehouses(db)
    suppliers = _ensure_demo_suppliers(db)
    customers = _ensure_demo_customers(db)
    products = _ensure_demo_products(db, user.id)
    _ensure_demo_inventory(db, user.id, products, warehouses)
    _ensure_demo_sales(db, user.id, products, customers, warehouses)
    _ensure_demo_purchase_orders(db, owner_id, products, suppliers, warehouses)
    _ensure_demo_returns(db, owner_id, products, customers, suppliers, warehouses)
    _ensure_demo_logistics(db, owner_id)
    _ensure_demo_ports(db, owner_id)
    _ensure_demo_recommendations(db, user.id)
    return {"seeded": True}


def _ensure_demo_user(db: Session, demo_user_id: int) -> User:
    user = db.query(User).filter(User.id == demo_user_id).first()
    if user is not None and user.email != DEMO_EMAIL:
        user = None
    if user is None:
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user is None:
        user = User(
            id=demo_user_id,
            email=DEMO_EMAIL,
            firebase_uid=DEMO_FIREBASE_UID,
            full_name=DEMO_NAME,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _ensure_demo_warehouses(db: Session) -> dict[str, Warehouse]:
    definitions = [
        ("MAIN", "Main Warehouse", "Kuala Lumpur"),
        ("PKDC", "Port Klang DC", "Port Klang"),
        ("JFH", "Johor Fulfillment Hub", "Johor Bahru"),
    ]
    result: dict[str, Warehouse] = {}
    for code, name, address in definitions:
        warehouse = db.query(Warehouse).filter(Warehouse.code == code).first()
        if warehouse is None:
            warehouse = Warehouse(name=name, code=code, address=address, is_active=True)
            db.add(warehouse)
            db.commit()
            db.refresh(warehouse)
        result[code] = warehouse
    return result


def _ensure_demo_suppliers(db: Session) -> dict[str, Supplier]:
    definitions = [
        ("Klang Import Partners", "supply@klang-import.example", 12),
        ("Johor FMCG Source", "ops@johor-fmcg.example", 8),
    ]
    result: dict[str, Supplier] = {}
    for name, email, lead_time_days in definitions:
        supplier = db.query(Supplier).filter(Supplier.name == name).first()
        if supplier is None:
            supplier = Supplier(name=name, email=email, lead_time_days=lead_time_days, address="Demo supplier data")
            db.add(supplier)
            db.commit()
            db.refresh(supplier)
        result[name] = supplier
    return result


def _ensure_demo_customers(db: Session) -> dict[str, Customer]:
    definitions = [
        ("Demo Retail Buyer", "buyer@demo-retail.example"),
        ("Demo Marketplace Store", "market@demo-store.example"),
    ]
    result: dict[str, Customer] = {}
    for name, email in definitions:
        customer = db.query(Customer).filter(Customer.name == name).first()
        if customer is None:
            customer = Customer(name=name, email=email, address="Demo customer data")
            db.add(customer)
            db.commit()
            db.refresh(customer)
        result[name] = customer
    return result


def _ensure_demo_products(db: Session, owner_id: int) -> dict[str, Product]:
    result: dict[str, Product] = {}
    for sku, name, category, price, cost, threshold in DEMO_PRODUCTS:
        product = db.query(Product).filter(Product.sku == sku).first()
        if product is None:
            product = Product(
                sku=sku,
                name=name,
                description="Demo data seeded for IntelliFlow demo mode.",
                category=category,
                price=price,
                cost=cost,
                current_stock=0,
                min_stock_threshold=threshold,
                supplier="Demo Supplier",
                owner_id=owner_id,
            )
            db.add(product)
            db.commit()
            db.refresh(product)
        result[sku] = product
    return result


def _ensure_demo_inventory(db: Session, owner_id: int, products: dict[str, Product], warehouses: dict[str, Warehouse]) -> None:
    main = warehouses["MAIN"]
    klang = warehouses["PKDC"]
    johor = warehouses["JFH"]
    seed_ops = [
        ("SKU-DEMO-001", main.id, 120),
        ("SKU-DEMO-002", main.id, 75),
        ("SKU-DEMO-003", klang.id, 55),
        ("SKU-DEMO-004", johor.id, 48),
        ("SKU-DEMO-005", klang.id, 64),
        ("SKU-DEMO-006", johor.id, 11),
        ("SKU-DEMO-007", main.id, 37),
        ("SKU-DEMO-008", klang.id, 90),
    ]
    for sku, warehouse_id, quantity in seed_ops:
        ref = f"DEMO-RECEIVE-{sku}-{warehouse_id}"
        tx_exists = db.execute(
            text("SELECT 1 FROM inventory_transactions WHERE reference_id = :ref LIMIT 1"),
            {"ref": ref},
        ).first()
        if tx_exists:
            continue
        receive_purchase(
            db,
            product_id=products[sku].id,
            warehouse_id=warehouse_id,
            quantity=quantity,
            reference_id=ref,
            created_by=owner_id,
        )
    if not db.execute(text("SELECT 1 FROM stock_reservations WHERE reference_id = 'DEMO-SO-RESERVE-1' LIMIT 1")).first():
        reserve_stock(
            db,
            product_id=products["SKU-DEMO-006"].id,
            warehouse_id=johor.id,
            quantity=3,
            reference_type="DEMO_ORDER",
            reference_id="DEMO-SO-RESERVE-1",
            created_by=owner_id,
        )
    if not db.execute(text("SELECT 1 FROM stock_transfers WHERE notes = 'Demo transfer from bootstrap' LIMIT 1")).first():
        transfer_stock(
            db,
            product_id=products["SKU-DEMO-002"].id,
            from_warehouse_id=main.id,
            to_warehouse_id=klang.id,
            quantity=8,
            notes="Demo transfer from bootstrap",
            created_by=owner_id,
        )
    if not db.execute(text("SELECT 1 FROM inventory_transactions WHERE reason = 'Demo damaged stock' LIMIT 1")).first():
        adjust_stock(
            db,
            product_id=products["SKU-DEMO-004"].id,
            warehouse_id=johor.id,
            quantity=2,
            adjustment_type="NEGATIVE",
            reason="Demo damaged stock",
            created_by=owner_id,
        )
        create_inventory_transaction(
            db,
            product_id=products["SKU-DEMO-004"].id,
            warehouse_id=johor.id,
            transaction_type="DAMAGED",
            quantity=2,
            direction="NEUTRAL",
            reference_type="DEMO_ADJUSTMENT",
            reference_id="DEMO-DAMAGED-1",
            reason="Demo damaged stock",
            created_by=owner_id,
        )
        db.commit()
    if not db.execute(text("SELECT 1 FROM inventory_transactions WHERE reference_id = 'DEMO-QUAR-1' LIMIT 1")).first():
        create_inventory_transaction(
            db,
            product_id=products["SKU-DEMO-008"].id,
            warehouse_id=klang.id,
            transaction_type="QUARANTINED",
            quantity=4,
            direction="NEUTRAL",
            reference_type="DEMO_ADJUSTMENT",
            reference_id="DEMO-QUAR-1",
            reason="Demo quarantined stock",
            created_by=owner_id,
        )
        db.commit()
    for product in products.values():
        sync_product_current_stock(db, product.id)


def _ensure_demo_sales(db: Session, owner_id: int, products: dict[str, Product], customers: dict[str, Customer], warehouses: dict[str, Warehouse]) -> None:
    if not db.query(Sale).filter(Sale.order_id.like("DEMO-SALE-%"), Sale.owner_id == owner_id).first():
        sales_rows = [
            ("DEMO-SALE-1", "SKU-DEMO-001", 12, 42.0, customers["Demo Retail Buyer"].id, datetime.utcnow() - timedelta(days=2)),
            ("DEMO-SALE-2", "SKU-DEMO-002", 9, 31.0, customers["Demo Marketplace Store"].id, datetime.utcnow() - timedelta(days=4)),
            ("DEMO-SALE-3", "SKU-DEMO-006", 5, 85.0, customers["Demo Retail Buyer"].id, datetime.utcnow() - timedelta(days=6)),
        ]
        for order_id, sku, quantity, unit_price, customer_id, sale_date in sales_rows:
            sale = Sale(
                product_id=products[sku].id,
                quantity=quantity,
                unit_price=unit_price,
                total_amount=quantity * unit_price,
                sale_date=sale_date,
                customer_id=str(customer_id),
                order_id=order_id,
                owner_id=owner_id,
            )
            db.add(sale)
        db.commit()
    if not db.query(RiskAlert).filter(RiskAlert.owner_id == owner_id, RiskAlert.alert_type == "low_stock").first():
        db.add(
            RiskAlert(
                product_id=products["SKU-DEMO-006"].id,
                alert_type="low_stock",
                severity="high",
                message="Demo alert: infant formula stock is nearing its minimum threshold.",
                owner_id=owner_id,
            )
        )
        db.commit()
    if not db.execute(text("SELECT 1 FROM sales_orders WHERE notes = 'Demo sales order bootstrap' LIMIT 1")).first():
        sales_order = create_sales_order(
            db,
            owner_id=owner_id,
            customer_id=customers["Demo Retail Buyer"].id,
            items=[{"product_id": products["SKU-DEMO-001"].id, "warehouse_id": warehouses["MAIN"].id, "quantity_ordered": 6, "unit_price": 42.0}],
            notes="Demo sales order bootstrap",
        )
        sales_order = confirm_sales_order(db, sales_order.id, owner_id=owner_id)
        fulfill_sales_order_item(db, owner_id=owner_id, order_id=sales_order.id, item_id=sales_order.items[0].id, quantity=4)


def _ensure_demo_purchase_orders(db: Session, owner_id: int, products: dict[str, Product], suppliers: dict[str, Supplier], warehouses: dict[str, Warehouse]) -> None:
    if db.execute(text("SELECT 1 FROM purchase_orders WHERE notes = 'Demo purchase order bootstrap' LIMIT 1")).first():
        return
    po = create_purchase_order(
        db,
        owner_id=owner_id,
        supplier_id=suppliers["Klang Import Partners"].id,
        items=[{"product_id": products["SKU-DEMO-006"].id, "warehouse_id": warehouses["JFH"].id, "quantity_ordered": 24, "unit_cost": 61.0}],
        notes="Demo purchase order bootstrap",
    )
    po = mark_purchase_order_ordered(db, po.id, owner_id=owner_id)
    receive_purchase_order_item(db, owner_id=owner_id, purchase_order_id=po.id, item_id=po.items[0].id, quantity=10)


def _ensure_demo_returns(db: Session, owner_id: int, products: dict[str, Product], customers: dict[str, Customer], suppliers: dict[str, Supplier], warehouses: dict[str, Warehouse]) -> None:
    if db.execute(text("SELECT 1 FROM return_orders WHERE notes = 'Demo return order bootstrap' LIMIT 1")).first():
        return
    rtn = create_return_order(
        db,
        owner_id=owner_id,
        sales_order_id=None,
        customer_id=customers["Demo Marketplace Store"].id,
        items=[
            {
                "product_id": products["SKU-DEMO-004"].id,
                "warehouse_id": warehouses["JFH"].id,
                "quantity": 2,
                "return_reason": "DEFECTIVE",
                "condition": "DAMAGED",
                "refund_amount": 45.0,
                "replacement_cost": 20.0,
                "supplier_id": suppliers["Johor FMCG Source"].id,
                "carrier_name": "Demo Carrier",
            }
        ],
        notes="Demo return order bootstrap",
    )
    rtn = approve_return_order(db, rtn.id, owner_id=owner_id)
    receive_return_item(db, owner_id=owner_id, return_id=rtn.id, item_id=rtn.items[0].id, quantity=2)


def _ensure_demo_logistics(db: Session, owner_id: int) -> None:
    if not db.execute(text("SELECT 1 FROM routes WHERE name = 'Demo Klang-Johor Corridor' LIMIT 1")).first():
        route_obj = create_route(
            db,
            owner_id=owner_id,
            name="Demo Klang-Johor Corridor",
            origin="Port Klang",
            destination="Johor Bahru",
            mode="ROAD",
            average_transit_days=2,
            risk_level="MEDIUM",
        )
    else:
        route_obj = db.execute(text("SELECT id FROM routes WHERE name = 'Demo Klang-Johor Corridor' LIMIT 1")).first()
        route_obj = type("RouteRef", (), {"id": route_obj[0]})()
    if not db.execute(text("SELECT 1 FROM shipments WHERE tracking_number = 'DEMO-TRACK-ACTIVE' LIMIT 1")).first():
        shipment = create_shipment(
            db,
            owner_id=owner_id,
            related_type="PURCHASE_ORDER",
            related_id="1",
            carrier_name="Demo Oceanic",
            tracking_number="DEMO-TRACK-ACTIVE",
            origin="Port Klang",
            destination="Johor Bahru",
            estimated_arrival=datetime.utcnow() + timedelta(days=2),
            customs_status=None,
        )
        add_shipment_leg(
            db,
            shipment.id,
            owner_id=owner_id,
            sequence_number=1,
            origin="Port Klang",
            destination="Johor Bahru",
            transport_mode="ROAD",
            carrier_name="Demo Oceanic",
            status="IN_TRANSIT",
        )
    if not db.execute(text("SELECT 1 FROM shipments WHERE tracking_number = 'DEMO-TRACK-DELAY' LIMIT 1")).first():
        delayed = create_shipment(
            db,
            owner_id=owner_id,
            related_type="SALES_ORDER",
            related_id="1",
            carrier_name="Demo Oceanic",
            tracking_number="DEMO-TRACK-DELAY",
            origin="Singapore",
            destination="Port Klang",
            estimated_arrival=datetime.utcnow() - timedelta(days=3),
            customs_status="IN_REVIEW",
        )
        add_shipment_leg(
            db,
            delayed.id,
            owner_id=owner_id,
            sequence_number=1,
            origin="Singapore",
            destination="Port Klang",
            transport_mode="SEA",
            carrier_name="Demo Oceanic",
            status="IN_TRANSIT",
        )
        update_shipment_status(db, delayed.id, owner_id=owner_id, status="DELAYED", delay_reason="Port congestion demo delay", actual_arrival=None)
    if not db.execute(text("SELECT 1 FROM shipments WHERE tracking_number = 'DEMO-TRACK-HOLD' LIMIT 1")).first():
        hold = create_shipment(
            db,
            owner_id=owner_id,
            related_type="PURCHASE_ORDER",
            related_id="1",
            carrier_name="Demo Customs Line",
            tracking_number="DEMO-TRACK-HOLD",
            origin="Shenzhen",
            destination="Port Klang",
            estimated_arrival=datetime.utcnow() - timedelta(days=5),
            customs_status="HOLD",
        )
        update_shipment_status(db, hold.id, owner_id=owner_id, status="CUSTOMS_HOLD", delay_reason="Documentation review demo hold", actual_arrival=None)


def _ensure_demo_ports(db: Session, owner_id: int) -> None:
    ports = [
        ("MYPKG", "Port Klang"),
        ("MYTPP", "Tanjung Pelepas"),
        ("MYPEN", "Penang / Perai"),
    ]
    for code, name in ports:
        port = db.query(PortOrNode).filter(PortOrNode.code == code, PortOrNode.owner_id == owner_id).first()
        if port is None:
            port = PortOrNode(code=code, name=name, country="Malaysia", node_type="PORT", owner_id=owner_id)
            db.add(port)
    db.commit()


def _ensure_demo_recommendations(db: Session, owner_id: int) -> None:
    for job_name, domain, recommendation_type, severity, title, summary in DEMO_RECOMMENDATIONS:
        existing = db.query(AgentRecommendation).filter(AgentRecommendation.owner_id == owner_id, AgentRecommendation.title == title).first()
        if existing is not None:
            continue
        db.add(
            AgentRecommendation(
                job_name=job_name,
                domain=domain,
                recommendation_type=recommendation_type,
                severity=severity,
                status="OPEN",
                title=title,
                summary=summary,
                source_target="demo-seed",
                owner_id=owner_id,
                payload={"demo": True},
            )
        )
    db.commit()
