from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# Auth schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Product schemas
class ProductCreate(BaseModel):
    name: str
    sku: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: float
    cost: float
    current_stock: int = 0
    min_stock_threshold: int = 10
    supplier: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    current_stock: Optional[int] = None
    min_stock_threshold: Optional[int] = None
    supplier: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    description: Optional[str]
    category: Optional[str]
    price: float
    cost: float
    current_stock: int
    min_stock_threshold: int
    supplier: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Sale schemas
class SaleCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    sale_date: datetime
    customer_id: Optional[str] = None
    order_id: Optional[str] = None

class SaleResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    total_amount: float
    sale_date: datetime
    customer_id: Optional[str]
    order_id: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analytics schemas
class BestSeller(BaseModel):
    product_id: int
    product_name: str
    total_quantity: int
    total_revenue: float
    total_sales: int

class SalesTrend(BaseModel):
    date: str
    revenue: float
    quantity: int
    order_count: int

class InventoryRisk(BaseModel):
    product_id: int
    product_name: str
    current_stock: int
    min_threshold: int
    days_of_stock: Optional[float]
    risk_level: str

class DashboardStats(BaseModel):
    total_revenue: float
    total_orders: int
    total_products: int
    low_stock_alerts: int
    top_sellers: List[BestSeller]
    recent_trends: List[SalesTrend]

# AI Copilot schemas
class RoadmapRequest(BaseModel):
    query: str
    focus_areas: Optional[List[str]] = None  # e.g., ["inventory", "sales", "pricing"]

class RoadmapTask(BaseModel):
    title: str
    description: str
    priority: str  # 'low', 'medium', 'high', 'critical'
    category: str
    estimated_impact: str
    action_items: List[str]

class RoadmapResponse(BaseModel):
    summary: str
    tasks: List[RoadmapTask]
    insights: List[str]
    generated_at: datetime

