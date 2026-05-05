from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_app_config
from app.core.demo import ensure_demo_data_seeded, is_demo_mode_enabled, reset_demo_data
from app.core.security import DEMO_ACCESS_TOKEN, is_dev_environment
from app.database import get_db


router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/bootstrap")
async def demo_bootstrap(db: Session = Depends(get_db)):
    if not is_demo_mode_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"demo_mode_enabled": False, "message": "Demo mode is disabled."},
        )
    result = ensure_demo_data_seeded(db)
    return {
        "demo_mode_enabled": True,
        "organization_id": result["organization_id"],
        "user_id": result["user_id"],
        "user_plan": result["user_plan"],
        "seeded": result["seeded"],
        "message": "Demo workspace ready.",
    }


@router.post("/login")
async def demo_login(db: Session = Depends(get_db)):
    if not is_demo_mode_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"demo_mode_enabled": False, "message": "Demo mode is disabled."},
        )
    result = ensure_demo_data_seeded(db)
    return {
        "access_token": DEMO_ACCESS_TOKEN,
        "token_type": "bearer",
        "user": {
            "id": result["user_id"],
            "email": result["email"],
            "name": result["name"],
            "organization_id": result["organization_id"],
            "plan": result["user_plan"],
        },
    }


@router.post("/reset")
async def demo_reset(db: Session = Depends(get_db)):
    config = get_app_config()
    if not config.demo_mode_enabled or not is_dev_environment():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo reset is disabled.")
    return reset_demo_data(db)
