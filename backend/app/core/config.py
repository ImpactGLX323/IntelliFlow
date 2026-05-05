from __future__ import annotations

import os
from dataclasses import dataclass


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
    )

