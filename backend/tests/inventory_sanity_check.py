import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import Base
from app.models import Product, User, Warehouse
from app.services.stock_ledger_service import (
    adjust_stock,
    get_stock_position,
    receive_purchase,
    reserve_stock,
    consume_reservation,
    transfer_stock,
)


def run() -> None:
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        user = User(email="test@example.com", firebase_uid="firebase-test", full_name="Test User")
        db.add(user)
        db.flush()

        product = Product(
            name="Widget",
            sku="WIDGET-001",
            price=10.0,
            cost=4.0,
            current_stock=0,
            min_stock_threshold=5,
            owner_id=user.id,
        )
        warehouse_a = Warehouse(name="Warehouse A", code="WHA")
        warehouse_b = Warehouse(name="Warehouse B", code="WHB")
        db.add_all([product, warehouse_a, warehouse_b])
        db.commit()
        db.refresh(product)
        db.refresh(warehouse_a)
        db.refresh(warehouse_b)

        receive_purchase(db, product_id=product.id, warehouse_id=warehouse_a.id, quantity=100)
        case_1 = get_stock_position(db, product.id, warehouse_a.id)
        assert case_1["on_hand"] == 100 and case_1["reserved"] == 0 and case_1["available"] == 100

        reservation = reserve_stock(db, product_id=product.id, warehouse_id=warehouse_a.id, quantity=30)
        case_2 = get_stock_position(db, product.id, warehouse_a.id)
        assert case_2["on_hand"] == 100 and case_2["reserved"] == 30 and case_2["available"] == 70

        consume_reservation(db, reservation.id)
        case_3 = get_stock_position(db, product.id, warehouse_a.id)
        assert case_3["on_hand"] == 70 and case_3["reserved"] == 0 and case_3["available"] == 70

        adjust_stock(
            db,
            product_id=product.id,
            warehouse_id=warehouse_a.id,
            quantity=10,
            adjustment_type="NEGATIVE",
            reason="Cycle count correction",
        )
        case_4 = get_stock_position(db, product.id, warehouse_a.id)
        assert case_4["on_hand"] == 60 and case_4["available"] == 60

        reserve_failed = False
        try:
            reserve_stock(db, product_id=product.id, warehouse_id=warehouse_a.id, quantity=999)
        except Exception:
            reserve_failed = True
        assert reserve_failed is True

        transfer_stock(
            db,
            product_id=product.id,
            from_warehouse_id=warehouse_a.id,
            to_warehouse_id=warehouse_b.id,
            quantity=20,
            notes="Inter-warehouse rebalance",
        )
        case_6_a = get_stock_position(db, product.id, warehouse_a.id)
        case_6_b = get_stock_position(db, product.id, warehouse_b.id)
        assert case_6_a["on_hand"] == 40 and case_6_a["available"] == 40
        assert case_6_b["on_hand"] == 20 and case_6_b["available"] == 20
    finally:
        db.close()


if __name__ == "__main__":
    run()
    print("Inventory sanity checks passed.")
