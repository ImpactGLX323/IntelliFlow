from __future__ import annotations

import asyncio
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
import sys
from typing import Any

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.auth import get_current_user
from app.database import SessionLocal
from app.main import app
from app.models import User


def ensure_test_user() -> User:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "api-sanity@example.com").first()
        if user is None:
            user = User(
                email="api-sanity@example.com",
                firebase_uid="api-sanity-user",
                full_name="API Sanity User",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    finally:
        db.close()


@contextmanager
def user_override():
    user = ensure_test_user()

    def override_current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_current_user
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_current_user, None)


async def step(name: str, coro):
    try:
        result = await coro
        print(f"PASS {name}")
        return result
    except Exception as exc:
        print(f"FAIL {name}: {exc}")
        raise


def assert_status(response: httpx.Response, expected: int, label: str) -> dict[str, Any]:
    if response.status_code != expected:
        raise RuntimeError(f"{label} returned {response.status_code}: {response.text}")
    return response.json()


async def run() -> None:
    with user_override():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            token = datetime.utcnow().strftime("%Y%m%d%H%M%S")

            warehouse = await step(
                "create warehouse",
                client.post(
                    "/api/warehouses",
                    json={
                        "name": f"API Sanity Warehouse {token}",
                        "code": f"API-SANITY-{token}",
                        "address": "Kuala Lumpur",
                        "is_active": True,
                    },
                ),
            )
            warehouse = assert_status(warehouse, 201, "create warehouse")

            product = await step(
                "create product",
                client.post(
                    "/api/products/",
                    json={
                        "name": "API Sanity Product",
                        "sku": f"API-SANITY-{token}",
                        "description": "Sanity test SKU",
                        "category": "Testing",
                        "price": 25.0,
                        "cost": 10.0,
                        "current_stock": 0,
                        "min_stock_threshold": 5,
                        "supplier": "API Sanity Supplier",
                    },
                ),
            )
            product = assert_status(product, 201, "create product")

            receive_stock = await step(
                "receive stock",
                client.post(
                    "/api/inventory/receive",
                    json={
                        "product_id": product["id"],
                        "warehouse_id": warehouse["id"],
                        "quantity": 100,
                        "reference_id": "SANITY-RECEIPT-1",
                    },
                ),
            )
            assert_status(receive_stock, 201, "receive stock")

            stock = await step(
                "check stock",
                client.get(f"/api/inventory/stock/{product['id']}", params={"warehouse_id": warehouse["id"]}),
            )
            stock = assert_status(stock, 200, "check stock")
            if stock["on_hand"] < 100:
                raise RuntimeError(f"expected on_hand >= 100, got {stock}")

            customer = await step(
                "create customer",
                client.post(
                    "/api/customers/",
                    json={
                        "name": "API Sanity Customer",
                        "email": f"customer-{token}@example.com",
                        "phone": "0123456789",
                        "address": "Petaling Jaya",
                    },
                ),
            )
            customer = assert_status(customer, 201, "create customer")

            sales_order = await step(
                "create sales order",
                client.post(
                    "/api/sales-orders/",
                    json={
                        "customer_id": customer["id"],
                        "notes": "API sanity sales order",
                        "items": [
                            {
                                "product_id": product["id"],
                                "warehouse_id": warehouse["id"],
                                "quantity_ordered": 10,
                                "unit_price": 25.0,
                            }
                        ],
                    },
                ),
            )
            sales_order = assert_status(sales_order, 201, "create sales order")

            confirmed_sales_order = await step(
                "confirm sales order",
                client.post(f"/api/sales-orders/{sales_order['id']}/confirm"),
            )
            confirmed_sales_order = assert_status(confirmed_sales_order, 200, "confirm sales order")

            fulfilled_sales_order = await step(
                "fulfill sales order",
                client.post(
                    f"/api/sales-orders/{sales_order['id']}/items/{confirmed_sales_order['items'][0]['id']}/fulfill",
                    json={"quantity": 10},
                ),
            )
            assert_status(fulfilled_sales_order, 200, "fulfill sales order")

            supplier = await step(
                "create supplier",
                client.post(
                    "/api/suppliers/",
                    json={
                        "name": "API Sanity Supplier",
                        "email": f"supplier-{token}@example.com",
                        "phone": "0199999999",
                        "address": "Shah Alam",
                        "lead_time_days": 7,
                    },
                ),
            )
            supplier = assert_status(supplier, 201, "create supplier")

            purchase_order = await step(
                "create purchase order",
                client.post(
                    "/api/purchase-orders/",
                    json={
                        "supplier_id": supplier["id"],
                        "notes": "API sanity purchase order",
                        "items": [
                            {
                                "product_id": product["id"],
                                "warehouse_id": warehouse["id"],
                                "quantity_ordered": 40,
                                "unit_cost": 9.5,
                            }
                        ],
                    },
                ),
            )
            purchase_order = assert_status(purchase_order, 201, "create purchase order")

            mark_ordered = await step(
                "mark purchase order ordered",
                client.post(f"/api/purchase-orders/{purchase_order['id']}/mark-ordered"),
            )
            assert_status(mark_ordered, 200, "mark purchase order ordered")

            receive_po = await step(
                "receive purchase order",
                client.post(
                    f"/api/purchase-orders/{purchase_order['id']}/items/{purchase_order['items'][0]['id']}/receive",
                    json={"quantity": 20},
                ),
            )
            assert_status(receive_po, 200, "receive purchase order")

            return_order = await step(
                "create return",
                client.post(
                    "/api/returns/",
                    json={
                        "customer_id": customer["id"],
                        "notes": "API sanity return",
                        "items": [
                            {
                                "product_id": product["id"],
                                "warehouse_id": warehouse["id"],
                                "quantity": 2,
                                "return_reason": "DEFECTIVE",
                                "condition": "DAMAGED",
                                "refund_amount": 20.0,
                                "replacement_cost": 8.0,
                            }
                        ],
                    },
                ),
            )
            return_order = assert_status(return_order, 201, "create return")

            approve_return = await step(
                "approve return",
                client.post(f"/api/returns/{return_order['id']}/approve"),
            )
            assert_status(approve_return, 200, "approve return")

            receive_return = await step(
                "receive return item",
                client.post(
                    f"/api/returns/{return_order['id']}/items/{return_order['items'][0]['id']}/receive",
                    json={"quantity": 2},
                ),
            )
            assert_status(receive_return, 200, "receive return item")

            shipment = await step(
                "create shipment",
                client.post(
                    "/api/shipments",
                    json={
                        "related_type": "SALES_ORDER",
                        "related_id": str(sales_order["id"]),
                        "carrier_name": "Sanity Carrier",
                        "tracking_number": "SANITY-TRACK-1",
                        "origin": "Port Klang",
                        "destination": "Johor Bahru",
                        "estimated_arrival": (datetime.utcnow() - timedelta(days=2)).isoformat(),
                        "customs_status": "IN_REVIEW",
                    },
                ),
            )
            shipment = assert_status(shipment, 201, "create shipment")

            shipment_leg = await step(
                "add shipment leg",
                client.post(
                    f"/api/shipments/{shipment['id']}/legs",
                    json={
                        "sequence_number": 1,
                        "origin": "Port Klang",
                        "destination": "Johor Bahru",
                        "transport_mode": "ROAD",
                        "carrier_name": "Sanity Carrier",
                        "status": "IN_TRANSIT",
                    },
                ),
            )
            assert_status(shipment_leg, 200, "add shipment leg")

            delayed_shipment = await step(
                "mark shipment delayed",
                client.post(
                    f"/api/shipments/{shipment['id']}/status",
                    json={
                        "status": "DELAYED",
                        "delay_reason": "Sanity test delay",
                        "customs_status": "HOLD",
                    },
                ),
            )
            assert_status(delayed_shipment, 200, "mark shipment delayed")

            delay_impact = await step(
                "delay impact",
                client.get(f"/api/shipments/{shipment['id']}/delay-impact"),
            )
            assert_status(delay_impact, 200, "delay impact")


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
