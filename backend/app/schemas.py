from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional, List

# Auth schemas
class UserCreate(BaseModel):
    email: EmailStr
    firebase_uid: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    organization_id: Optional[int] = None
    subscription_plan: Optional[str] = "FREE"
    
    model_config = ConfigDict(from_attributes=True)

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
    
    model_config = ConfigDict(from_attributes=True)

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
    
    model_config = ConfigDict(from_attributes=True)

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


class CopilotQueryRequest(BaseModel):
    query: str


class CopilotQueryResponse(BaseModel):
    domain: str
    action: str
    query: str
    result: dict
    warnings: List[str] = []
    permission_denied: bool = False
    request_id: Optional[str] = None


class AICopilotRequest(BaseModel):
    message: str
    organization_id: Optional[str] = None
    user_plan: str = "FREE"
    user_id: Optional[str] = None

    @field_validator("user_plan")
    @classmethod
    def validate_user_plan(cls, value: str) -> str:
        normalized = value.upper()
        if normalized == "PREMIUM":
            normalized = "PRO"
        if normalized not in {"FREE", "PRO", "BOOST"}:
            raise ValueError("user_plan must be FREE, PREMIUM, PRO, or BOOST")
        return normalized


class AICopilotResponse(BaseModel):
    intent: str
    tools_used: List[str]
    answer: str
    data: dict
    citations: List[dict] = []
    recommendations: List[str] = []
    warnings: List[str] = []
    upgrade_required: bool = False
    required_plan: Optional[str] = None
    request_id: Optional[str] = None


class MCPDevToolRequest(BaseModel):
    arguments: dict = Field(default_factory=dict)
    user_context: dict = Field(default_factory=dict)


class MCPDevResourceReadRequest(BaseModel):
    uri: str
    user_context: dict = Field(default_factory=dict)


class AgentRecommendationRead(BaseModel):
    id: int
    job_name: str
    domain: str
    recommendation_type: str
    severity: str
    title: str
    explanation: str
    affected_skus: List[str] = []
    affected_orders: List[str] = []
    affected_shipments: List[str] = []
    recommended_action: Optional[str] = None
    status: str
    created_at: datetime


class AICapabilitiesResponse(BaseModel):
    plan_level: str
    allowed_domains: List[str]
    features: dict


class OrganizationRead(BaseModel):
    id: int
    name: str
    slug: str
    subscription_plan: str

    model_config = ConfigDict(from_attributes=True)


class NotificationRead(BaseModel):
    id: int
    category: str
    severity: str
    title: str
    body: str
    data: Optional[dict] = None
    read_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationUnreadCountRead(BaseModel):
    unread_count: int


class NotificationPreferenceRead(BaseModel):
    id: int
    category: str
    enabled: bool
    push_enabled: bool
    email_enabled: bool
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    enabled: bool
    push_enabled: bool = False
    email_enabled: bool = False


class UserDeviceCreate(BaseModel):
    platform: str
    push_token: str
    app_version: Optional[str] = None


class UserDeviceRead(BaseModel):
    id: int
    platform: str
    push_token: str
    app_version: Optional[str]
    last_seen_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class IngestRequest(BaseModel):
    source_directory: Optional[str] = None
    collection_name: Optional[str] = None


class IngestedDocumentSummary(BaseModel):
    file_name: str
    authority: str
    country: str
    category: str
    nodes_indexed: int


class IngestResponse(BaseModel):
    source_directory: str
    collection_name: str
    total_files_discovered: int
    indexed_documents: int
    indexed_nodes: int
    embedding_dimensions: int
    failed_files: List[str]
    documents: List[IngestedDocumentSummary]


class WarehouseCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    is_active: bool = True


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class WarehouseRead(BaseModel):
    id: int
    name: str
    code: str
    address: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class InventoryTransactionRead(BaseModel):
    id: int
    product_id: int
    warehouse_id: int
    transaction_type: str
    quantity: int
    direction: str
    reference_type: Optional[str]
    reference_id: Optional[str]
    reason: Optional[str]
    notes: Optional[str]
    created_by: Optional[int]
    approved_by: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockReservationRead(BaseModel):
    id: int
    product_id: int
    warehouse_id: int
    quantity: int
    status: str
    reference_type: Optional[str]
    reference_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class StockTransferRead(BaseModel):
    id: int
    product_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    quantity: int
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class StockPositionRead(BaseModel):
    product_id: int
    warehouse_id: Optional[int]
    on_hand: int
    reserved: int
    available: int
    damaged: int
    quarantined: int


class ReceivePurchaseRequest(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)
    reference_id: Optional[str] = None


class StockAdjustmentRequest(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)
    adjustment_type: str
    reason: str
    notes: Optional[str] = None

    @field_validator("adjustment_type")
    @classmethod
    def validate_adjustment_type(cls, value: str) -> str:
        if value not in {"POSITIVE", "NEGATIVE"}:
            raise ValueError("adjustment_type must be POSITIVE or NEGATIVE")
        return value


class StockReservationRequest(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None


class StockTransferRequest(BaseModel):
    product_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    quantity: int = Field(gt=0)
    notes: Optional[str] = None


class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class CustomerRead(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class SupplierCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: Optional[int] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: Optional[int] = None


class SupplierRead(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    lead_time_days: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class SalesOrderItemCreate(BaseModel):
    product_id: int
    warehouse_id: Optional[int] = None
    quantity_ordered: int = Field(gt=0)
    unit_price: float = 0


class SalesOrderCreate(BaseModel):
    customer_id: Optional[int] = None
    order_date: Optional[datetime] = None
    expected_ship_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[SalesOrderItemCreate]


class SalesOrderItemRead(BaseModel):
    id: int
    sales_order_id: int
    product_id: int
    warehouse_id: Optional[int]
    quantity_ordered: int
    quantity_reserved: int
    quantity_fulfilled: int
    unit_price: float
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class SalesOrderRead(BaseModel):
    id: int
    order_number: str
    customer_id: Optional[int]
    status: str
    order_date: datetime
    expected_ship_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[SalesOrderItemRead]

    model_config = ConfigDict(from_attributes=True)


class FulfillSalesOrderItemRequest(BaseModel):
    quantity: int = Field(gt=0)


class EInvoiceCreateFromSaleRequest(BaseModel):
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_tin: Optional[str] = None
    invoice_type: str = "01"


class EInvoiceRead(BaseModel):
    id: int
    sale_id: int
    document_number: str
    status: str
    invoice_type: str
    currency: str
    buyer_name: Optional[str]
    buyer_email: Optional[str]
    buyer_tin: Optional[str]
    seller_name: str
    seller_tin: Optional[str]
    issue_date: datetime
    subtotal: float
    tax_amount: float
    total_amount: float
    validation_status: str
    validation_notes: List[str] = []
    line_items: List[dict] = []
    lhdn_reference: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class EInvoiceSummaryRead(BaseModel):
    total_documents: int
    ready_documents: int
    missing_tax_identity: int
    total_invoice_value: float


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    warehouse_id: Optional[int] = None
    quantity_ordered: int = Field(gt=0)
    unit_cost: float = 0


class PurchaseOrderCreate(BaseModel):
    supplier_id: Optional[int] = None
    order_date: Optional[datetime] = None
    expected_arrival_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderItemRead(BaseModel):
    id: int
    purchase_order_id: int
    product_id: int
    warehouse_id: Optional[int]
    quantity_ordered: int
    quantity_received: int
    unit_cost: float
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderRead(BaseModel):
    id: int
    po_number: str
    supplier_id: Optional[int]
    status: str
    order_date: datetime
    expected_arrival_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[PurchaseOrderItemRead]

    model_config = ConfigDict(from_attributes=True)


class ReceivePurchaseOrderItemRequest(BaseModel):
    quantity: int = Field(gt=0)


class ReorderPointCreate(BaseModel):
    product_id: int
    warehouse_id: int
    minimum_quantity: int = Field(ge=0)
    reorder_quantity: int = Field(gt=0)


class ReorderPointRead(BaseModel):
    id: int
    product_id: int
    warehouse_id: int
    minimum_quantity: int
    reorder_quantity: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ReorderSuggestionRead(BaseModel):
    product_id: int
    warehouse_id: int
    available_quantity: int
    minimum_quantity: int
    suggested_reorder_quantity: int
    supplier_name: Optional[str]
    supplier_lead_time_days: Optional[int]


class WarehouseLocationCreate(BaseModel):
    warehouse_id: int
    name: str
    code: Optional[str] = None
    location_type: str = "STORAGE"
    is_active: bool = True


class WarehouseLocationRead(BaseModel):
    id: int
    warehouse_id: int
    name: str
    code: Optional[str]
    location_type: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PickListItemRead(BaseModel):
    id: int
    pick_list_id: int
    sales_order_item_id: int
    product_id: int
    warehouse_id: int
    warehouse_location_id: Optional[int]
    quantity_to_pick: int
    quantity_picked: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PickListRead(BaseModel):
    id: int
    sales_order_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[PickListItemRead]

    model_config = ConfigDict(from_attributes=True)


class PickItemRequest(BaseModel):
    quantity: int = Field(gt=0)
    warehouse_location_id: Optional[int] = None


class PackingRecordCreate(BaseModel):
    package_reference: Optional[str] = None


class PackingRecordRead(BaseModel):
    id: int
    sales_order_id: int
    status: str
    package_reference: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class CycleCountItemCreate(BaseModel):
    product_id: int
    warehouse_location_id: Optional[int] = None


class CycleCountCreate(BaseModel):
    warehouse_id: int
    items: List[CycleCountItemCreate]


class CycleCountItemRead(BaseModel):
    id: int
    cycle_count_id: int
    product_id: int
    warehouse_location_id: Optional[int]
    expected_quantity: int
    counted_quantity: Optional[int]
    variance: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class CycleCountRead(BaseModel):
    id: int
    warehouse_id: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    items: List[CycleCountItemRead]

    model_config = ConfigDict(from_attributes=True)


class SubmitCycleCountItemRequest(BaseModel):
    counted_quantity: int = Field(ge=0)


class InventoryConditionRequest(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)
    reason: str


class ReturnOrderItemCreate(BaseModel):
    product_id: int
    warehouse_id: Optional[int] = None
    quantity: int = Field(gt=0)
    return_reason: str
    condition: str
    refund_amount: float = 0
    replacement_cost: float = 0
    supplier_id: Optional[int] = None
    carrier_name: Optional[str] = None


class ReturnOrderCreate(BaseModel):
    sales_order_id: Optional[int] = None
    customer_id: Optional[int] = None
    return_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[ReturnOrderItemCreate]


class ReturnOrderItemRead(BaseModel):
    id: int
    return_order_id: int
    product_id: int
    warehouse_id: Optional[int]
    quantity: int
    return_reason: str
    condition: str
    refund_amount: float
    replacement_cost: float
    supplier_id: Optional[int]
    carrier_name: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ReturnOrderRead(BaseModel):
    id: int
    return_number: str
    sales_order_id: Optional[int]
    customer_id: Optional[int]
    status: str
    return_date: datetime
    refund_amount: float
    replacement_cost: float
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[ReturnOrderItemRead]

    model_config = ConfigDict(from_attributes=True)


class RefundReturnOrderRequest(BaseModel):
    refund_amount: float = 0


class ReceiveReturnItemRequest(BaseModel):
    quantity: int = Field(gt=0)


class MarginAnalysisRead(BaseModel):
    product_id: int
    gross_profit: float
    refund_amount: float
    replacement_cost: float
    return_adjusted_margin: float
    missing_data: List[str]


class HighReturnProductRead(BaseModel):
    product_id: int
    returned_quantity: int
    refund_amount: float
    replacement_cost: float


class ProfitLeakageLineRead(BaseModel):
    product_id: int
    refund_amount: float
    replacement_cost: float
    total_leakage: float


class ProfitLeakageReportRead(BaseModel):
    start_date: datetime
    end_date: datetime
    total_refunds: float
    total_replacement_cost: float
    total_profit_leakage: float
    by_product: List[ProfitLeakageLineRead]


class ShipmentCreate(BaseModel):
    related_type: Optional[str] = None
    related_id: Optional[str] = None
    carrier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    estimated_arrival: Optional[datetime] = None
    customs_status: Optional[str] = None
    documents_url: Optional[str] = None


class ShipmentStatusUpdateRequest(BaseModel):
    status: str
    actual_arrival: Optional[datetime] = None
    delay_reason: Optional[str] = None
    customs_status: Optional[str] = None


class ShipmentLegCreate(BaseModel):
    sequence_number: int = Field(gt=0)
    origin: str
    destination: str
    transport_mode: str
    carrier_name: Optional[str] = None
    vessel_or_flight_number: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    status: Optional[str] = None


class ShipmentLegRead(BaseModel):
    id: int
    shipment_id: int
    sequence_number: int
    origin: str
    destination: str
    transport_mode: str
    carrier_name: Optional[str]
    vessel_or_flight_number: Optional[str]
    departure_time: Optional[datetime]
    arrival_time: Optional[datetime]
    status: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ShipmentRead(BaseModel):
    id: int
    shipment_number: str
    related_type: Optional[str]
    related_id: Optional[str]
    carrier_name: Optional[str]
    tracking_number: Optional[str]
    status: str
    origin: Optional[str]
    destination: Optional[str]
    estimated_arrival: Optional[datetime]
    actual_arrival: Optional[datetime]
    delay_reason: Optional[str]
    customs_status: Optional[str]
    documents_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    legs: List[ShipmentLegRead] = []

    model_config = ConfigDict(from_attributes=True)


class DelayImpactRead(BaseModel):
    shipment_id: int
    shipment_number: str
    related_type: Optional[str]
    related_id: Optional[str]
    delayed_shipment: bool
    delay_days: int
    affected_skus: List[dict]
    affected_purchase_orders: List[dict]
    affected_sales_orders: List[dict]
    revenue_at_risk: Optional[float]
    inventory_cover_remaining: List[dict]
    risk_level: str
    recommended_mitigation: List[str]


class RouteCreate(BaseModel):
    name: str
    origin: str
    destination: str
    mode: str
    average_transit_days: Optional[int] = None
    risk_level: str = "MEDIUM"


class RouteRead(BaseModel):
    id: int
    name: str
    origin: str
    destination: str
    mode: str
    average_transit_days: Optional[int]
    risk_level: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PortOrNodeCreate(BaseModel):
    code: Optional[str] = None
    name: str
    country: Optional[str] = None
    node_type: str


class PortOrNodeRead(BaseModel):
    id: int
    code: Optional[str]
    name: str
    country: Optional[str]
    node_type: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
