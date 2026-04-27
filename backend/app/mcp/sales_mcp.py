from __future__ import annotations

from app.mcp.schemas import (
    MCPModuleSpec,
    MCPRequestContext,
    MCPResourceSpec,
    MCPToolSpec,
    PlanLevel,
)
from app.services import analytics_service, sales_service


def _resource_weekly(db, context: MCPRequestContext, payload: dict) -> dict:
    weeks = int(payload.get("weeks", 8))
    return analytics_service.get_weekly_sales(db=db, weeks=weeks)


def _resource_sku_weekly(db, context: MCPRequestContext, payload: dict) -> dict:
    weeks = int(payload.get("weeks", 8))
    return analytics_service.get_weekly_sales(db=db, sku=payload["sku"], weeks=weeks)


def _resource_top_products(db, context: MCPRequestContext, payload: dict) -> dict:
    days = int(payload.get("days", 30))
    limit = int(payload.get("limit", 10))
    return analytics_service.get_top_products(db=db, days=days, limit=limit)


def _resource_channel_performance(db, context: MCPRequestContext, payload: dict) -> dict:
    days = int(payload.get("days", 30))
    return analytics_service.get_channel_performance_resource(
        db=db,
        channel=payload["channel"],
        days=days,
    )


def _tool_get_best_selling_products(db, context: MCPRequestContext, payload: dict) -> dict:
    days = int(payload.get("days", 30))
    limit = int(payload.get("limit", 10))
    return {
        "days": days,
        "limit": limit,
        "products": analytics_service.get_best_selling_products(db=db, days=days, limit=limit),
    }


def _tool_calculate_sales_velocity(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = sales_service.get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return analytics_service.calculate_sales_velocity(
        db=db,
        product_id=int(product_id),
        days=int(payload.get("days", 30)),
    )


def _tool_detect_sales_anomaly(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = sales_service.get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return analytics_service.detect_sales_anomaly(
        db=db,
        product_id=int(product_id),
        days=int(payload.get("days", 7)),
        threshold_ratio=float(payload.get("threshold_ratio", 0.5)),
    )


def _tool_compare_sales_by_channel(db, context: MCPRequestContext, payload: dict) -> dict:
    return analytics_service.compare_sales_by_channel(
        db=db,
        days=int(payload.get("days", 30)),
        channel=payload.get("channel"),
    )


def _tool_calculate_product_margin(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product = sales_service.get_product_by_sku(db, payload["sku"])
        product_id = product.id
    return analytics_service.calculate_product_margin(
        db=db,
        product_id=int(product_id),
    )


def register_sales_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="sales",
        description="Sales MCP resources and tools backed by sales and analytics services.",
        min_plan=PlanLevel.PRO,
        resources=[
            MCPResourceSpec(
                uri_template="sales://weekly",
                domain="sales",
                description="Read weekly sales summary across products.",
                min_plan=PlanLevel.PRO,
                handler=_resource_weekly,
            ),
            MCPResourceSpec(
                uri_template="sales://sku/{sku}/weekly",
                domain="sales",
                description="Read weekly sales summary for a single SKU.",
                min_plan=PlanLevel.PRO,
                handler=_resource_sku_weekly,
            ),
            MCPResourceSpec(
                uri_template="sales://top-products",
                domain="sales",
                description="Read top products ranked by blended sales performance.",
                min_plan=PlanLevel.PRO,
                handler=_resource_top_products,
            ),
            MCPResourceSpec(
                uri_template="sales://channel/{channel}/performance",
                domain="sales",
                description="Read sales performance summary for a channel.",
                min_plan=PlanLevel.PRO,
                handler=_resource_channel_performance,
            ),
        ],
        tools=[
            MCPToolSpec(
                name="sales.get_best_selling_products",
                domain="sales",
                description="Rank best-selling products using units, revenue, margin, returns, availability, and velocity context.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_get_best_selling_products,
            ),
            MCPToolSpec(
                name="sales.calculate_sales_velocity",
                domain="sales",
                description="Calculate current and prior sales velocity for a product or SKU.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_calculate_sales_velocity,
            ),
            MCPToolSpec(
                name="sales.detect_sales_anomaly",
                domain="sales",
                description="Detect spikes or drops in sales velocity relative to the prior window.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_detect_sales_anomaly,
            ),
            MCPToolSpec(
                name="sales.compare_sales_by_channel",
                domain="sales",
                description="Compare sales across channels with explicit missing-data flags where channel data is unavailable.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_compare_sales_by_channel,
            ),
            MCPToolSpec(
                name="sales.calculate_product_margin",
                domain="sales",
                description="Calculate gross and return-adjusted margin for a product or SKU.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_calculate_product_margin,
            ),
        ],
    )
