from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    return_order_items = relationship("ReturnOrderItem", back_populates="supplier")


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, nullable=False, unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    status = Column(String, nullable=False, default="DRAFT", index=True)
    order_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expected_ship_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="sales_orders")
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
    order_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expected_arrival_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="purchase_orders")
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
    return_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    refund_amount = Column(Float, nullable=False, default=0)
    replacement_cost = Column(Float, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sales_order = relationship("SalesOrder", back_populates="return_orders")
    customer = relationship("Customer", back_populates="return_orders")
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
    origin = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    estimated_arrival = Column(DateTime(timezone=True), nullable=True)
    actual_arrival = Column(DateTime(timezone=True), nullable=True)
    delay_reason = Column(Text, nullable=True)
    customs_status = Column(String, nullable=True)
    documents_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    average_transit_days = Column(Integer, nullable=True)
    risk_level = Column(String, nullable=False, default="MEDIUM", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PortOrNode(Base):
    __tablename__ = "ports_or_nodes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False, index=True)
    country = Column(String, nullable=True)
    node_type = Column(String, nullable=False, default="PORT", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
