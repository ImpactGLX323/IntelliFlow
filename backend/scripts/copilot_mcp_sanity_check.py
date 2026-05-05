from __future__ import annotations

import asyncio
import os
from datetime import datetime
from pathlib import Path
import sys

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ["ENABLE_MCP_DEV_ENDPOINTS"] = "true"
os.environ.setdefault("AI_PROVIDER", "template")
os.environ.setdefault("DATABASE_URL", "sqlite:////private/tmp/intelliflow_copilot_mcp_sanity.db")

from app.database import Base, SessionLocal, engine
from app.models import Product, User
from app.services.stock_ledger_service import get_default_warehouse, receive_purchase


def ensure_test_user(db) -> User:
    user = db.query(User).filter(User.email == "copilot-mcp-sanity@example.com").first()
    if user is None:
        user = User(
            email="copilot-mcp-sanity@example.com",
            firebase_uid="copilot-mcp-sanity",
            full_name="Copilot MCP Sanity",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def ensure_seed_product(db) -> Product:
    user = ensure_test_user(db)
    product = db.query(Product).filter(Product.sku == "COPILOT-MCP-SANITY").first()
    if product is None:
        product = Product(
            name="Copilot MCP Sanity Product",
            sku="COPILOT-MCP-SANITY",
            description="Sanity-check product",
            category="Testing",
            price=19.0,
            cost=7.0,
            current_stock=0,
            min_stock_threshold=20,
            supplier="Sanity Supplier",
            owner_id=user.id,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        warehouse = get_default_warehouse(db)
        receive_purchase(
            db,
            product_id=product.id,
            warehouse_id=warehouse.id,
            quantity=10,
            reference_id=f"COPILOT-MCP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        )
    return product


def step(name: str, fn) -> None:
    try:
        fn()
        print(f"PASS {name}")
    except Exception as exc:
        print(f"FAIL {name}: {exc}")
        raise


async def step_async(name: str, fn) -> None:
    try:
        await fn()
        print(f"PASS {name}")
    except Exception as exc:
        print(f"FAIL {name}: {exc}")
        raise


def assert_ok(response, *, expected_status: int = 200) -> None:
    if response.status_code != expected_status:
        raise RuntimeError(f"expected {expected_status}, got {response.status_code}: {response.text}")


async def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        product = ensure_seed_product(db)

        from app.main import app

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            await step_async(
                "registry",
                lambda: _assert_request(client.get("/mcp-dev/registry", params={"user_plan": "BOOST"})),
            )
            await step_async(
                "get_stock_position",
                lambda: _assert_request(
                        client.post(
                            "/mcp-dev/tools/inventory.get_stock_position",
                            json={
                                "arguments": {"product_id": product.id},
                                "user_context": {"user_plan": "FREE"},
                            },
                        )
                ),
            )
            await step_async(
                "low stock query",
                lambda: _assert_request(
                        client.post(
                            "/ai-copilot/query",
                            json={"message": "What products are low on stock?", "user_plan": "FREE"},
                        )
                ),
            )
            await step_async(
                "sales query",
                lambda: _assert_request(
                        client.post(
                            "/ai-copilot/query",
                            json={"message": "What are my best-selling products this week?", "user_plan": "PREMIUM"},
                        )
                ),
            )
            await step_async(
                "returns query",
                lambda: _assert_request(
                        client.post(
                            "/ai-copilot/query",
                            json={"message": "Which products are leaking profit due to returns?", "user_plan": "PREMIUM"},
                        )
                ),
            )
            await step_async(
                "logistics query",
                lambda: _assert_request(
                        client.post(
                            "/ai-copilot/query",
                            json={"message": "Any delayed shipments?", "user_plan": "BOOST"},
                        )
                ),
            )
            await step_async(
                "rag query",
                lambda: _assert_request(
                        client.post(
                            "/ai-copilot/query",
                            json={"message": "What does Malaysian customs law say about import documentation?", "user_plan": "PREMIUM"},
                        )
                ),
            )
            await step_async(
                "free logistics blocked",
                lambda: _assert_upgrade_request(
                        client.post(
                            "/ai-copilot/query",
                            json={"message": "Any delayed shipments?", "user_plan": "FREE"},
                        )
                ),
            )
    finally:
        db.close()


def assert_upgrade_required(response) -> None:
    assert_ok(response)
    payload = response.json()
    if not payload.get("upgrade_required"):
        raise RuntimeError(f"expected upgrade_required response, got: {payload}")


async def _assert_request(coro) -> None:
    response = await coro
    assert_ok(response)


async def _assert_upgrade_request(coro) -> None:
    response = await coro
    assert_upgrade_required(response)


if __name__ == "__main__":
    asyncio.run(main())
