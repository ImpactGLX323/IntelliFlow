from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Sale, Product, User, InventoryHistory
from app.schemas import SaleCreate, SaleResponse
from app.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify product exists and belongs to user
    product = db.query(Product).filter(
        Product.id == sale.product_id,
        Product.owner_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check stock availability
    if product.current_stock < sale.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Available: {product.current_stock}, Requested: {sale.quantity}"
        )
    
    # Create sale
    total_amount = sale.quantity * sale.unit_price
    db_sale = Sale(
        **sale.dict(),
        total_amount=total_amount,
        owner_id=current_user.id
    )
    db.add(db_sale)
    
    # Update inventory
    previous_stock = product.current_stock
    product.current_stock -= sale.quantity
    new_stock = product.current_stock
    
    # Record inventory history
    inventory_history = InventoryHistory(
        product_id=product.id,
        quantity_change=-sale.quantity,
        previous_stock=previous_stock,
        new_stock=new_stock,
        change_type="sale",
        notes=f"Sale #{db_sale.id}"
    )
    db.add(inventory_history)
    
    db.commit()
    db.refresh(db_sale)
    return db_sale

@router.get("/", response_model=List[SaleResponse])
async def get_sales(
    skip: int = 0,
    limit: int = 100,
    start_date: datetime = None,
    end_date: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Sale).filter(Sale.owner_id == current_user.id)
    
    if start_date:
        query = query.filter(Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(Sale.sale_date <= end_date)
    
    sales = query.order_by(Sale.sale_date.desc()).offset(skip).limit(limit).all()
    return sales

@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.owner_id == current_user.id
    ).first()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    return sale

