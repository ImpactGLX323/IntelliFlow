from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import get_app_config
from app.models import User
from app.services.demo_seed_service import DEMO_EMAIL, DEMO_FIREBASE_UID, DEMO_NAME, ensure_demo_seed_data


def is_demo_mode_enabled() -> bool:
    return get_app_config().demo_mode_enabled


def get_demo_user_context() -> dict[str, str | bool]:
    config = get_app_config()
    return {
        "demo_mode_enabled": config.demo_mode_enabled,
        "organization_id": config.demo_org_id,
        "user_id": config.demo_user_id,
        "user_plan": config.demo_user_plan,
        "email": DEMO_EMAIL,
        "name": DEMO_NAME,
    }


def ensure_demo_data_seeded(db: Session) -> dict[str, object]:
    context = get_demo_user_context()
    numeric_demo_user_id = _resolve_demo_numeric_user_id(db)
    result = ensure_demo_seed_data(db, demo_user_id=numeric_demo_user_id)
    return {**context, **result}


def reset_demo_data(db: Session) -> dict[str, bool]:
    # Resetting the demo workspace is optional. The current implementation keeps
    # demo data idempotent and only exposes a reset hook for future extension.
    _ = db
    return {"reset": False}


def _resolve_demo_numeric_user_id(db: Session) -> int:
    config = get_app_config()
    raw = config.demo_user_id
    if raw.isdigit():
        return int(raw)
    existing = db.query(User).filter(User.firebase_uid == DEMO_FIREBASE_UID).first()
    if existing is not None:
        return existing.id
    max_id = db.query(func.max(User.id)).scalar()
    return int(max_id or 0) + 1
