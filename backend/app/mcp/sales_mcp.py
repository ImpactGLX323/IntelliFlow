from __future__ import annotations

from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPToolResult, MCPToolSpec, PlanLevel
from app.services import purchasing_service, sales_service


def _list_sales_orders(db, context: MCPRequestContext, payload: dict) -> list:
    status_filter = payload.get("status")
    orders = sales_service.list_sales_orders(db, status_filter=status_filter)
    return [
        {
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "customer_id": order.customer_id,
            "item_count": len(order.items),
        }
        for order in orders
    ]


def _list_purchase_orders(db, context: MCPRequestContext, payload: dict) -> list:
    status_filter = payload.get("status")
    orders = purchasing_service.list_purchase_orders(db, status_filter=status_filter)
    return [
        {
            "id": order.id,
            "po_number": order.po_number,
            "status": order.status,
            "supplier_id": order.supplier_id,
            "item_count": len(order.items),
        }
        for order in orders
    ]


def _sales_write_placeholder(db, context: MCPRequestContext, payload: dict) -> MCPToolResult:
    return MCPToolResult(
        ok=True,
        data={
            "phase": "foundation",
            "enabled": False,
            "rule": (
                "Phase 2 sales and purchasing MCP write tools must call sales_service "
                "or purchasing_service entrypoints instead of mutating models directly."
            ),
        },
        warnings=["Write-capable MCP sales tools are intentionally deferred in this phase."],
    )


def register_sales_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="sales",
        description="Sales and purchasing MCP tools backed by service-layer workflows.",
        min_plan=PlanLevel.PRO,
        tools=[
            MCPToolSpec(
                name="sales.list_sales_orders",
                domain="sales",
                description="Read sales orders using the sales service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_list_sales_orders,
            ),
            MCPToolSpec(
                name="sales.list_purchase_orders",
                domain="sales",
                description="Read purchase orders using the purchasing service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_list_purchase_orders,
            ),
            MCPToolSpec(
                name="sales.plan_write_workflows",
                domain="sales",
                description="Placeholder for future service-backed MCP write workflows.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_sales_write_placeholder,
            ),
        ],
    )
