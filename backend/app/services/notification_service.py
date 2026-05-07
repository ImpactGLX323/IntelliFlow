from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.plan import get_user_plan, has_plan_access, normalize_plan
from app.models import Notification, NotificationPreference, User, UserDevice


NOTIFICATION_CATEGORIES = {
    "low_stock": {"plan": "FREE", "push_default": True, "email_default": False},
    "stock_received": {"plan": "FREE", "push_default": False, "email_default": False},
    "stock_adjusted": {"plan": "FREE", "push_default": False, "email_default": False},
    "stock_deducted": {"plan": "FREE", "push_default": False, "email_default": False},
    "account_system_alerts": {"plan": "FREE", "push_default": False, "email_default": False},
    "sales_order_alerts": {"plan": "PRO", "push_default": False, "email_default": False},
    "purchase_order_due_overdue": {"plan": "PRO", "push_default": True, "email_default": False},
    "reorder_suggestions": {"plan": "PRO", "push_default": True, "email_default": False},
    "return_spike": {"plan": "PRO", "push_default": True, "email_default": False},
    "profit_leakage": {"plan": "PRO", "push_default": True, "email_default": False},
    "weekly_operations_summary": {"plan": "PRO", "push_default": False, "email_default": False},
    "basic_rag_alerts": {"plan": "PRO", "push_default": True, "email_default": False},
    "shipment_delayed": {"plan": "BOOST", "push_default": True, "email_default": False},
    "customs_hold": {"plan": "BOOST", "push_default": True, "email_default": False},
    "port_pressure_high": {"plan": "BOOST", "push_default": True, "email_default": False},
    "route_risk_increased": {"plan": "BOOST", "push_default": True, "email_default": False},
    "supplier_risk_warning": {"plan": "BOOST", "push_default": True, "email_default": False},
    "ai_recommendation_created": {"plan": "BOOST", "push_default": True, "email_default": False},
    "compliance_risk_detected": {"plan": "BOOST", "push_default": True, "email_default": False},
    "approval_required": {"plan": "BOOST", "push_default": True, "email_default": False},
    "daily_operations_brief": {"plan": "BOOST", "push_default": False, "email_default": False},
}


def allowed_categories_for_plan(plan: str) -> list[str]:
    normalized = normalize_plan(plan)
    return [
        category
        for category, config in NOTIFICATION_CATEGORIES.items()
        if has_plan_access(normalized, config["plan"])
    ]


def ensure_preferences(db: Session, user: User) -> list[NotificationPreference]:
    current_plan = get_user_plan(user)
    allowed = allowed_categories_for_plan(current_plan)
    existing = {
        item.category: item
        for item in db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).all()
    }
    for category in allowed:
        if category in existing:
            continue
        pref = NotificationPreference(
            user_id=user.id,
            category=category,
            enabled=True,
            push_enabled=bool(NOTIFICATION_CATEGORIES[category]["push_default"]),
            email_enabled=bool(NOTIFICATION_CATEGORIES[category]["email_default"]),
        )
        db.add(pref)
        existing[category] = pref
    db.commit()
    return [existing[category] for category in allowed]


def list_notifications(
    db: Session,
    *,
    user: User,
    unread_only: bool = False,
    limit: int = 50,
) -> list[Notification]:
    allowed = allowed_categories_for_plan(get_user_plan(user))
    query = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.category.in_(allowed))
        .order_by(Notification.created_at.desc())
    )
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    return query.limit(limit).all()


def get_unread_count(db: Session, *, user: User) -> int:
    allowed = allowed_categories_for_plan(get_user_plan(user))
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.category.in_(allowed), Notification.read_at.is_(None))
        .count()
    )


def mark_notification_read(db: Session, *, user: User, notification_id: int) -> Notification:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user.id)
        .first()
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        db.add(notification)
        db.commit()
        db.refresh(notification)
    return notification


def register_device(
    db: Session,
    *,
    user: User,
    platform: str,
    push_token: str,
    app_version: str | None = None,
) -> UserDevice:
    device = db.query(UserDevice).filter(UserDevice.push_token == push_token).first()
    if device is None:
        device = UserDevice(
            user_id=user.id,
            platform=platform,
            push_token=push_token,
            app_version=app_version,
        )
    else:
        device.user_id = user.id
        device.platform = platform
        device.app_version = app_version
        device.last_seen_at = datetime.now(timezone.utc)
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def update_preference(
    db: Session,
    *,
    user: User,
    category: str,
    enabled: bool,
    push_enabled: bool,
    email_enabled: bool,
) -> NotificationPreference:
    current_plan = get_user_plan(user)
    category_config = NOTIFICATION_CATEGORIES.get(category)
    if category_config is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification category not found")
    required_plan = category_config["plan"]
    if not has_plan_access(current_plan, required_plan):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "upgrade_required": True,
                "required_plan": "PREMIUM" if required_plan == "PRO" else required_plan,
                "feature": "notification_preferences",
                "message": "Upgrade required to use this feature.",
            },
        )
    preference = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user.id, NotificationPreference.category == category)
        .first()
    )
    if preference is None:
        preference = NotificationPreference(
            user_id=user.id,
            category=category,
            push_enabled=bool(category_config["push_default"]),
            email_enabled=bool(category_config["email_default"]),
        )
    preference.enabled = enabled
    preference.push_enabled = push_enabled
    preference.email_enabled = email_enabled
    db.add(preference)
    db.commit()
    db.refresh(preference)
    return preference


def create_notification(
    db: Session,
    *,
    user: User,
    category: str,
    title: str,
    body: str,
    severity: str = "info",
    data: dict | None = None,
) -> Notification | None:
    current_plan = get_user_plan(user)
    required_plan = NOTIFICATION_CATEGORIES.get(category, {"plan": "FREE"})["plan"]
    if not has_plan_access(current_plan, required_plan):
        return None

    preference = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user.id, NotificationPreference.category == category)
        .first()
    )
    if preference is not None and not preference.enabled:
        return None

    notification = Notification(
        user_id=user.id,
        category=category,
        severity=severity,
        title=title,
        body=body,
        data=data,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
