from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from typing import List
import logging
from app.database import get_db
from app.models import Product, User
from app.schemas import CsvImportRequest, CsvImportResult, ProductCreate, ProductUpdate, ProductResponse
from app.auth import get_current_user
from app.services.csv_service import export_products_csv, import_products_csv
from app.services.stock_ledger_service import (
    adjust_stock,
    get_default_warehouse,
    get_stock_position,
    seed_product_stock_from_legacy_current_stock,
    sync_product_current_stock,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _serialize_product(db: Session, product: Product) -> dict:
    position = get_stock_position(db, product.id)
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "description": product.description,
        "category": product.category,
        "price": product.price,
        "cost": product.cost,
        "current_stock": product.current_stock,
        "on_hand": position["on_hand"],
        "reserved": position["reserved"],
        "available_stock": position["available"],
        "min_stock_threshold": product.min_stock_threshold,
        "supplier": product.supplier,
        "created_at": product.created_at,
    }


@router.get("/export/csv")
async def get_products_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    csv_content = export_products_csv(db, user=current_user)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="intelliflow-products.csv"'},
    )


@router.post("/import/csv", response_model=CsvImportResult)
async def post_products_csv_import(
    payload: CsvImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return import_products_csv(db, user=current_user, csv_text=payload.csv_text)

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
        return _serialize_product(db, db_product)
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
    return [_serialize_product(db, product) for product in products]

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
    return _serialize_product(db, product)

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
    return _serialize_product(db, product)

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
