from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import ExternalApiCache


def get_cached_response(db: Session, *, provider_key: str, cache_key: str) -> dict[str, Any] | None:
    record = (
        db.query(ExternalApiCache)
        .filter(
            ExternalApiCache.provider_key == provider_key,
            ExternalApiCache.cache_key == cache_key,
        )
        .first()
    )
    if record is None:
        return None
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        return None
    return record.response_json


def set_cached_response(
    db: Session,
    *,
    provider_key: str,
    cache_key: str,
    response_json: dict[str, Any],
    ttl_seconds: int,
) -> None:
    record = (
        db.query(ExternalApiCache)
        .filter(
            ExternalApiCache.provider_key == provider_key,
            ExternalApiCache.cache_key == cache_key,
        )
        .first()
    )
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    if record is None:
        record = ExternalApiCache(
            provider_key=provider_key,
            cache_key=cache_key,
            response_json=response_json,
            expires_at=expires_at,
        )
        db.add(record)
    else:
        record.response_json = response_json
        record.expires_at = expires_at
    db.commit()
