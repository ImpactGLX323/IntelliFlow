from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Customer, User
from app.schemas import CustomerCreate, CustomerRead
from app.services.tenant_service import get_owned_customer

router = APIRouter()


@router.get("/", response_model=List[CustomerRead])
async def list_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Customer).filter(Customer.owner_id == current_user.id).order_by(Customer.name.asc()).all()


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = Customer(**payload.model_dump(), owner_id=current_user.id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_owned_customer(db, owner_id=current_user.id, customer_id=customer_id)
