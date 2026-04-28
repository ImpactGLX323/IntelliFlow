from __future__ import annotations

from datetime import datetime, timedelta

from app.mcp.schemas import (
    MCPModuleSpec,
    MCPRequestContext,
    MCPResourceSpec,
    MCPToolSpec,
    PlanLevel,
)
from app.services import returns_service


def _parse_range(payload: dict, *, default_days: int = 30) -> tuple[datetime, datetime]:
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    if start_date is None or end_date is None:
        end = datetime.utcnow()
        start = end - timedelta(days=default_days)
        return start, end
    return datetime.fromisoformat(start_date), datetime.fromisoformat(end_date)


def _resource_weekly_returns(db, context: MCPRequestContext, payload: dict) -> dict:
    weeks = int(payload.get("weeks", 8))
    return returns_service.get_weekly_returns(db, weeks=weeks)


def _resource_returns_by_sku(db, context: MCPRequestContext, payload: dict) -> dict:
    product = returns_service.get_product_by_sku(db, payload["sku"])
    start, end = _parse_range(payload)
    return {
        "return_rate": returns_service.get_return_rate(db, product_id=product.id, start_date=start, end_date=end),
        "reason_breakdown": returns_service.classify_return_reasons(db, product_id=product.id, start_date=start, end_date=end),
        "return_adjusted_margin": returns_service.calculate_return_adjusted_margin(db, product.id, start, end),
    }


def _resource_high_return_products(db, context: MCPRequestContext, payload: dict) -> list[dict]:
    start, end = _parse_range(payload)
    return returns_service.get_high_return_products(db, start, end)


def _tool_get_return_rate(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product_id = returns_service.get_product_by_sku(db, payload["sku"]).id
    start, end = _parse_range(payload)
    return returns_service.get_return_rate(db, product_id=int(product_id), start_date=start, end_date=end)


def _tool_classify_return_reasons(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and payload.get("sku"):
        product_id = returns_service.get_product_by_sku(db, payload["sku"]).id
    start, end = _parse_range(payload)
    return returns_service.classify_return_reasons(db, product_id=product_id, start_date=start, end_date=end)


def _tool_calculate_return_adjusted_margin(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product_id = returns_service.get_product_by_sku(db, payload["sku"]).id
    start, end = _parse_range(payload)
    return returns_service.calculate_return_adjusted_margin(db, int(product_id), start, end)


def _tool_detect_return_spike(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and "sku" in payload:
        product_id = returns_service.get_product_by_sku(db, payload["sku"]).id
    return returns_service.detect_return_spike(
        db,
        product_id=int(product_id),
        days=int(payload.get("days", 7)),
        threshold_ratio=float(payload.get("threshold_ratio", 0.5)),
    )


def _tool_link_returns_to_supplier(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and payload.get("sku"):
        product_id = returns_service.get_product_by_sku(db, payload["sku"]).id
    start, end = _parse_range(payload)
    return returns_service.link_returns_to_supplier(db, product_id=product_id, start_date=start, end_date=end)


def _tool_link_returns_to_warehouse(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and payload.get("sku"):
        product_id = returns_service.get_product_by_sku(db, payload["sku"]).id
    start, end = _parse_range(payload)
    return returns_service.link_returns_to_warehouse(db, product_id=product_id, start_date=start, end_date=end)


def _tool_create_quality_investigation(db, context: MCPRequestContext, payload: dict) -> dict:
    product_id = payload.get("product_id")
    if product_id is None and payload.get("sku"):
        product_id = returns_service.get_product_by_sku(db, payload["sku"]).id
    start, end = _parse_range(payload)
    return returns_service.create_quality_investigation(
        db,
        product_id=int(product_id),
        start_date=start,
        end_date=end,
        issue_summary=payload.get("issue_summary"),
    )


def register_returns_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="returns",
        description="Returns and profit MCP resources and tools backed by returns service analytics.",
        min_plan=PlanLevel.PRO,
        resources=[
            MCPResourceSpec(
                uri_template="returns://weekly",
                domain="returns",
                description="Read weekly return quantities and refund costs.",
                min_plan=PlanLevel.PRO,
                handler=_resource_weekly_returns,
            ),
            MCPResourceSpec(
                uri_template="returns://sku/{sku}",
                domain="returns",
                description="Read return metrics, reasons, and margin impact for a SKU.",
                min_plan=PlanLevel.PRO,
                handler=_resource_returns_by_sku,
            ),
            MCPResourceSpec(
                uri_template="returns://high-return-products",
                domain="returns",
                description="Read products with the highest return volume and cost impact.",
                min_plan=PlanLevel.PRO,
                handler=_resource_high_return_products,
            ),
        ],
        tools=[
            MCPToolSpec(
                name="returns.get_return_rate",
                domain="returns",
                description="Calculate product return rate over a date range.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_get_return_rate,
            ),
            MCPToolSpec(
                name="returns.classify_return_reasons",
                domain="returns",
                description="Summarize return reasons and cost impact.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_classify_return_reasons,
            ),
            MCPToolSpec(
                name="returns.calculate_return_adjusted_margin",
                domain="returns",
                description="Calculate return-adjusted profit with best available estimates and confidence scoring.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_calculate_return_adjusted_margin,
            ),
            MCPToolSpec(
                name="returns.detect_return_spike",
                domain="returns",
                description="Detect return-rate spikes against the prior comparison window.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_detect_return_spike,
            ),
            MCPToolSpec(
                name="returns.link_returns_to_supplier",
                domain="returns",
                description="Link return activity and costs to suppliers.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_link_returns_to_supplier,
            ),
            MCPToolSpec(
                name="returns.link_returns_to_warehouse",
                domain="returns",
                description="Link return activity and costs to warehouses.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_link_returns_to_warehouse,
            ),
            MCPToolSpec(
                name="returns.create_quality_investigation",
                domain="returns",
                description="Create a safe quality investigation recommendation without mutating operational tables.",
                min_plan=PlanLevel.BOOST,
                read_only=False,
                handler=_tool_create_quality_investigation,
            ),
        ],
    )
