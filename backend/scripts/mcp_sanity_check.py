from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.mcp.schemas import PlanLevel
from app.mcp.server import InternalMCPServer
from app.models import Customer, Product, Supplier, User, Warehouse
from app.services.logistics_service import add_shipment_leg, create_route, create_shipment, update_shipment_status
from app.services.purchasing_service import create_purchase_order, mark_purchase_order_ordered, receive_purchase_order_item
from app.services.returns_service import approve_return_order, create_return_order, receive_return_item
from app.services.sales_service import confirm_sales_order, create_sales_order, fulfill_sales_order_item
from app.services.stock_ledger_service import receive_purchase


def ensure_test_user(db) -> User:
    user = db.query(User).filter(User.email == "mcp-sanity@example.com").first()
    if user is None:
        user = User(
            email="mcp-sanity@example.com",
            firebase_uid="mcp-sanity-user",
            full_name="MCP Sanity User",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def build_contexts(client, user: User) -> dict[str, object]:
    return {
        "FREE": client.build_context(user),
        "PRO": client.build_system_context(plan_level=PlanLevel.PRO),
        "BOOST": client.build_system_context(plan_level=PlanLevel.BOOST),
    }


def step(name: str, fn):
    try:
        fn()
        print(f"PASS {name}")
    except Exception as exc:
        print(f"FAIL {name}: {exc}")
        raise


def seed_operational_data(db):
    token = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    warehouse_a = Warehouse(name=f"MCP Main {token}", code=f"MCP-MAIN-{token}", address="KL", is_active=True)
    warehouse_b = Warehouse(name=f"MCP Overflow {token}", code=f"MCP-OVR-{token}", address="PJ", is_active=True)
    db.add_all([warehouse_a, warehouse_b])
    db.commit()
    db.refresh(warehouse_a)
    db.refresh(warehouse_b)

    user = ensure_test_user(db)
    product = Product(
        name="MCP Sanity Product",
        sku=f"MCP-SKU-{token}",
        description="MCP test product",
        category="Testing",
        price=30.0,
        cost=12.0,
        current_stock=0,
        min_stock_threshold=10,
        supplier="MCP Supplier",
        owner_id=user.id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    receive_purchase(
        db,
        product_id=product.id,
        warehouse_id=warehouse_a.id,
        quantity=120,
        reference_id=f"MCP-RECV-{token}",
    )
    receive_purchase(
        db,
        product_id=product.id,
        warehouse_id=warehouse_b.id,
        quantity=35,
        reference_id=f"MCP-RECV-B-{token}",
    )

    customer = Customer(name=f"MCP Customer {token}", email=f"mcp-customer-{token}@example.com")
    supplier = Supplier(name=f"MCP Supplier {token}", email=f"mcp-supplier-{token}@example.com", lead_time_days=9)
    db.add_all([customer, supplier])
    db.commit()
    db.refresh(customer)
    db.refresh(supplier)

    sales_order = create_sales_order(
        db,
        customer_id=customer.id,
        items=[{"product_id": product.id, "warehouse_id": warehouse_a.id, "quantity_ordered": 15, "unit_price": 30.0}],
        notes="MCP sanity SO",
    )
    sales_order = confirm_sales_order(db, sales_order.id)
    sales_order = fulfill_sales_order_item(db, order_id=sales_order.id, item_id=sales_order.items[0].id, quantity=10)

    purchase_order = create_purchase_order(
        db,
        supplier_id=supplier.id,
        items=[{"product_id": product.id, "warehouse_id": warehouse_a.id, "quantity_ordered": 50, "unit_cost": 11.0}],
        notes="MCP sanity PO",
    )
    purchase_order = mark_purchase_order_ordered(db, purchase_order.id)
    purchase_order = receive_purchase_order_item(db, purchase_order_id=purchase_order.id, item_id=purchase_order.items[0].id, quantity=20)

    return_order = create_return_order(
        db,
        sales_order_id=sales_order.id,
        customer_id=customer.id,
        items=[{
            "product_id": product.id,
            "warehouse_id": warehouse_a.id,
            "quantity": 3,
            "return_reason": "DEFECTIVE",
            "condition": "DAMAGED",
            "refund_amount": 25.0,
            "replacement_cost": 10.0,
            "supplier_id": supplier.id,
        }],
        notes="MCP sanity return",
    )
    return_order = approve_return_order(db, return_order.id)
    return_order = receive_return_item(db, return_id=return_order.id, item_id=return_order.items[0].id, quantity=3)

    route = create_route(
        db,
        name=f"MCP Route {token}",
        origin="Port Klang",
        destination="Johor Bahru",
        mode="ROAD",
        average_transit_days=2,
        risk_level="MEDIUM",
    )

    shipment = create_shipment(
        db,
        related_type="SALES_ORDER",
        related_id=str(sales_order.id),
        carrier_name="MCP Carrier",
        tracking_number=f"MCP-TRACK-{token}",
        origin="Port Klang",
        destination="Johor Bahru",
        estimated_arrival=datetime.utcnow() - timedelta(days=2),
        customs_status="IN_REVIEW",
    )
    shipment = add_shipment_leg(
        db,
        shipment.id,
        sequence_number=1,
        origin="Port Klang",
        destination="Johor Bahru",
        transport_mode="ROAD",
        carrier_name="MCP Carrier",
        status="IN_TRANSIT",
    )
    shipment = update_shipment_status(
        db,
        shipment.id,
        status="DELAYED",
        delay_reason="MCP sanity delay",
        customs_status="HOLD",
    )

    return {
        "user": user,
        "product": product,
        "warehouse_a": warehouse_a,
        "warehouse_b": warehouse_b,
        "sales_order": sales_order,
        "purchase_order": purchase_order,
        "return_order": return_order,
        "route": route,
        "shipment": shipment,
    }


def main() -> None:
    db = SessionLocal()
    try:
        server = InternalMCPServer()
        client = server  # direct server invoke/read API
        data = seed_operational_data(db)

        from app.mcp.client import InternalMCPClient

        internal_client = InternalMCPClient(server)
        contexts = build_contexts(internal_client, data["user"])

        sku = data["product"].sku
        warehouse_a_id = data["warehouse_a"].id
        warehouse_b_id = data["warehouse_b"].id
        product_id = data["product"].id
        shipment_id = data["shipment"].id
        route_id = data["route"].id

        step("inventory resource sku", lambda: client.read_resource(db=db, context=contexts["FREE"], uri=f"inventory://sku/{sku}"))
        step("inventory resource sku warehouse", lambda: client.read_resource(db=db, context=contexts["FREE"], uri=f"inventory://sku/{sku}/warehouse/{warehouse_a_id}"))
        step("inventory resource low stock", lambda: client.read_resource(db=db, context=contexts["FREE"], uri="inventory://low-stock"))
        step("inventory resource movements", lambda: client.read_resource(db=db, context=contexts["FREE"], uri=f"inventory://stock-movements/{sku}"))

        step("inventory tool stock position", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="inventory.get_stock_position", payload={"sku": sku, "warehouse_id": warehouse_a_id}))
        step("inventory tool ATP", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="inventory.get_available_to_promise", payload={"product_id": product_id, "warehouse_id": warehouse_a_id}))
        step("inventory tool low stock items", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="inventory.get_low_stock_items", payload={"warehouse_id": warehouse_a_id}))
        step("inventory tool days of cover", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="inventory.calculate_days_of_cover", payload={"product_id": product_id, "warehouse_id": warehouse_a_id, "lookback_days": 30}))
        step("inventory tool recommend transfer", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="inventory.recommend_stock_transfer", payload={"product_id": product_id, "target_warehouse_id": warehouse_b_id}))
        step("inventory tool stock adjustment request", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="inventory.create_stock_adjustment_request", payload={"product_id": product_id, "warehouse_id": warehouse_a_id, "quantity": 2, "adjustment_type": "NEGATIVE", "reason": "Cycle count variance"}))
        step("inventory tool transfer request", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="inventory.create_transfer_request", payload={"product_id": product_id, "from_warehouse_id": warehouse_a_id, "to_warehouse_id": warehouse_b_id, "quantity": 5}))

        step("sales resource weekly", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="sales://weekly"))
        step("sales resource sku weekly", lambda: client.read_resource(db=db, context=contexts["PRO"], uri=f"sales://sku/{sku}/weekly"))
        step("sales resource top products", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="sales://top-products"))
        step("sales resource channel performance", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="sales://channel/UNSPECIFIED/performance"))
        step("sales tool best sellers", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="sales.get_best_selling_products", payload={"days": 30, "limit": 5}))
        step("sales tool velocity", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="sales.calculate_sales_velocity", payload={"product_id": product_id, "days": 30}))
        step("sales tool anomaly", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="sales.detect_sales_anomaly", payload={"product_id": product_id, "days": 7}))
        step("sales tool compare channel", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="sales.compare_sales_by_channel", payload={"days": 30}))
        step("sales tool margin", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="sales.calculate_product_margin", payload={"product_id": product_id}))

        step("returns resource weekly", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="returns://weekly"))
        step("returns resource sku", lambda: client.read_resource(db=db, context=contexts["PRO"], uri=f"returns://sku/{sku}"))
        step("returns resource high return products", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="returns://high-return-products"))
        step("returns tool return rate", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="returns.get_return_rate", payload={"product_id": product_id}))
        step("returns tool classify reasons", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="returns.classify_return_reasons", payload={"product_id": product_id}))
        step("returns tool adjusted margin", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="returns.calculate_return_adjusted_margin", payload={"product_id": product_id}))
        step("returns tool spike", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="returns.detect_return_spike", payload={"product_id": product_id, "days": 7}))
        step("returns tool supplier linkage", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="returns.link_returns_to_supplier", payload={"product_id": product_id}))
        step("returns tool warehouse linkage", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="returns.link_returns_to_warehouse", payload={"product_id": product_id}))
        step("returns tool quality investigation", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="returns.create_quality_investigation", payload={"product_id": product_id, "issue_summary": "Repeated defects"}))

        step("logistics resource shipment", lambda: client.read_resource(db=db, context=contexts["BOOST"], uri=f"shipment://{shipment_id}"))
        step("logistics resource international active", lambda: client.read_resource(db=db, context=contexts["BOOST"], uri="shipment://international/active"))
        step("logistics resource route", lambda: client.read_resource(db=db, context=contexts["BOOST"], uri=f"route://{route_id}"))
        step("logistics resource route delays", lambda: client.read_resource(db=db, context=contexts["BOOST"], uri="route://delays"))
        step("logistics tool active shipments", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.get_active_shipments", payload={}))
        step("logistics tool route status", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.get_route_status", payload={"route_id": route_id}))
        step("logistics tool eta", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.get_eta", payload={"shipment_id": shipment_id}))
        step("logistics tool late shipments", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.detect_late_shipments", payload={"threshold_days": 1}))
        step("logistics tool delay impact", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.calculate_delay_impact", payload={"shipment_id": shipment_id}))
        step("logistics tool affected orders", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.find_affected_orders", payload={"shipment_id": shipment_id}))
        step("logistics tool reroute", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.recommend_reroute", payload={"shipment_id": shipment_id}))
        step("logistics tool exception", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="logistics.create_logistics_exception", payload={"shipment_id": shipment_id, "issue_summary": "Delay review"}))

        step("rag resource official doc", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="docs://official/customs-act-1967"))
        step("rag resource customs", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="docs://customs"))
        step("rag resource road transport", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="docs://road-transport"))
        step("rag resource tax", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="docs://tax"))
        step("rag resource anti corruption", lambda: client.read_resource(db=db, context=contexts["PRO"], uri="docs://anti-corruption"))
        step("rag tool search docs", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="rag.search_official_docs", payload={"query": "customs"}))
        step("rag tool answer citations", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="rag.answer_with_citations", payload={"query": "What does Malaysian customs law say about shipment declarations?"}))
        step("rag tool summarize regulation", lambda: client.invoke(db=db, context=contexts["PRO"], tool_name="rag.summarize_relevant_regulation", payload={"query": "summarize customs requirements", "topic": "customs"}))
        step("rag tool customs risk", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="rag.check_customs_risk", payload={"query": "Customs hold on delayed shipment"}))
        step("rag tool transport compliance", lambda: client.invoke(db=db, context=contexts["BOOST"], tool_name="rag.check_transport_compliance", payload={"query": "Road transport compliance for domestic delivery"}))

        step(
            "access rule free inventory tool denied",
            lambda: expect_forbidden(client.invoke, db=db, context=contexts["FREE"], tool_name="inventory.get_stock_position", payload={"product_id": product_id}),
        )
        step(
            "access rule pro logistics denied",
            lambda: expect_forbidden(client.invoke, db=db, context=contexts["PRO"], tool_name="logistics.get_eta", payload={"shipment_id": shipment_id}),
        )

    finally:
        db.close()


def expect_forbidden(fn, **kwargs):
    from fastapi import HTTPException

    try:
        fn(**kwargs)
    except HTTPException as exc:
        if exc.status_code == 403:
            return
        raise
    raise RuntimeError("Expected HTTP 403 but call succeeded")


if __name__ == "__main__":
    main()
