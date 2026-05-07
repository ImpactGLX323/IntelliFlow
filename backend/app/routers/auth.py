from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse
from app.auth import (
    get_current_user,
)
from app.core.plan import get_user_plan
from app.services.workspace_service import create_organization_for_user, ensure_user_organization

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.firebase_uid == user_data.firebase_uid)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        firebase_uid=user_data.firebase_uid,
        full_name=user_data.full_name
    )
    db.add(new_user)
    db.flush()
    create_organization_for_user(db, user=new_user, subscription_plan="FREE")
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_user_organization(db, current_user, default_plan="FREE")
    setattr(current_user, "organization_id", current_user.organization.id if current_user.organization else None)
    setattr(current_user, "subscription_plan", get_user_plan(current_user))
    return current_user
