from __future__ import annotations

import argparse
import json
import sys
from urllib import error, request


def call(method: str, base_url: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict]:
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


def assert_true(name: str, condition: bool, payload: dict | None = None) -> None:
    if condition:
        print(f"PASS {name}")
        return
    print(f"FAIL {name}: {json.dumps(payload or {}, default=str)}")
    raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    status, health = call("GET", base_url, "/health")
    assert_true("health", status == 200 and health.get("status") == "ok", health)

    status, ready = call("GET", base_url, "/ready")
    assert_true("ready", status == 200 and ready.get("status") in {"ready", "degraded", "not_ready"}, ready)

    status, app_config = call("GET", base_url, "/public/app-config")
    assert_true("public app config", status == 200 and "demo_mode_enabled" in app_config, app_config)

    status, bootstrap = call("POST", base_url, "/demo/bootstrap")
    assert_true("demo bootstrap", status == 200 and bootstrap.get("seeded") is True, bootstrap)

    status, login = call("POST", base_url, "/demo/login")
    token = login.get("access_token")
    assert_true("demo login", status == 200 and token == "demo-token", login)

    status, copilot = call(
        "POST",
        base_url,
        "/ai-copilot/query",
        body={
            "message": "What products are low on stock?",
            "organization_id": bootstrap.get("organization_id"),
            "user_plan": bootstrap.get("user_plan", "BOOST"),
            "user_id": bootstrap.get("user_id"),
        },
        token=token,
    )
    payload_text = json.dumps(copilot)
    assert_true("copilot", status == 200 and "answer" in copilot and "DATABASE_URL" not in payload_text, copilot)

    status, inventory = call("GET", base_url, "/api/analytics/dashboard", token=token)
    payload_text = json.dumps(inventory)
    assert_true("inventory endpoint", status == 200 and "DATABASE_URL" not in payload_text, inventory)


if __name__ == "__main__":
    try:
        main()
    except error.URLError as exc:
        print(f"FAIL network: {exc}")
        sys.exit(1)
