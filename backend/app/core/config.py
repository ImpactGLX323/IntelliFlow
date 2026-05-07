from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


LOCAL_DEV_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "exp://localhost:8081",
}


@dataclass(frozen=True)
class AppConfig:
    app_name: str
    app_env: str
    demo_mode_enabled: bool
    demo_org_id: str
    demo_user_id: str
    demo_user_plan: str
    ai_provider: str
    cors_origins: list[str]
    support_email: str
    version: str
    auth_mode: str
    testing_plan_override: Optional[str]
    free_api_cache_ttl_seconds: int
    enable_free_api_dev_endpoints: bool


def _env_flag(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    values = {item.strip() for item in raw.split(",") if item.strip()}
    if get_app_env() == "development":
        values.update(LOCAL_DEV_ORIGINS)
    return sorted(values)


def get_app_env() -> str:
    return os.getenv("APP_ENV", "development").strip().lower() or "development"


def get_app_config() -> AppConfig:
    demo_mode_enabled = _env_flag("DEMO_MODE_ENABLED", False)
    auth_mode = os.getenv("AUTH_MODE", "").strip().lower()
    if not auth_mode:
        auth_mode = "hybrid" if demo_mode_enabled else "firebase"
    testing_plan_override = os.getenv("TEST_PLAN_OVERRIDE", "").strip().upper() or None
    if testing_plan_override == "PREMIUM":
        testing_plan_override = "PRO"
    if testing_plan_override not in {None, "FREE", "PRO", "BOOST"}:
        testing_plan_override = None
    if testing_plan_override is None and get_app_env() == "development":
        testing_plan_override = "BOOST"
    return AppConfig(
        app_name=os.getenv("APP_NAME", "IntelliFlow"),
        app_env=get_app_env(),
        demo_mode_enabled=demo_mode_enabled,
        demo_org_id=os.getenv("DEMO_ORG_ID", "demo-org"),
        demo_user_id=os.getenv("DEMO_USER_ID", "demo-user"),
        demo_user_plan=os.getenv("DEMO_USER_PLAN", "BOOST").upper(),
        ai_provider=os.getenv("AI_PROVIDER", "none").strip().lower() or "none",
        cors_origins=_parse_cors_origins(),
        support_email=os.getenv("SUPPORT_EMAIL", "support@intelliflow.local"),
        version=os.getenv("APP_VERSION", "1.0.0"),
        auth_mode=auth_mode,
        testing_plan_override=testing_plan_override,
        free_api_cache_ttl_seconds=int(os.getenv("FREE_API_CACHE_TTL_SECONDS", "900") or "900"),
        enable_free_api_dev_endpoints=_env_flag("ENABLE_FREE_API_DEV_ENDPOINTS", True),
    )
