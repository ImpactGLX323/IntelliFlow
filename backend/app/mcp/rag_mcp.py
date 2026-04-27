from __future__ import annotations

from app.mcp.schemas import (
    MCPModuleSpec,
    MCPRequestContext,
    MCPResourceSpec,
    MCPToolSpec,
    PlanLevel,
)
from app.services import analytics_service, rag_service


def _resource_official_doc(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.get_official_document(payload["document_id"])


def _resource_customs(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.get_documents_by_topic("customs")


def _resource_road_transport(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.get_documents_by_topic("road-transport")


def _resource_tax(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.get_documents_by_topic("tax")


def _resource_anti_corruption(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.get_documents_by_topic("anti-corruption")


def _tool_search_official_docs(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.search_official_docs(payload["query"])


def _tool_answer_with_citations(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.answer_with_citations(payload["query"])


def _tool_check_customs_risk(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.check_customs_risk(payload["query"])


def _tool_check_transport_compliance(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.check_transport_compliance(payload["query"])


def _tool_summarize_relevant_regulation(db, context: MCPRequestContext, payload: dict) -> dict:
    return rag_service.summarize_relevant_regulation(
        payload["query"],
        topic=payload.get("topic"),
    )


def _tool_get_quick_insights(db, context: MCPRequestContext, payload: dict) -> dict:
    if context.user_id is None:
        return {"insights": [], "summary": "User context required for AI insights."}
    result = rag_service.get_quick_insights(db=db, user_id=context.user_id)
    return {
        "summary": result.get("summary", ""),
        "insights": result.get("insights", []),
    }


def _tool_get_inventory_risk_snapshot(db, context: MCPRequestContext, payload: dict) -> list:
    return analytics_service.get_inventory_risk_snapshot(db=db)


def register_rag_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="rag",
        description="RAG and Malaysia compliance MCP resources and tools.",
        min_plan=PlanLevel.PRO,
        resources=[
            MCPResourceSpec(
                uri_template="docs://official/{document_id}",
                domain="rag",
                description="Read metadata and source reference for a local official document.",
                min_plan=PlanLevel.PRO,
                handler=_resource_official_doc,
            ),
            MCPResourceSpec(
                uri_template="docs://customs",
                domain="rag",
                description="Read local official documents relevant to Malaysia customs.",
                min_plan=PlanLevel.PRO,
                handler=_resource_customs,
            ),
            MCPResourceSpec(
                uri_template="docs://road-transport",
                domain="rag",
                description="Read local official documents relevant to Malaysia road transport compliance.",
                min_plan=PlanLevel.PRO,
                handler=_resource_road_transport,
            ),
            MCPResourceSpec(
                uri_template="docs://tax",
                domain="rag",
                description="Read local official documents relevant to Malaysia tax compliance.",
                min_plan=PlanLevel.PRO,
                handler=_resource_tax,
            ),
            MCPResourceSpec(
                uri_template="docs://anti-corruption",
                domain="rag",
                description="Read local official documents relevant to anti-corruption compliance.",
                min_plan=PlanLevel.PRO,
                handler=_resource_anti_corruption,
            ),
        ],
        tools=[
            MCPToolSpec(
                name="rag.search_official_docs",
                domain="rag",
                description="Search the local official document set by topic and document metadata.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_search_official_docs,
            ),
            MCPToolSpec(
                name="rag.answer_with_citations",
                domain="rag",
                description="Answer a compliance query with source references and warnings when citation retrieval is unavailable.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_answer_with_citations,
            ),
            MCPToolSpec(
                name="rag.summarize_relevant_regulation",
                domain="rag",
                description="Summarize relevant regulations from the local official document catalog with source references.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_summarize_relevant_regulation,
            ),
            MCPToolSpec(
                name="rag.check_customs_risk",
                domain="rag",
                description="Identify customs-related compliance review areas using the local official document set.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_check_customs_risk,
            ),
            MCPToolSpec(
                name="rag.check_transport_compliance",
                domain="rag",
                description="Identify transport-related compliance review areas using the local official document set.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_check_transport_compliance,
            ),
            MCPToolSpec(
                name="rag.get_quick_insights",
                domain="rag",
                description="Read business insights via the rag service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_get_quick_insights,
            ),
            MCPToolSpec(
                name="rag.get_inventory_risk_snapshot",
                domain="rag",
                description="Read inventory risk context via the analytics service.",
                min_plan=PlanLevel.PRO,
                read_only=True,
                handler=_tool_get_inventory_risk_snapshot,
            ),
        ],
    )
