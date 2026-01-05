from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List
from app.database import get_db
from app.models import Product, Sale, RiskAlert, User
from app.schemas import (
    DashboardStats, BestSeller, SalesTrend, InventoryRisk
)
from app.auth import get_current_user

router = APIRouter()

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total revenue (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    revenue_result = db.query(func.sum(Sale.total_amount)).filter(
        Sale.owner_id == current_user.id,
        Sale.sale_date >= thirty_days_ago
    ).scalar()
    total_revenue = float(revenue_result) if revenue_result else 0.0
    
    # Total orders (last 30 days)
    total_orders = db.query(func.count(Sale.id)).filter(
        Sale.owner_id == current_user.id,
        Sale.sale_date >= thirty_days_ago
    ).scalar() or 0
    
    # Total products
    total_products = db.query(func.count(Product.id)).filter(
        Product.owner_id == current_user.id
    ).scalar() or 0
    
    # Low stock alerts
    low_stock_alerts = db.query(func.count(Product.id)).filter(
        Product.owner_id == current_user.id,
        Product.current_stock <= Product.min_stock_threshold
    ).scalar() or 0
    
    # Top sellers (last 30 days)
    top_sellers_query = db.query(
        Sale.product_id,
        Product.name,
        func.sum(Sale.quantity).label("total_quantity"),
        func.sum(Sale.total_amount).label("total_revenue"),
        func.count(Sale.id).label("total_sales")
    ).join(Product).filter(
        Sale.owner_id == current_user.id,
        Sale.sale_date >= thirty_days_ago
    ).group_by(Sale.product_id, Product.name).order_by(
        desc("total_revenue")
    ).limit(10).all()
    
    top_sellers = [
        BestSeller(
            product_id=row.product_id,
            product_name=row.name,
            total_quantity=int(row.total_quantity),
            total_revenue=float(row.total_revenue),
            total_sales=int(row.total_sales)
        )
        for row in top_sellers_query
    ]
    
    # Recent trends (last 7 days, daily)
    trends = []
    for i in range(7):
        date = datetime.utcnow() - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        day_revenue = db.query(func.sum(Sale.total_amount)).filter(
            Sale.owner_id == current_user.id,
            Sale.sale_date >= start_of_day,
            Sale.sale_date <= end_of_day
        ).scalar() or 0.0
        
        day_quantity = db.query(func.sum(Sale.quantity)).filter(
            Sale.owner_id == current_user.id,
            Sale.sale_date >= start_of_day,
            Sale.sale_date <= end_of_day
        ).scalar() or 0
        
        day_orders = db.query(func.count(Sale.id)).filter(
            Sale.owner_id == current_user.id,
            Sale.sale_date >= start_of_day,
            Sale.sale_date <= end_of_day
        ).scalar() or 0
        
        trends.append(SalesTrend(
            date=start_of_day.strftime("%Y-%m-%d"),
            revenue=float(day_revenue),
            quantity=int(day_quantity),
            order_count=int(day_orders)
        ))
    
    trends.reverse()  # Oldest to newest
    
    return DashboardStats(
        total_revenue=total_revenue,
        total_orders=total_orders,
        total_products=total_products,
        low_stock_alerts=low_stock_alerts,
        top_sellers=top_sellers,
        recent_trends=trends
    )

@router.get("/best-sellers", response_model=List[BestSeller])
async def get_best_sellers(
    days: int = 30,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    top_sellers_query = db.query(
        Sale.product_id,
        Product.name,
        func.sum(Sale.quantity).label("total_quantity"),
        func.sum(Sale.total_amount).label("total_revenue"),
        func.count(Sale.id).label("total_sales")
    ).join(Product).filter(
        Sale.owner_id == current_user.id,
        Sale.sale_date >= start_date
    ).group_by(Sale.product_id, Product.name).order_by(
        desc("total_revenue")
    ).limit(limit).all()
    
    return [
        BestSeller(
            product_id=row.product_id,
            product_name=row.name,
            total_quantity=int(row.total_quantity),
            total_revenue=float(row.total_revenue),
            total_sales=int(row.total_sales)
        )
        for row in top_sellers_query
    ]

@router.get("/inventory-risks", response_model=List[InventoryRisk])
async def get_inventory_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get products with low stock
    low_stock_products = db.query(Product).filter(
        Product.owner_id == current_user.id,
        Product.current_stock <= Product.min_stock_threshold
    ).all()
    
    risks = []
    for product in low_stock_products:
        # Calculate days of stock based on recent sales velocity
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_sales = db.query(func.sum(Sale.quantity)).filter(
            Sale.product_id == product.id,
            Sale.sale_date >= thirty_days_ago
        ).scalar() or 0
        
        daily_velocity = recent_sales / 30.0 if recent_sales > 0 else 0
        days_of_stock = (product.current_stock / daily_velocity) if daily_velocity > 0 else None
        
        # Determine risk level
        if product.current_stock == 0:
            risk_level = "critical"
        elif product.current_stock < (product.min_stock_threshold * 0.5):
            risk_level = "high"
        elif product.current_stock < product.min_stock_threshold:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        risks.append(InventoryRisk(
            product_id=product.id,
            product_name=product.name,
            current_stock=product.current_stock,
            min_threshold=product.min_stock_threshold,
            days_of_stock=days_of_stock,
            risk_level=risk_level
        ))
    
    # Sort by risk level
    risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    risks.sort(key=lambda x: risk_order.get(x.risk_level, 4))
    
    return risks

