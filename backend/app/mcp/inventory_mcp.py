from __future__ import annotations

from app.mcp.schemas import (
    MCPModuleSpec,
    MCPRequestContext,
    MCPResourceSpec,
    MCPToolSpec,
    PlanLevel,
)
from app.services import stock_ledger_service


def _resource_inventory_by_sku(db, context: MCPRequestContext, payload: dict) -> dict:
    return stock_ledger_service.get_stock_position_by_sku(db, payload["sku"])


def _resource_inventory_by_sku_and_warehouse(db, context: MCPRequestContext, payload: dict) -> dict:
    return stock_ledger_service.get_stock_position_by_sku(
        db,
        payload["sku"],
        int(payload["warehouse_id"]),
    )


def _resource_low_stock(db, context: MCPRequestContext, payload: dict) -> list[dict]:
    return stock_ledger_service.get_low_stock_items(db)


def _resource_stock_movements(db, context: MCPRequestContext, payload: dict) -> dict:
    return stock_ledger_service.get_stock_movements_by_sku(db, payload["sku"])


def _tool_get_stock_position(db, context: MCPRequestContext, payload: dict) -> dict:
    if "sku" in payload:
        return stock_ledger_service.get_stock_position_by_sku(
            db,
            payload["sku"],
            payload.get("warehouse_id"),
        )
    return stock_ledger_service.get_stock_position(
        db,
        int(payload["product_id"]),
        payload.get("warehouse_id"),
    )


def _tool_get_available_to_promise(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = stock_ledger_service._get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return stock_ledger_service.get_available_to_promise(
        db,
        int(product_id),
        payload.get("warehouse_id"),
    )


def _tool_get_low_stock_items(db, context: MCPRequestContext, payload: dict) -> list[dict]:
    return stock_ledger_service.get_low_stock_items(db, payload.get("warehouse_id"))


def _tool_calculate_days_of_cover(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = stock_ledger_service._get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return stock_ledger_service.calculate_days_of_cover(
        db,
        int(product_id),
        payload.get("warehouse_id"),
        int(payload.get("lookback_days", 30)),
    )


def _tool_recommend_stock_transfer(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = stock_ledger_service._get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return stock_ledger_service.recommend_stock_transfer(
        db,
        int(product_id),
        int(payload["target_warehouse_id"]),
    )


def _tool_create_stock_adjustment_request(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = stock_ledger_service._get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return stock_ledger_service.create_stock_adjustment_request(
        db,
        product_id=int(product_id),
        warehouse_id=int(payload["warehouse_id"]),
        quantity=int(payload["quantity"]),
        adjustment_type=payload["adjustment_type"],
        reason=payload["reason"],
        requested_by=context.user_id,
        notes=payload.get("notes"),
    )


def _tool_create_transfer_request(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = stock_ledger_service._get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return stock_ledger_service.create_transfer_request(
        db,
        product_id=int(product_id),
        from_warehouse_id=int(payload["from_warehouse_id"]),
        to_warehouse_id=int(payload["to_warehouse_id"]),
        quantity=int(payload["quantity"]),
        requested_by=context.user_id,
        notes=payload.get("notes"),
    )


def register_inventory_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="inventory",
        description="Inventory MCP resources and tools backed by ledger service functions.",
        min_plan=PlanLevel.FREE,
        resources=[
            MCPResourceSpec(
                uri_template="inventory://sku/{sku}",
                domain="inventory",
                description="Read aggregate stock position for a SKU.",
                min_plan=PlanLevel.FREE,
                handler=_resource_inventory_by_sku,
            ),
            MCPResourceSpec(
                uri_template="inventory://sku/{sku}/warehouse/{warehouse_id}",
                domain="inventory",
                description="Read warehouse-specific stock position for a SKU.",
                min_plan=PlanLevel.FREE,
                handler=_resource_inventory_by_sku_and_warehouse,
            ),
            MCPResourceSpec(
                uri_template="inventory://low-stock",
                domain="inventory",
                description="Read low-stock inventory items based on ledger availability.",
                min_plan=PlanLevel.FREE,
                handler=_resource_low_stock,
            ),
            MCPResourceSpec(
                uri_template="inventory://stock-movements/{sku}",
                domain="inventory",
                description="Read recent stock movements for a SKU from the inventory ledger.",
                min_plan=PlanLevel.FREE,
                handler=_resource_stock_movements,
            ),
        ],
        tools=[
            MCPToolSpec(
                name="inventory.get_stock_position",
                domain="inventory",
                description="Read stock position for a product or SKU from the inventory ledger.",
                min_plan=PlanLevel.FREE,
                read_only=True,
                handler=_tool_get_stock_position,
            ),
            MCPToolSpec(
                name="inventory.get_available_to_promise",
                domain="inventory",
                description="Read ATP based on ledger available stock.",
                min_plan=PlanLevel.FREE,
                read_only=True,
                handler=_tool_get_available_to_promise,
            ),
            MCPToolSpec(
                name="inventory.get_low_stock_items",
                domain="inventory",
                description="Read low-stock items using ledger availability and product thresholds.",
                min_plan=PlanLevel.FREE,
                read_only=True,
                handler=_tool_get_low_stock_items,
            ),
            MCPToolSpec(
                name="inventory.calculate_days_of_cover",
                domain="inventory",
                description="Calculate days of cover from ledger availability and recent sales demand.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_calculate_days_of_cover,
            ),
            MCPToolSpec(
                name="inventory.recommend_stock_transfer",
                domain="inventory",
                description="Recommend a source warehouse for rebalancing stock without mutating inventory.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_recommend_stock_transfer,
            ),
            MCPToolSpec(
                name="inventory.create_stock_adjustment_request",
                domain="inventory",
                description="Create a non-mutating stock adjustment review request backed by service-layer validation.",
                min_plan=PlanLevel.PRO,
                read_only=False,
                handler=_tool_create_stock_adjustment_request,
            ),
            MCPToolSpec(
                name="inventory.create_transfer_request",
                domain="inventory",
                description="Create a non-mutating stock transfer review request backed by service-layer validation.",
                min_plan=PlanLevel.PRO,
                read_only=False,
                handler=_tool_create_transfer_request,
            ),
        ],
    )
