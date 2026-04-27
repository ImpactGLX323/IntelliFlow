from __future__ import annotations

from datetime import datetime, timedelta

from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPToolResult, MCPToolSpec, PlanLevel
from app.services import returns_service


def _get_profit_leakage(db, context: MCPRequestContext, payload: dict) -> dict:
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    if start_date is None or end_date is None:
        end = datetime.utcnow()
        start = end - timedelta(days=30)
    else:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    return returns_service.get_profit_leakage_report(db, start, end)


def _get_high_return_products(db, context: MCPRequestContext, payload: dict) -> list:
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    if start_date is None or end_date is None:
        end = datetime.utcnow()
        start = end - timedelta(days=30)
    else:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    return returns_service.get_high_return_products(db, start, end)


def _returns_write_placeholder(db, context: MCPRequestContext, payload: dict) -> MCPToolResult:
    return MCPToolResult(
        ok=True,
        data={
            "phase": "foundation",
            "enabled": False,
            "rule": "Future MCP return actions must call returns_service so refunds, approvals, and stock handling stay audited.",
        },
    )


def register_returns_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="returns",
        description="Returns and profit-leakage MCP tools.",
        min_plan=PlanLevel.PRO,
        tools=[
            MCPToolSpec(
                name="returns.get_profit_leakage_report",
                domain="returns",
                description="Read profit leakage analytics from the returns service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_get_profit_leakage,
            ),
            MCPToolSpec(
                name="returns.get_high_return_products",
                domain="returns",
                description="Read high-return product analytics from the returns service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_get_high_return_products,
            ),
            MCPToolSpec(
                name="returns.plan_return_actions",
                domain="returns",
                description="Placeholder for future service-backed return action tools.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_returns_write_placeholder,
            ),
        ],
    )
