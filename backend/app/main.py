import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_app_config
from app.jobs.scheduler import build_default_scheduler, should_enable_scheduler
from app.mcp import InternalMCPServer
from app.routers import (
    ai_copilot,
    analytics,
    auth,
    customers,
    demo,
    ingestion,
    inventory,
    logistics,
    mcp_dev,
    products,
    public_logistics,
    public_system,
    purchase_orders,
    reorder,
    returns,
    sales,
    sales_orders,
    suppliers,
    warehouse_workflows,
)
from app.database import engine, Base
from app.firebase_admin import init_firebase_admin

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="IntelliFlow API", version="1.0.0")
app.state.internal_mcp = InternalMCPServer()
app.state.agent_scheduler = build_default_scheduler(app.state.internal_mcp)
app_config = get_app_config()

@app.on_event("startup")
def startup_firebase():
    init_firebase_admin()
    if should_enable_scheduler():
        app.state.agent_scheduler.start()


@app.on_event("shutdown")
def shutdown_scheduler():
    app.state.agent_scheduler.stop()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_config.cors_origins or [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(public_system.router, tags=["public-system"])
app.include_router(demo.router)
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(sales.router, prefix="/api/sales", tags=["sales"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(sales_orders.router, prefix="/api/sales-orders", tags=["sales-orders"])
app.include_router(purchase_orders.router, prefix="/api/purchase-orders", tags=["purchase-orders"])
app.include_router(reorder.router, prefix="/api", tags=["reorder"])
app.include_router(warehouse_workflows.router, prefix="/api", tags=["warehouse-workflows"])
app.include_router(returns.router, prefix="/api/returns", tags=["returns"])
app.include_router(logistics.router, prefix="/api", tags=["logistics"])
app.include_router(public_logistics.router, prefix="/public/logistics", tags=["public-logistics"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ai_copilot.router, prefix="/api/ai", tags=["ai"])
app.include_router(ai_copilot.public_router)
app.include_router(inventory.router, prefix="/api", tags=["inventory"])
app.include_router(ingestion.router, tags=["ingestion"])
if os.getenv("ENABLE_MCP_DEV_ENDPOINTS", "").lower() == "true":
    app.include_router(mcp_dev.router)

@app.get("/")
async def root():
    return {"message": "IntelliFlow API", "status": "running"}
