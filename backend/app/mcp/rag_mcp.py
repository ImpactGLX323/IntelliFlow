from __future__ import annotations

from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPToolResult, MCPToolSpec, PlanLevel
from app.services import analytics_service, rag_service


def _get_quick_insights(db, context: MCPRequestContext, payload: dict) -> dict:
    if context.user_id is None:
        return {"insights": [], "summary": "User context required for AI insights."}
    result = rag_service.get_quick_insights(db=db, user_id=context.user_id)
    return {
        "summary": result.get("summary", ""),
        "insights": result.get("insights", []),
    }


def _get_compliance_context(db, context: MCPRequestContext, payload: dict) -> dict:
    if context.user_id is None:
        return {"summary": "User context required.", "insights": []}
    query = payload.get(
        "query",
        "Summarize Malaysia compliance considerations for inventory, customs, returns, and logistics operations.",
    )
    return rag_service.get_compliance_context(db=db, user_id=context.user_id, query=query)


def _get_inventory_risk_snapshot(db, context: MCPRequestContext, payload: dict) -> list:
    return analytics_service.get_inventory_risk_snapshot(db=db)


def _advanced_rag_placeholder(db, context: MCPRequestContext, payload: dict) -> MCPToolResult:
    return MCPToolResult(
        ok=True,
        data={
            "phase": "foundation",
            "enabled": False,
            "rule": "Advanced BOOST recommendation and exception MCP flows will be layered on top of rag_service and analytics_service.",
        },
    )


def register_rag_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="rag",
        description="RAG and Malaysia compliance MCP tools.",
        min_plan=PlanLevel.PRO,
        tools=[
            MCPToolSpec(
                name="rag.get_quick_insights",
                domain="rag",
                description="Read business insights via the rag service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_get_quick_insights,
            ),
            MCPToolSpec(
                name="rag.get_inventory_risk_snapshot",
                domain="rag",
                description="Read inventory risk context via the analytics service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_get_inventory_risk_snapshot,
            ),
            MCPToolSpec(
                name="rag.get_malaysia_compliance_context",
                domain="rag",
                description="Read compliance-oriented RAG context for Malaysia operations.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_get_compliance_context,
            ),
            MCPToolSpec(
                name="rag.plan_advanced_reasoning",
                domain="rag",
                description="Placeholder for future advanced recommendation and exception tools.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_advanced_rag_placeholder,
            ),
        ],
    )
