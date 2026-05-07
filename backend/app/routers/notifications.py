from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
    NotificationUnreadCountRead,
    UserDeviceCreate,
    UserDeviceRead,
)
from app.services import notification_service


router = APIRouter()


@router.get("/", response_model=list[NotificationRead])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return notification_service.list_notifications(db, user=current_user, unread_only=unread_only, limit=limit)


@router.get("/unread-count", response_model=NotificationUnreadCountRead)
async def get_notification_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"unread_count": notification_service.get_unread_count(db, user=current_user)}


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return notification_service.mark_notification_read(db, user=current_user, notification_id=notification_id)


@router.get("/preferences", response_model=list[NotificationPreferenceRead])
async def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return notification_service.ensure_preferences(db, current_user)


@router.put("/preferences/{category}", response_model=NotificationPreferenceRead)
async def put_notification_preference(
    category: str,
    payload: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return notification_service.update_preference(
        db,
        user=current_user,
        category=category,
        enabled=payload.enabled,
        push_enabled=payload.push_enabled,
        email_enabled=payload.email_enabled,
    )


@router.post("/devices", response_model=UserDeviceRead, status_code=status.HTTP_201_CREATED)
async def post_notification_device(
    payload: UserDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return notification_service.register_device(
        db,
        user=current_user,
        platform=payload.platform,
        push_token=payload.push_token,
        app_version=payload.app_version,
    )
