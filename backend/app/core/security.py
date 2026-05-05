from __future__ import annotations

import os


DEMO_ACCESS_TOKEN = "demo-token"


def is_demo_access_token(token: str | None) -> bool:
    return bool(token) and token == DEMO_ACCESS_TOKEN


def is_dev_environment() -> bool:
    return os.getenv("APP_ENV", "development").strip().lower() == "development"

