from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging
from app.database import get_db
from app.models import Product, User
from app.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.auth import get_current_user
from app.services.stock_ledger_service import (
    adjust_stock,
    get_default_warehouse,
    seed_product_stock_from_legacy_current_stock,
    sync_product_current_stock,
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(
        "Create product request",
        extra={
            "owner_id": current_user.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "supplier": product.supplier,
            "price": product.price,
            "cost": product.cost,
            "current_stock": product.current_stock,
            "min_stock_threshold": product.min_stock_threshold,
        },
    )
    sku = product.sku
    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this SKU already exists"
        )

    product_data = product.model_dump()
    opening_stock = product_data.pop("current_stock", 0)
    db_product = Product(**product_data, current_stock=0, owner_id=current_user.id)
    try:
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        seed_product_stock_from_legacy_current_stock(
            db,
            product=db_product,
            quantity=opening_stock,
            created_by=current_user.id,
        )
        db.refresh(db_product)
        return db_product
    except Exception:
        logger.exception(
            "Create product failed",
            extra={"owner_id": current_user.id, "sku": sku, "name": product.name},
        )
        raise

@router.get("/", response_model=List[ProductResponse])
async def get_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    products = db.query(Product).filter(
        Product.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    for product in products:
        sync_product_current_stock(db, product.id)
    return products

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    sync_product_current_stock(db, product.id)
    return product

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    update_data = product_update.model_dump(exclude_unset=True)
    requested_current_stock = update_data.pop("current_stock", None)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    if requested_current_stock is not None:
        sync_product_current_stock(db, product.id, commit=True)
        current_available = product.current_stock
        delta = requested_current_stock - current_available
        if delta != 0:
            default_warehouse = get_default_warehouse(db, owner_id=current_user.id)
            adjust_stock(
                db,
                product_id=product.id,
                warehouse_id=default_warehouse.id,
                quantity=abs(delta),
                adjustment_type="POSITIVE" if delta > 0 else "NEGATIVE",
                reason="Legacy product current_stock update mirrored into inventory ledger",
                created_by=current_user.id,
            )
            db.refresh(product)
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db.delete(product)
    db.commit()
    return None
