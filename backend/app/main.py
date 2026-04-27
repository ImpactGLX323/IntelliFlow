from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.jobs.scheduler import build_default_scheduler, should_enable_scheduler
from app.mcp import InternalMCPServer
from app.routers import (
    ai_copilot,
    analytics,
    auth,
    customers,
    ingestion,
    inventory,
    logistics,
    products,
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
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
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ai_copilot.router, prefix="/api/ai", tags=["ai"])
app.include_router(inventory.router, prefix="/api", tags=["inventory"])
app.include_router(ingestion.router, tags=["ingestion"])

@app.get("/")
async def root():
    return {"message": "IntelliFlow API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
