from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_app_config


router = APIRouter()


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/health")
async def health():
    config = get_app_config()
    return {
        "status": "ok",
        "service": "intelliflow-backend",
        "version": config.version,
        "environment": config.app_env,
        "timestamp": _timestamp(),
    }


@router.get("/ready")
async def ready():
    from app.database import engine

    config = get_app_config()
    database_status = "ok"
    rag_status = "ok" if config.app_env != "production" or config.demo_mode_enabled else "not_configured"
    mcp_status = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        database_status = "error"
    status = "ready"
    if database_status == "error" or mcp_status == "error":
        status = "not_ready"
    elif rag_status in {"error", "not_configured"}:
        status = "degraded"
    return {
        "status": status,
        "database": database_status,
        "rag": rag_status,
        "mcp": mcp_status,
        "ai_provider": config.ai_provider if config.ai_provider in {"template", "openai"} else "none",
        "timestamp": _timestamp(),
    }


@router.get("/public/app-config")
async def public_app_config():
    config = get_app_config()
    return {
        "app_name": config.app_name,
        "environment": config.app_env,
        "demo_mode_enabled": config.demo_mode_enabled,
        "auth_mode": config.auth_mode,
        "ai_provider": config.ai_provider if config.ai_provider in {"template", "openai"} else "none",
        "features": {
            "inventory": True,
            "sales": True,
            "returns": True,
            "logistics_preview": True,
            "mcp": True,
            "rag": True,
            "ai_copilot": True,
        },
        "plans": ["FREE", "PREMIUM", "BOOST"],
        "support_email": config.support_email,
        "timestamp": _timestamp(),
    }

