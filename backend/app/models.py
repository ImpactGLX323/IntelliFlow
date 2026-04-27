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
