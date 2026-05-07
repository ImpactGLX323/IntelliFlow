from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Supplier, User
from app.schemas import SupplierCreate, SupplierRead, SupplierUpdate
from app.services.tenant_service import get_owned_supplier

router = APIRouter()


@router.get("/", response_model=List[SupplierRead])
async def list_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Supplier).filter(Supplier.owner_id == current_user.id).order_by(Supplier.name.asc()).all()


@router.post("/", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = Supplier(**payload.model_dump(), owner_id=current_user.id)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierRead)
async def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_owned_supplier(db, owner_id=current_user.id, supplier_id=supplier_id)


@router.put("/{supplier_id}", response_model=SupplierRead)
async def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = get_owned_supplier(db, owner_id=current_user.id, supplier_id=supplier_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != supplier.name:
        existing = db.query(Supplier).filter(Supplier.name == update_data["name"], Supplier.owner_id == current_user.id).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supplier name already exists")

    for field, value in update_data.items():
        setattr(supplier, field, value)

    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier
