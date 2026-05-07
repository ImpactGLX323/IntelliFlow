from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from urllib import error, request

import httpx


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def assert_true(name: str, condition: bool, payload: dict | list | str | None = None) -> None:
    if condition:
        print(f"PASS {name}")
        return
    detail = payload if isinstance(payload, str) else json.dumps(payload or {}, default=str)
    print(f"FAIL {name}: {detail}")
    raise SystemExit(1)


def call(base_url: str, method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict]:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    req = request.Request(f"{base_url.rstrip('/')}{path}", method=method)
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with request.urlopen(req, data=payload, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw or "{}")
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            return exc.code, json.loads(raw or "{}")
        except json.JSONDecodeError:
            return exc.code, {"detail": raw}


def contains_secret(value: dict | list | str | None) -> bool:
    text = json.dumps(value or {}, default=str).upper()
    tokens = ("API_KEY", "SECRET", "DATABASE_URL", "FIREBASE", "TOKEN")
    return any(token in text for token in tokens)


def run_live_checks(base_url: str) -> None:
    status, payload = call(base_url, "GET", "/integrations/free/registry")
    assert_true("registry", status == 200 and "providers" in payload, payload)

    status, payload = call(base_url, "GET", "/integrations/free/status")
    assert_true("status", status == 200 and "enabled_providers" in payload, payload)

    status, payload = call(base_url, "GET", "/integrations/free/warehouses/malaysia?limit=5")
    assert_true("warehouses malaysia", status == 200 and payload.get("is_live") is False and isinstance(payload.get("items"), list), payload)

    status, payload = call(base_url, "GET", "/integrations/free/warehouses/nearby?lat=3.0&lng=101.4&radius_km=50")
    assert_true("warehouses nearby", status == 200 and isinstance(payload.get("items"), list), payload)

    status, payload = call(base_url, "GET", "/integrations/free/logistics/malaysia-port-risk")
    assert_true("port risk", status == 200 and payload.get("is_live") is False and "ports" in payload, payload)

    status, payload = call(base_url, "GET", "/integrations/free/finance/bnm-rates?currency=USD")
    assert_true("bnm rates", status == 200 and "rates" in payload, payload)

    status, payload = call(base_url, "GET", "/integrations/free/market/malaysia-demand-signals")
    assert_true(
        "demand signals",
        status == 200 and payload.get("is_live") is False and payload.get("data_truth", "").lower().find("sales volume") >= 0,
        payload,
    )

    status, payload = call(base_url, "GET", "/integrations/marketplaces/own-sales/best-sellers/weekly")
    assert_true("free blocked from own-sales", status in {401, 403}, payload)

    status, payload = call(base_url, "GET", "/integrations/market-intelligence/malaysia-best-sellers/weekly")
    assert_true("free blocked from market-wide", status in {401, 403}, payload)

    combined = {
        "registry": call(base_url, "GET", "/integrations/free/registry")[1],
        "status": call(base_url, "GET", "/integrations/free/status")[1],
    }
    assert_true("no secret exposure", not contains_secret(combined), combined)


async def run_inprocess_checks() -> None:
    os.environ["APP_ENV"] = "test"
    os.environ.setdefault("AI_PROVIDER", "template")
    os.environ.setdefault("DATABASE_URL", "sqlite:////private/tmp/intelliflow_free_integrations_sanity.db")
    os.environ.pop("TEST_PLAN_OVERRIDE", None)

    from app.auth import get_current_user
    from app.database import Base, SessionLocal, engine
    from app.main import app
    from app.models import User
    from app.services.workspace_service import ensure_user_organization

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        def ensure_user(email: str, firebase_uid: str, plan: str) -> User:
            user = db.query(User).filter(User.email == email).first()
            if user is None:
                user = User(email=email, firebase_uid=firebase_uid, full_name=email.split("@")[0], is_active=True)
                db.add(user)
                db.commit()
                db.refresh(user)
            org = ensure_user_organization(db, user, default_plan=plan)
            org.subscription_plan = plan
            db.commit()
            db.refresh(user)
            return user

        free_user = ensure_user("free-integrations@example.com", "free-integrations", "FREE")
        premium_user = ensure_user("premium-integrations@example.com", "premium-integrations", "PRO")
        boost_user = ensure_user("boost-integrations@example.com", "boost-integrations", "BOOST")

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            status = await client.get("/integrations/free/registry")
            assert_true("registry", status.status_code == 200 and "providers" in status.json(), status.json())

            status = await client.get("/integrations/free/status")
            assert_true("status", status.status_code == 200 and "enabled_providers" in status.json(), status.json())

            status = await client.get("/integrations/free/warehouses/malaysia", params={"limit": 5})
            assert_true("warehouses malaysia", status.status_code == 200 and isinstance(status.json().get("items"), list), status.json())

            status = await client.get("/integrations/free/warehouses/nearby", params={"lat": 3.0, "lng": 101.4, "radius_km": 50})
            assert_true("warehouses nearby", status.status_code == 200 and isinstance(status.json().get("items"), list), status.json())

            status = await client.get("/integrations/free/logistics/malaysia-port-risk")
            assert_true("port risk", status.status_code == 200 and status.json().get("is_live") is False, status.json())

            status = await client.get("/integrations/free/finance/bnm-rates", params={"currency": "USD"})
            assert_true("bnm rates", status.status_code == 200 and "rates" in status.json(), status.json())

            status = await client.get("/integrations/free/market/malaysia-demand-signals")
            assert_true("demand signals", status.status_code == 200 and status.json().get("is_live") is False, status.json())

            app.dependency_overrides[get_current_user] = lambda: free_user
            free_response = await client.get("/integrations/marketplaces/own-sales/best-sellers/weekly")
            assert_true("FREE blocked from marketplace own-sales best sellers", free_response.status_code in {401, 403}, free_response.json())

            app.dependency_overrides[get_current_user] = lambda: premium_user
            premium_response = await client.get("/integrations/marketplaces/own-sales/best-sellers/weekly")
            premium_payload = premium_response.json()
            assert_true(
                "PREMIUM own-sales endpoint",
                premium_response.status_code == 200 and premium_payload.get("status") == "not_configured",
                premium_payload,
            )

            app.dependency_overrides[get_current_user] = lambda: free_user
            free_marketwide_response = await client.get("/integrations/market-intelligence/malaysia-best-sellers/weekly")
            assert_true("FREE blocked from market-wide", free_marketwide_response.status_code in {401, 403}, free_marketwide_response.json())

            app.dependency_overrides[get_current_user] = lambda: boost_user
            boost_response = await client.get("/integrations/market-intelligence/malaysia-best-sellers/weekly")
            boost_payload = boost_response.json()
            assert_true(
                "BOOST market-wide endpoint",
                boost_response.status_code == 200 and boost_payload.get("status") == "not_configured",
                boost_payload,
            )

            payload = status.json()
            assert_true("preview not labelled live", payload.get("is_live") is False, payload)
            assert_true("no secret exposure", not contains_secret(payload), payload)
            app.dependency_overrides.clear()
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=None)
    args = parser.parse_args()

    if args.base_url:
        run_live_checks(args.base_url)
        return

    asyncio.run(run_inprocess_checks())


if __name__ == "__main__":
    main()
