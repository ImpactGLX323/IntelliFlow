from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    JSON,
    DateTime,
    Date,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    subscription_plan = Column(String, nullable=False, default="FREE", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="organization")
    external_api_connections = relationship("ExternalApiConnection", back_populates="organization")
    external_api_usage_logs = relationship("ExternalApiUsageLog", back_populates="organization")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    organization = relationship("Organization", back_populates="users")
    products = relationship("Product", back_populates="owner")
    sales = relationship("Sale", back_populates="owner")
    created_inventory_transactions = relationship(
        "InventoryTransaction",
        foreign_keys="InventoryTransaction.created_by",
        back_populates="created_by_user",
    )
    approved_inventory_transactions = relationship(
        "InventoryTransaction",
        foreign_keys="InventoryTransaction.approved_by",
        back_populates="approved_by_user",
    )
    agent_recommendations = relationship("AgentRecommendation", back_populates="owner")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", cascade="all, delete-orphan")
    devices = relationship("UserDevice", back_populates="user", cascade="all, delete-orphan")
    e_invoice_documents = relationship("EInvoiceDocument", back_populates="owner", cascade="all, delete-orphan")
    external_api_connections = relationship("ExternalApiConnection", back_populates="user")
    external_api_usage_logs = relationship("ExternalApiUsageLog", back_populates="user")
    warehouses = relationship("Warehouse", back_populates="owner")
    customers = relationship("Customer", back_populates="owner")
    suppliers = relationship("Supplier", back_populates="owner")
    sales_orders = relationship("SalesOrder", back_populates="owner")
    purchase_orders = relationship("PurchaseOrder", back_populates="owner")
    return_orders = relationship("ReturnOrder", back_populates="owner")
    shipments = relationship("Shipment", back_populates="owner")
    routes = relationship("Route", back_populates="owner")
    ports_or_nodes = relationship("PortOrNode", back_populates="owner")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True, index=True)
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    current_stock = Column(Integer, default=0)
    min_stock_threshold = Column(Integer, default=10)
    supplier = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner = relationship("User", back_populates="products")
    sales = relationship("Sale", back_populates="product")
    inventory_history = relationship("InventoryHistory", back_populates="product")
    inventory_transactions = relationship(
        "InventoryTransaction",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    stock_reservations = relationship(
        "StockReservation",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    stock_transfers = relationship(
        "StockTransfer",
        foreign_keys="StockTransfer.product_id",
        back_populates="product",
        cascade="all, delete-orphan",
    )

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    sale_date = Column(DateTime(timezone=True), nullable=False, index=True)
    customer_id = Column(String, nullable=True)
    order_id = Column(String, nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product = relationship("Product", back_populates="sales")
    owner = relationship("User", back_populates="sales")
    e_invoice_documents = relationship("EInvoiceDocument", back_populates="sale")

class InventoryHistory(Base):
    __tablename__ = "inventory_history"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity_change = Column(Integer, nullable=False)
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    change_type = Column(String, nullable=False)  # 'sale', 'restock', 'adjustment', 'return'
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product = relationship("Product", back_populates="inventory_history")


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    code = Column(String, nullable=False, unique=True, index=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="warehouses")
    inventory_transactions = relationship(
        "InventoryTransaction",
        back_populates="warehouse",
        cascade="all, delete-orphan",
    )
    stock_reservations = relationship(
        "StockReservation",
        back_populates="warehouse",
        cascade="all, delete-orphan",
    )
    outbound_transfers = relationship(
        "StockTransfer",
        foreign_keys="StockTransfer.from_warehouse_id",
        back_populates="from_warehouse",
    )
    inbound_transfers = relationship(
        "StockTransfer",
        foreign_keys="StockTransfer.to_warehouse_id",
        back_populates="to_warehouse",
    )


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    transaction_type = Column(String, nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    direction = Column(String, nullable=False, index=True)
    reference_type = Column(String, nullable=True, index=True)
    reference_id = Column(String, nullable=True, index=True)
    reason = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    product = relationship("Product", back_populates="inventory_transactions")
    warehouse = relationship("Warehouse", back_populates="inventory_transactions")
    created_by_user = relationship(
        "User",
        foreign_keys=[created_by],
        back_populates="created_inventory_transactions",
    )
    approved_by_user = relationship(
        "User",
        foreign_keys=[approved_by],
        back_populates="approved_inventory_transactions",
    )


class StockReservation(Base):
    __tablename__ = "stock_reservations"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, index=True)
    reference_type = Column(String, nullable=True, index=True)
    reference_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="stock_reservations")
    warehouse = relationship("Warehouse", back_populates="stock_reservations")


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="stock_transfers")
    from_warehouse = relationship(
        "Warehouse",
        foreign_keys=[from_warehouse_id],
        back_populates="outbound_transfers",
    )
    to_warehouse = relationship(
        "Warehouse",
        foreign_keys=[to_warehouse_id],
        back_populates="inbound_transfers",
    )


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="customers")
    sales_orders = relationship("SalesOrder", back_populates="customer")
    return_orders = relationship("ReturnOrder", back_populates="customer")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    lead_time_days = Column(Integer, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="suppliers")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    return_order_items = relationship("ReturnOrderItem", back_populates="supplier")


class EInvoiceDocument(Base):
    __tablename__ = "e_invoice_documents"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    document_number = Column(String, nullable=False, unique=True, index=True)
    status = Column(String, nullable=False, default="READY", index=True)
    invoice_type = Column(String, nullable=False, default="01")
    currency = Column(String, nullable=False, default="MYR")
    buyer_name = Column(String, nullable=True)
    buyer_email = Column(String, nullable=True)
    buyer_tin = Column(String, nullable=True)
    seller_name = Column(String, nullable=False)
    seller_tin = Column(String, nullable=True)
    issue_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    validation_status = Column(String, nullable=False, default="READY", index=True)
    validation_notes = Column(JSON, nullable=False, default=list)
    line_items = Column(JSON, nullable=False, default=list)
    lhdn_reference = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sale = relationship("Sale", back_populates="e_invoice_documents")
    owner = relationship("User", back_populates="e_invoice_documents")


class ExternalApiProvider(Base):
    __tablename__ = "external_api_providers"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    provider_type = Column(String, nullable=False, index=True)
    required_plan = Column(String, nullable=False, default="FREE", index=True)
    is_enabled = Column(Boolean, nullable=False, default=True)
    is_live_capable = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ExternalApiConnection(Base):
    __tablename__ = "external_api_connections"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    provider_key = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="NOT_CONFIGURED", index=True)
    access_token_encrypted = Column(Text, nullable=True)
    refresh_token_encrypted = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="external_api_connections")
    user = relationship("User", back_populates="external_api_connections")


class ExternalApiCache(Base):
    __tablename__ = "external_api_cache"

    id = Column(Integer, primary_key=True, index=True)
    provider_key = Column(String, nullable=False, index=True)
    cache_key = Column(String, nullable=False, unique=True, index=True)
    response_json = Column(JSON, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExternalApiUsageLog(Base):
    __tablename__ = "external_api_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    provider_key = Column(String, nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    endpoint = Column(String, nullable=False, index=True)
    status_code = Column(Integer, nullable=True)
    cache_hit = Column(Boolean, nullable=False, default=False)
    plan = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    organization = relationship("Organization", back_populates="external_api_usage_logs")
    user = relationship("User", back_populates="external_api_usage_logs")


class WarehouseDirectoryRecord(Base):
    __tablename__ = "warehouse_directory_records"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    provider_key = Column(String, nullable=True, index=True)
    country = Column(String, nullable=False, default="MY", index=True)
    state = Column(String, nullable=True, index=True)
    city = Column(String, nullable=True, index=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    warehouse_type = Column(String, nullable=True, index=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_preview = Column(Boolean, nullable=False, default=False)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MarketDemandSignal(Base):
    __tablename__ = "market_demand_signals"

    id = Column(Integer, primary_key=True, index=True)
    country = Column(String, nullable=False, default="MY", index=True)
    week_start = Column(Date, nullable=False, index=True)
    week_end = Column(Date, nullable=False, index=True)
    source = Column(String, nullable=False, index=True)
    data_type = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True, index=True)
    keyword_or_product = Column(String, nullable=False, index=True)
    rank = Column(Integer, nullable=True)
    score = Column(Float, nullable=True)
    units_sold = Column(Integer, nullable=True)
    revenue = Column(Float, nullable=True)
    currency = Column(String, nullable=False, default="MYR")
    confidence = Column(String, nullable=False, default="LOW", index=True)
    is_live = Column(Boolean, nullable=False, default=False)
    is_estimated = Column(Boolean, nullable=False, default=True)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, nullable=False, unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    status = Column(String, nullable=False, default="DRAFT", index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    order_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expected_ship_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="sales_orders")
    owner = relationship("User", back_populates="sales_orders")
    items = relationship("SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan")
    pick_lists = relationship("PickList", back_populates="sales_order", cascade="all, delete-orphan")
    packing_records = relationship("PackingRecord", back_populates="sales_order", cascade="all, delete-orphan")
    return_orders = relationship("ReturnOrder", back_populates="sales_order")


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True, index=True)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_reserved = Column(Integer, nullable=False, default=0)
    quantity_fulfilled = Column(Integer, nullable=False, default=0)
    unit_price = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sales_order = relationship("SalesOrder", back_populates="items")
    product = relationship("Product")
    warehouse = relationship("Warehouse")
    pick_list_items = relationship("PickListItem", back_populates="sales_order_item")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, nullable=False, unique=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)
    status = Column(String, nullable=False, default="DRAFT", index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    order_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expected_arrival_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="purchase_orders")
    owner = relationship("User", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True, index=True)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, nullable=False, default=0)
    unit_cost = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")
    warehouse = relationship("Warehouse")


class ReorderPoint(Base):
    __tablename__ = "reorder_points"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    minimum_quantity = Column(Integer, nullable=False)
    reorder_quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product")
    warehouse = relationship("Warehouse")


class WarehouseLocation(Base):
    __tablename__ = "warehouse_locations"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True, index=True)
    location_type = Column(String, nullable=False, default="STORAGE", index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    warehouse = relationship("Warehouse")
    pick_list_items = relationship("PickListItem", back_populates="warehouse_location")
    cycle_count_items = relationship("CycleCountItem", back_populates="warehouse_location")


class PickList(Base):
    __tablename__ = "pick_lists"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="OPEN", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sales_order = relationship("SalesOrder", back_populates="pick_lists")
    items = relationship("PickListItem", back_populates="pick_list", cascade="all, delete-orphan")


class PickListItem(Base):
    __tablename__ = "pick_list_items"

    id = Column(Integer, primary_key=True, index=True)
    pick_list_id = Column(Integer, ForeignKey("pick_lists.id"), nullable=False, index=True)
    sales_order_item_id = Column(Integer, ForeignKey("sales_order_items.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    warehouse_location_id = Column(Integer, ForeignKey("warehouse_locations.id"), nullable=True, index=True)
    quantity_to_pick = Column(Integer, nullable=False)
    quantity_picked = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pick_list = relationship("PickList", back_populates="items")
    sales_order_item = relationship("SalesOrderItem", back_populates="pick_list_items")
    product = relationship("Product")
    warehouse = relationship("Warehouse")
    warehouse_location = relationship("WarehouseLocation", back_populates="pick_list_items")


class PackingRecord(Base):
    __tablename__ = "packing_records"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="OPEN", index=True)
    package_reference = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sales_order = relationship("SalesOrder", back_populates="packing_records")


class CycleCount(Base):
    __tablename__ = "cycle_counts"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="OPEN", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    warehouse = relationship("Warehouse")
    items = relationship("CycleCountItem", back_populates="cycle_count", cascade="all, delete-orphan")


class CycleCountItem(Base):
    __tablename__ = "cycle_count_items"

    id = Column(Integer, primary_key=True, index=True)
    cycle_count_id = Column(Integer, ForeignKey("cycle_counts.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_location_id = Column(Integer, ForeignKey("warehouse_locations.id"), nullable=True, index=True)
    expected_quantity = Column(Integer, nullable=False)
    counted_quantity = Column(Integer, nullable=True)
    variance = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cycle_count = relationship("CycleCount", back_populates="items")
    product = relationship("Product")
    warehouse_location = relationship("WarehouseLocation", back_populates="cycle_count_items")


class ReturnOrder(Base):
    __tablename__ = "return_orders"

    id = Column(Integer, primary_key=True, index=True)
    return_number = Column(String, nullable=False, unique=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    status = Column(String, nullable=False, default="REQUESTED", index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    return_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    refund_amount = Column(Float, nullable=False, default=0)
    replacement_cost = Column(Float, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sales_order = relationship("SalesOrder", back_populates="return_orders")
    customer = relationship("Customer", back_populates="return_orders")
    owner = relationship("User", back_populates="return_orders")
    items = relationship("ReturnOrderItem", back_populates="return_order", cascade="all, delete-orphan")


class ReturnOrderItem(Base):
    __tablename__ = "return_order_items"

    id = Column(Integer, primary_key=True, index=True)
    return_order_id = Column(Integer, ForeignKey("return_orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True, index=True)
    quantity = Column(Integer, nullable=False)
    return_reason = Column(String, nullable=False, default="OTHER", index=True)
    condition = Column(String, nullable=False, default="RESTOCKABLE", index=True)
    refund_amount = Column(Float, nullable=False, default=0)
    replacement_cost = Column(Float, nullable=False, default=0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)
    carrier_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    return_order = relationship("ReturnOrder", back_populates="items")
    product = relationship("Product")
    warehouse = relationship("Warehouse")
    supplier = relationship("Supplier", back_populates="return_order_items")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_number = Column(String, nullable=False, unique=True, index=True)
    related_type = Column(String, nullable=True, index=True)
    related_id = Column(String, nullable=True, index=True)
    carrier_name = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="CREATED", index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    origin = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    estimated_arrival = Column(DateTime(timezone=True), nullable=True)
    actual_arrival = Column(DateTime(timezone=True), nullable=True)
    delay_reason = Column(Text, nullable=True)
    customs_status = Column(String, nullable=True)
    documents_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="shipments")
    legs = relationship("ShipmentLeg", back_populates="shipment", cascade="all, delete-orphan")


class ShipmentLeg(Base):
    __tablename__ = "shipment_legs"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    transport_mode = Column(String, nullable=False, default="ROAD")
    carrier_name = Column(String, nullable=True)
    vessel_or_flight_number = Column(String, nullable=True)
    departure_time = Column(DateTime(timezone=True), nullable=True)
    arrival_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    shipment = relationship("Shipment", back_populates="legs")


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    mode = Column(String, nullable=False, default="ROAD", index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    average_transit_days = Column(Integer, nullable=True)
    risk_level = Column(String, nullable=False, default="MEDIUM", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner = relationship("User", back_populates="routes")


class PortOrNode(Base):
    __tablename__ = "ports_or_nodes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False, index=True)
    country = Column(String, nullable=True)
    node_type = Column(String, nullable=False, default="PORT", index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="ports_or_nodes")

class RiskAlert(Base):
    __tablename__ = "risk_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    alert_type = Column(String, nullable=False)  # 'low_stock', 'slow_moving', 'high_demand', 'price_anomaly'
    severity = Column(String, nullable=False)  # 'low', 'medium', 'high', 'critical'
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product = relationship("Product")


class AgentRecommendation(Base):
    __tablename__ = "agent_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    job_name = Column(String, nullable=False, index=True)
    domain = Column(String, nullable=False, index=True)
    recommendation_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, default="medium", index=True)
    status = Column(String, nullable=False, default="OPEN", index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    source_target = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="agent_recommendations")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, default="info", index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", back_populates="notifications")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    enabled = Column(Boolean, nullable=False, default=True)
    push_enabled = Column(Boolean, nullable=False, default=False)
    email_enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notification_preferences")


class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    platform = Column(String, nullable=False, index=True)
    push_token = Column(String, nullable=False, unique=True, index=True)
    app_version = Column(String, nullable=True)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="devices")
