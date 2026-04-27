from __future__ import annotations

from fastapi import HTTPException, status

from app.mcp.schemas import MCPRequestContext, MCPToolSpec, PlanLevel


PLAN_ORDER = {
    PlanLevel.FREE: 0,
    PlanLevel.PRO: 1,
    PlanLevel.BOOST: 2,
}


def has_plan_access(current: PlanLevel, required: PlanLevel) -> bool:
    return PLAN_ORDER[current] >= PLAN_ORDER[required]


def ensure_plan_access(context: MCPRequestContext, required: PlanLevel) -> None:
    if not has_plan_access(context.plan_level, required):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan {context.plan_level.value} cannot access {required.value} MCP capabilities",
        )


def ensure_scope_access(context: MCPRequestContext, required_scopes: list[str]) -> None:
    if not required_scopes:
        return
    missing = [scope for scope in required_scopes if scope not in context.scopes]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing MCP scopes: {', '.join(missing)}",
        )


def enforce_tool_access(context: MCPRequestContext, tool: MCPToolSpec) -> None:
    ensure_plan_access(context, tool.min_plan)
    ensure_scope_access(context, tool.scopes)
