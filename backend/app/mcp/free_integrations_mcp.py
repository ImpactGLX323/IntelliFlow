from __future__ import annotations

from sqlalchemy.orm import Session

from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPResourceSpec, MCPToolSpec, PlanLevel
from app.services.free_api_integration_service import (
    get_bnm_rates,
    get_malaysia_demand_signals,
    get_market_wide_best_sellers,
    get_own_sales_best_sellers,
    get_registry,
    get_status,
    get_port_risk_preview,
    get_warehouse_directory,
)


def _resource_registry(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    _ = context
    _ = payload
    return get_registry(db)


def _resource_warehouses(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    _ = context
    return get_warehouse_directory(
        db,
        state=payload.get("state"),
        city=payload.get("city"),
        q=payload.get("q"),
        source=payload.get("source", "seeded"),
        limit=int(payload.get("limit", 25)),
    )


def _resource_port_risk(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    _ = context
    return get_port_risk_preview(
        db,
        include_weather=bool(payload.get("include_weather", True)),
        include_marine=bool(payload.get("include_marine", True)),
    )


def _resource_market_signals(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    _ = context
    return get_malaysia_demand_signals(
        db,
        category=payload.get("category"),
        source=payload.get("source", "preview"),
    )


def _resource_bnm_rates(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    _ = context
    return get_bnm_rates(db, currency=payload.get("currency"))


def _tool_registry(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    return _resource_registry(db, context, payload)


def _tool_find_warehouses(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    return _resource_warehouses(db, context, payload)


def _tool_port_risk(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    return _resource_port_risk(db, context, payload)


def _tool_market_signals(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    return _resource_market_signals(db, context, payload)


def _tool_bnm_rates(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    return _resource_bnm_rates(db, context, payload)


def _tool_own_sales_best_sellers(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    class _StubUser:
        id = context.user_id
        organization_id = None

    return get_own_sales_best_sellers(db, user=_StubUser(), provider=payload.get("provider"))


def _tool_market_wide_best_sellers(db: Session, context: MCPRequestContext, payload: dict) -> dict:
    _ = payload
    return get_market_wide_best_sellers()


def register_free_integrations_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="free_integrations",
        description="Public, preview, and plan-aware integration resources for Malaysia-focused warehouse, risk, demand, and finance signals.",
        min_plan=PlanLevel.FREE,
        resources=[
            MCPResourceSpec(
                uri_template="publicdata://malaysia/registry",
                domain="integrations",
                description="Read the public/free integration provider registry.",
                min_plan=PlanLevel.FREE,
                handler=_resource_registry,
            ),
            MCPResourceSpec(
                uri_template="warehouses://malaysia/public-directory",
                domain="integrations",
                description="Read the public Malaysian warehouse directory preview.",
                min_plan=PlanLevel.FREE,
                handler=_resource_warehouses,
            ),
            MCPResourceSpec(
                uri_template="logistics://malaysia/port-risk-preview",
                domain="integrations",
                description="Read Malaysian port weather and preview pressure risk.",
                min_plan=PlanLevel.FREE,
                handler=_resource_port_risk,
            ),
            MCPResourceSpec(
                uri_template="market://malaysia/demand-signals",
                domain="integrations",
                description="Read Malaysia demand signals preview.",
                min_plan=PlanLevel.FREE,
                handler=_resource_market_signals,
            ),
            MCPResourceSpec(
                uri_template="finance://malaysia/bnm-rates",
                domain="integrations",
                description="Read BNM FX rate preview or official data when configured.",
                min_plan=PlanLevel.FREE,
                handler=_resource_bnm_rates,
            ),
        ],
        tools=[
            MCPToolSpec(name="integrations.get_free_api_registry", domain="integrations", description="Get the free integration registry.", min_plan=PlanLevel.FREE, read_only=True, handler=_tool_registry),
            MCPToolSpec(name="integrations.find_malaysian_warehouses", domain="integrations", description="Find public Malaysian warehouses.", min_plan=PlanLevel.FREE, read_only=True, handler=_tool_find_warehouses),
            MCPToolSpec(name="integrations.get_malaysia_port_risk_preview", domain="integrations", description="Get Malaysia port weather and preview risk.", min_plan=PlanLevel.FREE, read_only=True, handler=_tool_port_risk),
            MCPToolSpec(name="integrations.get_malaysia_demand_signals", domain="integrations", description="Get Malaysia demand signals preview.", min_plan=PlanLevel.FREE, read_only=True, handler=_tool_market_signals),
            MCPToolSpec(name="integrations.get_bnm_rates", domain="integrations", description="Get BNM rates preview or official data when configured.", min_plan=PlanLevel.FREE, read_only=True, handler=_tool_bnm_rates),
            MCPToolSpec(name="integrations.get_own_sales_best_sellers_weekly", domain="integrations", description="Get own-store best sellers when marketplace is connected.", min_plan=PlanLevel.PRO, read_only=True, handler=_tool_own_sales_best_sellers),
            MCPToolSpec(name="integrations.get_malaysia_best_sellers_weekly", domain="integrations", description="Get market-wide Malaysia best-seller provider status.", min_plan=PlanLevel.BOOST, read_only=True, handler=_tool_market_wide_best_sellers),
        ],
    )
