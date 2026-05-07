from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.core.plan import normalize_plan
from app.models import Organization, User


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "workspace"


def create_organization_for_user(
    db: Session,
    *,
    user: User,
    name: str | None = None,
    subscription_plan: str = "FREE",
) -> Organization:
    base_name = name or user.full_name or user.email.split("@")[0]
    org_name = f"{base_name} Workspace"
    slug_base = _slugify(user.email.split("@")[0] or base_name)
    slug = slug_base
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first() is not None:
        counter += 1
        slug = f"{slug_base}-{counter}"

    organization = Organization(
        name=org_name,
        slug=slug,
        subscription_plan=normalize_plan(subscription_plan),
    )
    db.add(organization)
    db.flush()
    user.organization = organization
    db.add(user)
    return organization


def ensure_user_organization(
    db: Session,
    user: User,
    *,
    default_plan: str = "FREE",
) -> Organization:
    if user.organization is not None:
        user.organization.subscription_plan = normalize_plan(user.organization.subscription_plan)
        return user.organization
    organization = create_organization_for_user(
        db,
        user=user,
        subscription_plan=default_plan,
    )
    db.commit()
    db.refresh(user)
    return organization


def set_user_plan(db: Session, user: User, plan: str) -> Organization:
    organization = ensure_user_organization(db, user, default_plan=plan)
    organization.subscription_plan = normalize_plan(plan)
    db.add(organization)
    db.commit()
    db.refresh(organization)
    db.refresh(user)
    return organization
