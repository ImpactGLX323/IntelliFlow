from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from app.core.config import get_app_config
from app.models import User


PLAN_RANK = {
    "FREE": 0,
    "PRO": 1,
    "BOOST": 2,
}


def normalize_plan(value: str | None) -> str:
    normalized = (value or "FREE").strip().upper()
    if normalized == "PREMIUM":
        normalized = "PRO"
    if normalized not in PLAN_RANK:
        return "FREE"
    return normalized


def get_user_plan(user: User) -> str:
    override = get_testing_plan_override()
    if override:
        return override
    raw = getattr(user, "plan_level", None)
    if raw:
        return normalize_plan(str(raw))
    organization = getattr(user, "organization", None)
    if organization is not None and getattr(organization, "subscription_plan", None):
        return normalize_plan(str(organization.subscription_plan))
    return "FREE"


def get_testing_plan_override() -> str | None:
    override = get_app_config().testing_plan_override
    if not override:
        return None
    return normalize_plan(override)


def has_plan_access(current_plan: str, required_plan: str) -> bool:
    return PLAN_RANK[normalize_plan(current_plan)] >= PLAN_RANK[normalize_plan(required_plan)]


def require_plan(required_plan: str):
    normalized_required = normalize_plan(required_plan)

    async def dependency(current_user: Annotated[User, Depends(_get_current_user_dependency())]) -> User:
        current_plan = get_user_plan(current_user)
        if not has_plan_access(current_plan, normalized_required):
            label = "PREMIUM" if normalized_required == "PRO" else normalized_required
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "upgrade_required": True,
                    "required_plan": label,
                    "feature": f"{label.lower()}_feature",
                    "message": "Upgrade required to use this feature.",
                },
            )
        setattr(current_user, "plan_level", current_plan)
        return current_user

    return dependency


def _get_current_user_dependency():
    from app.auth import get_current_user

    return get_current_user
