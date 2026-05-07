from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import ExternalApiUsageLog, User


def log_external_api_usage(
    db: Session,
    *,
    provider_key: str,
    endpoint: str,
    user: User | None = None,
    organization_id: int | None = None,
    status_code: int | None = None,
    cache_hit: bool = False,
    plan: str | None = None,
) -> ExternalApiUsageLog:
    record = ExternalApiUsageLog(
        provider_key=provider_key,
        organization_id=organization_id if organization_id is not None else getattr(user, "organization_id", None),
        user_id=getattr(user, "id", None),
        endpoint=endpoint,
        status_code=status_code,
        cache_hit=cache_hit,
        plan=plan,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_usage_logs(db: Session, *, provider_key: str | None = None, limit: int = 100) -> list[ExternalApiUsageLog]:
    query = db.query(ExternalApiUsageLog).order_by(ExternalApiUsageLog.created_at.desc())
    if provider_key:
        query = query.filter(ExternalApiUsageLog.provider_key == provider_key)
    return query.limit(limit).all()
