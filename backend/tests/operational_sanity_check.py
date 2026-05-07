import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import Base
from app.models import Customer, Product, Supplier, User, Warehouse
from app.services.logistics_service import calculate_delay_impact, create_shipment, update_shipment_status
from app.services.purchasing_service import create_purchase_order, receive_purchase_order_item
from app.services.returns_service import (
    approve_return_order,
    create_return_order,
    get_profit_leakage_report,
    receive_return_item,
)
from app.services.sales_service import create_sales_order, confirm_sales_order, fulfill_sales_order_item
from app.services.stock_ledger_service import get_stock_position, transfer_stock


def run() -> None:
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = User(email="ops@example.com", firebase_uid="ops-user")
        supplier = Supplier(name="Acme Supply", lead_time_days=7)
        customer = Customer(name="Northwind Retail")
        warehouse_a = Warehouse(name="Main Warehouse", code="MAIN")
        warehouse_b = Warehouse(name="Overflow Warehouse", code="OVF")
        product = Product(
            name="Precision Widget",
            sku="PW-001",
            price=25.0,
            cost=10.0,
            current_stock=0,
            min_stock_threshold=20,
            supplier="Acme Supply",
            owner_id=1,
        )
        db.add_all([user, supplier, customer, warehouse_a, warehouse_b])
        db.flush()
        product.owner_id = user.id
        db.add(product)
        db.commit()
        db.refresh(product)
        db.refresh(supplier)
        db.refresh(customer)
        db.refresh(warehouse_a)
        db.refresh(warehouse_b)

        print(f"1. Supplier created: {supplier.id} {supplier.name}")
        print(f"2. Customer created: {customer.id} {customer.name}")
        print(f"3. Warehouse created: {warehouse_a.id} {warehouse_a.name}")

        purchase_order = create_purchase_order(
            db,
            owner_id=user.id,
            supplier_id=supplier.id,
            items=[{"product_id": product.id, "warehouse_id": warehouse_a.id, "quantity_ordered": 100, "unit_cost": 10.0}],
        )
        purchase_order = receive_purchase_order_item(db, owner_id=user.id, purchase_order_id=purchase_order.id, item_id=purchase_order.items[0].id, quantity=60)
        print(f"4. PO partially received: status={purchase_order.status}, received={purchase_order.items[0].quantity_received}")

        sales_order = create_sales_order(
            db,
            owner_id=user.id,
            customer_id=customer.id,
            items=[{"product_id": product.id, "warehouse_id": warehouse_a.id, "quantity_ordered": 30, "unit_price": 25.0}],
        )
        sales_order = confirm_sales_order(db, sales_order.id, owner_id=user.id)
        print(f"5. Sales order confirmed: status={sales_order.status}, reserved={sales_order.items[0].quantity_reserved}")

        sales_order = fulfill_sales_order_item(db, owner_id=user.id, order_id=sales_order.id, item_id=sales_order.items[0].id, quantity=10)
        print(f"6. Sales order partially fulfilled: status={sales_order.status}, fulfilled={sales_order.items[0].quantity_fulfilled}")

        transfer = transfer_stock(
            db,
            product_id=product.id,
            from_warehouse_id=warehouse_a.id,
            to_warehouse_id=warehouse_b.id,
            quantity=15,
            notes="Rebalance to overflow",
        )
        print(f"7. Transfer created: id={transfer.id}, status={transfer.status}")

        return_order = create_return_order(
            db,
            owner_id=user.id,
            sales_order_id=sales_order.id,
            customer_id=customer.id,
            items=[
                {
                    "product_id": product.id,
                    "warehouse_id": warehouse_a.id,
                    "quantity": 2,
                    "return_reason": "DAMAGED_ON_ARRIVAL",
                    "condition": "DAMAGED",
                    "refund_amount": 50.0,
                    "replacement_cost": 20.0,
                    "supplier_id": supplier.id,
                }
            ],
        )
        return_order = approve_return_order(db, return_order.id, owner_id=user.id)
        return_order = receive_return_item(db, owner_id=user.id, return_id=return_order.id, item_id=return_order.items[0].id, quantity=2)
        print(f"8. Return received: status={return_order.status}, refund={return_order.refund_amount}")

        report = get_profit_leakage_report(
            db,
            owner_id=user.id,
            start_date=datetime.now(timezone.utc) - timedelta(days=30),
            end_date=datetime.now(timezone.utc) + timedelta(days=1),
        )
        print(f"9. Profit leakage report: total={report['total_profit_leakage']}, lines={len(report['by_product'])}")

        shipment = create_shipment(
            db,
            owner_id=user.id,
            related_type="PURCHASE_ORDER",
            related_id=str(purchase_order.id),
            carrier_name="Oceanic Freight",
            origin="Port Klang",
            destination="Kuala Lumpur",
            estimated_arrival=datetime.now(timezone.utc) - timedelta(days=2),
        )
        shipment = update_shipment_status(
            db,
            shipment.id,
            owner_id=user.id,
            status="DELAYED",
            delay_reason="Weather delay",
        )
        print(f"10. Shipment delayed: shipment={shipment.shipment_number}, status={shipment.status}")

        impact = calculate_delay_impact(db, shipment.id, owner_id=user.id)
        print(f"11. Delay impact: delay_days={impact['estimated_delay_days']}, risk={impact['risk_level']}, products={impact['affected_products']}")

        position_a = get_stock_position(db, product.id, warehouse_a.id)
        position_b = get_stock_position(db, product.id, warehouse_b.id)
        print(f"Stock A: {position_a}")
        print(f"Stock B: {position_b}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
