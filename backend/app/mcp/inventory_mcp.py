from __future__ import annotations

from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPToolResult, MCPToolSpec, PlanLevel
from app.services import stock_ledger_service


def _get_stock_position(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = int(payload["product_id"])
    warehouse_id = payload.get("warehouse_id")
    return stock_ledger_service.get_stock_position(db, product_id, warehouse_id)


def _list_basic_inventory_capabilities(db, context: MCPRequestContext, payload: dict) -> MCPToolResult:
    return MCPToolResult(
        ok=True,
        data={
            "domain": "inventory",
            "phase": "foundation",
            "write_operations_disabled": True,
            "rule": "MCP inventory tools must call stock_ledger_service and never write database state directly.",
        },
    )


def register_inventory_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="inventory",
        description="Inventory MCP tools backed by ledger service functions.",
        min_plan=PlanLevel.FREE,
        tools=[
            MCPToolSpec(
                name="inventory.get_stock_position",
                domain="inventory",
                description="Read current stock position for a product from the inventory ledger.",
                min_plan=PlanLevel.FREE,
                read_only=True,
                handler=_get_stock_position,
            ),
            MCPToolSpec(
                name="inventory.describe_capabilities",
                domain="inventory",
                description="Describe available inventory MCP capabilities and safety constraints.",
                min_plan=PlanLevel.FREE,
                read_only=True,
                handler=_list_basic_inventory_capabilities,
            ),
        ],
    )
