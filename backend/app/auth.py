from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import firebase_admin
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import joinedload

from app.core.config import get_app_config
from app.core.demo import ensure_demo_data_seeded, is_demo_mode_enabled
from app.core.plan import get_user_plan, normalize_plan
from app.core.security import is_demo_access_token
from app.database import get_db
from app.firebase_admin import init_firebase_admin
from app.models import Organization, User
from app.services.workspace_service import create_organization_for_user, ensure_user_organization

bearer_scheme = HTTPBearer(auto_error=False)

def get_user_by_firebase_uid(db: Session, firebase_uid: str) -> Optional[User]:
    return db.query(User).options(joinedload(User.organization)).filter(User.firebase_uid == firebase_uid).first()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials or credentials.scheme.lower() != "bearer":
        raise credentials_exception

    token = credentials.credentials

    if is_demo_access_token(token):
        if not is_demo_mode_enabled():
            raise credentials_exception
        demo_context = ensure_demo_data_seeded(db)
        user = db.query(User).options(joinedload(User.organization)).filter(User.email == demo_context["email"]).first()
        if user is None:
            raise credentials_exception
        config = get_app_config()
        if user.organization is None:
            organization = db.query(Organization).filter(Organization.slug == config.demo_org_id).first()
            if organization is None:
                organization = Organization(
                    name="IntelliFlow Demo Workspace",
                    slug=config.demo_org_id,
                    subscription_plan=normalize_plan(config.demo_user_plan),
                )
                db.add(organization)
                db.flush()
            user.organization = organization
            db.add(user)
            db.commit()
            db.refresh(user)
        user.organization.subscription_plan = normalize_plan(config.demo_user_plan)
        setattr(user, "organization_id", user.organization.id)
        effective_plan = get_user_plan(user)
        setattr(user, "plan_level", effective_plan)
        setattr(user, "subscription_plan", effective_plan)
        setattr(user, "is_demo_user", True)
        return user

    if not firebase_admin._apps:
        app = init_firebase_admin()
        if app is None:
            raise credentials_exception

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise credentials_exception

    firebase_uid = decoded.get("uid")
    if not firebase_uid:
        raise credentials_exception

    email = decoded.get("email")
    user = get_user_by_firebase_uid(db, firebase_uid=firebase_uid)
    if user is None:
        if not email:
            raise credentials_exception
        name = decoded.get("name") or decoded.get("displayName")
        user = User(
            email=email,
            firebase_uid=firebase_uid,
            full_name=name,
        )
        db.add(user)
        db.flush()
        create_organization_for_user(db, user=user, subscription_plan="FREE")
        db.commit()
        db.refresh(user)
    else:
        ensure_user_organization(db, user, default_plan="FREE")

    effective_plan = get_user_plan(user)
    setattr(user, "organization_id", user.organization.id if user.organization else None)
    setattr(user, "plan_level", effective_plan)
    setattr(user, "subscription_plan", effective_plan)
    setattr(user, "is_demo_user", False)
    return user
