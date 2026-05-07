from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Sale, Product, User, InventoryHistory
from app.schemas import SaleCreate, SaleResponse
from app.auth import get_current_user
from app.services.csv_service import export_sales_csv
from app.services.stock_ledger_service import (
    create_inventory_transaction,
    get_default_warehouse,
    get_stock_position,
    sync_product_current_stock,
)
from app.services.notification_service import create_notification

router = APIRouter()


@router.get("/export/csv")
async def get_sales_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_content = export_sales_csv(db, user=current_user)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="intelliflow-sales.csv"'},
    )

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

    default_warehouse = get_default_warehouse(db, owner_id=current_user.id)
    stock_position = get_stock_position(db, product.id, default_warehouse.id)

    if stock_position["available"] < sale.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock in {default_warehouse.name}. "
                f"Available: {stock_position['available']}, Requested: {sale.quantity}"
            ),
        )

    total_amount = sale.quantity * sale.unit_price
    db_sale = Sale(
        **sale.model_dump(),
        total_amount=total_amount,
        owner_id=current_user.id
    )

    try:
        db.add(db_sale)
        db.flush()

        create_inventory_transaction(
            db,
            product_id=product.id,
            warehouse_id=default_warehouse.id,
            transaction_type="SALE_SHIPPED",
            quantity=sale.quantity,
            direction="OUT",
            reference_type="SALE",
            reference_id=str(db_sale.id),
            reason="Sale shipped via legacy sales endpoint",
            created_by=current_user.id,
            commit=False,
        )

        sync_product_current_stock(db, product.id)
        inventory_history = InventoryHistory(
            product_id=product.id,
            quantity_change=-sale.quantity,
            previous_stock=stock_position["available"],
            new_stock=get_stock_position(db, product.id, default_warehouse.id)["available"],
            change_type="sale",
            notes=f"Sale #{db_sale.id}",
        )
        db.add(inventory_history)

        db.commit()
        db.refresh(db_sale)
        db.refresh(product)
        create_notification(
            db,
            user=current_user,
            category="stock_deducted",
            title="Stock deducted",
            body=f"{sale.quantity} units were deducted for {product.name}.",
            severity="warning" if product.current_stock <= product.min_stock_threshold else "info",
            data={"product_id": product.id, "sale_id": db_sale.id, "quantity": sale.quantity},
        )
        if product.current_stock <= product.min_stock_threshold:
            create_notification(
                db,
                user=current_user,
                category="low_stock",
                title="Low stock threshold reached",
                body=f"{product.name} is now at or below its minimum threshold after a sale.",
                severity="warning",
                data={"product_id": product.id, "current_stock": product.current_stock},
            )
        return db_sale
    except Exception:
        db.rollback()
        raise

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
