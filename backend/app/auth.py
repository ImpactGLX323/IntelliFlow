from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import firebase_admin
from firebase_admin import auth as firebase_auth

from app.database import get_db
from app.firebase_admin import init_firebase_admin
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)

def get_user_by_firebase_uid(db: Session, firebase_uid: str) -> Optional[User]:
    return db.query(User).filter(User.firebase_uid == firebase_uid).first()

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
        db.commit()
        db.refresh(user)

    return user
