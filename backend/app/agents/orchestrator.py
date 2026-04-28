from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.mcp.client import InternalMCPClient, effective_plan_level, parse_plan_level
from app.mcp.schemas import MCPRequestContext, PlanLevel
from app.mcp.server import InternalMCPServer
from app.models import User


PLAN_ORDER = {
    PlanLevel.FREE: 0,
    PlanLevel.PRO: 1,
    PlanLevel.BOOST: 2,
}


@dataclass(frozen=True)
class CopilotIntentAction:
    intent: str
    tool_name: str | None = None
    resource_uri: str | None = None
    payload: dict[str, Any] | None = None
    required_plan: PlanLevel = PlanLevel.FREE
    summary_mode: str = "generic"


class CopilotOrchestrator:
    """
    MCP-backed AI copilot orchestrator.

    The orchestrator classifies user intent, enforces MCP plan access, and then
    delegates to internal MCP tools/resources. It never writes to the database
    directly and it never bypasses MCP/service-layer rules.
    """

    def __init__(self, mcp_server: InternalMCPServer) -> None:
        self.server = mcp_server
        self.client = InternalMCPClient(mcp_server)

    def handle_query(
        self,
        *,
        db: Session,
        user: User,
        query: str,
        organization_id: str | None = None,
        requested_plan: str | PlanLevel | None = None,
    ) -> dict[str, Any]:
        request_id = str(uuid4())
        _ = organization_id  # Multi-tenant org scoping is not modeled yet.
        action = self._classify_intent(query)
        effective_plan = effective_plan_level(user, requested_plan)

        if not self._has_plan_access(effective_plan, action.required_plan):
            return {
                "intent": action.intent,
                "tools_used": [name for name in (action.tool_name, action.resource_uri) if name],
                "answer": f"This request requires the {action.required_plan.value} plan.",
                "data": {},
                "citations": [],
                "recommendations": [],
                "warnings": ["Requested feature is locked by plan policy."],
                "upgrade_required": True,
                "required_plan": action.required_plan.value,
                "request_id": request_id,
            }

        context = self.client.build_context(user, request_id=request_id, requested_plan=effective_plan)
        tools_used: list[str] = []

        try:
            if action.resource_uri:
                result = self.server.read_resource(db=db, context=context, uri=action.resource_uri)
                tools_used.append(action.resource_uri)
            elif action.tool_name:
                result = self.server.invoke(
                    db=db,
                    context=context,
                    tool_name=action.tool_name,
                    payload=action.payload or {},
                )
                tools_used.append(action.tool_name)
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No MCP target resolved for request")

            data = result.data if isinstance(result.data, dict) else {"items": result.data}

            if action.intent == "compliance_rag" and self._is_customs_law_query(query):
                search_result = self.server.invoke(
                    db=db,
                    context=context,
                    tool_name="rag.search_official_docs",
                    payload={"query": query},
                )
                tools_used.append("rag.search_official_docs")
                answer_result = self.server.invoke(
                    db=db,
                    context=context,
                    tool_name="rag.answer_with_citations",
                    payload={"query": query},
                )
                tools_used.append("rag.answer_with_citations")
                data = {
                    "search": search_result.data,
                    "answer": answer_result.data,
                }
                warnings = list(dict.fromkeys((search_result.warnings or []) + (answer_result.warnings or [])))
            else:
                warnings = result.warnings

            answer = self._build_answer(action.intent, query, data)
            citations = self._extract_citations(data)
            recommendations = self._extract_recommendations(data)

            return {
                "intent": action.intent,
                "tools_used": tools_used,
                "answer": answer,
                "data": data,
                "citations": citations,
                "recommendations": recommendations,
                "warnings": warnings,
                "upgrade_required": False,
                "required_plan": None,
                "request_id": request_id,
            }
        except HTTPException as exc:
            if exc.status_code == status.HTTP_403_FORBIDDEN:
                required_plan = self._required_plan_from_action(action)
                return {
                    "intent": action.intent,
                    "tools_used": tools_used or [name for name in (action.tool_name, action.resource_uri) if name],
                    "answer": f"This request requires the {required_plan.value} plan.",
                    "data": {"message": exc.detail},
                    "citations": [],
                    "recommendations": [],
                    "warnings": ["The MCP layer denied this capability based on plan policy."],
                    "upgrade_required": True,
                    "required_plan": required_plan.value,
                    "request_id": request_id,
                }
            raise

    def _classify_intent(self, query: str) -> CopilotIntentAction:
        normalized = query.strip().lower()

        if "low on stock" in normalized or "low stock" in normalized:
            return CopilotIntentAction(
                intent="inventory",
                resource_uri="inventory://low-stock",
                required_plan=PlanLevel.FREE,
                summary_mode="inventory_low_stock",
            )

        if "available to promise" in normalized or "atp" in normalized:
            return CopilotIntentAction(
                intent="inventory",
                tool_name="inventory.get_available_to_promise",
                payload={},
                required_plan=PlanLevel.PRO,
                summary_mode="inventory_atp",
            )

        if "best-selling" in normalized or "best selling" in normalized or "top products" in normalized:
            days = 7 if "week" in normalized else 30
            return CopilotIntentAction(
                intent="sales",
                tool_name="sales.get_best_selling_products",
                payload={"days": days, "limit": 10},
                required_plan=PlanLevel.PRO,
                summary_mode="sales_best_sellers",
            )

        if "leaking profit" in normalized or ("returns" in normalized and "profit" in normalized):
            return CopilotIntentAction(
                intent="returns_profit",
                resource_uri="returns://high-return-products",
                required_plan=PlanLevel.PRO,
                summary_mode="returns_profit",
            )

        if "delayed international shipment" in normalized or "any delayed international shipments" in normalized or (
            "international" in normalized and ("shipment" in normalized or "shipments" in normalized) and ("delayed" in normalized or "late" in normalized)
        ):
            return CopilotIntentAction(
                intent="logistics",
                tool_name="logistics.detect_late_shipments",
                payload={"threshold_days": 1},
                required_plan=PlanLevel.BOOST,
                summary_mode="logistics_delays",
            )

        if self._is_customs_law_query(query):
            required_plan = PlanLevel.BOOST if "shipment" in normalized else PlanLevel.PRO
            primary_tool = "rag.check_customs_risk" if "shipment" in normalized else "rag.answer_with_citations"
            return CopilotIntentAction(
                intent="compliance_rag",
                tool_name=primary_tool,
                payload={"query": query},
                required_plan=required_plan,
                summary_mode="compliance",
            )

        if any(term in normalized for term in ("road transport", "transport compliance", "anti-corruption", "tax law", "customs")):
            tool_name = "rag.check_transport_compliance" if "transport" in normalized else "rag.summarize_relevant_regulation"
            required_plan = PlanLevel.BOOST if tool_name == "rag.check_transport_compliance" else PlanLevel.PRO
            payload = {"query": query} if tool_name != "rag.summarize_relevant_regulation" else {"query": query}
            return CopilotIntentAction(
                intent="compliance_rag",
                tool_name=tool_name,
                payload=payload,
                required_plan=required_plan,
                summary_mode="compliance",
            )

        if any(term in normalized for term in ("inventory", "warehouse", "stock movement", "replenish")):
            return CopilotIntentAction(
                intent="inventory",
                resource_uri="inventory://low-stock",
                required_plan=PlanLevel.FREE,
                summary_mode="inventory_low_stock",
            )

        return CopilotIntentAction(
            intent="general",
            tool_name="rag.get_inventory_risk_snapshot",
            payload={},
            required_plan=PlanLevel.PRO,
            summary_mode="general",
        )

    def _is_customs_law_query(self, query: str) -> bool:
        normalized = query.lower()
        return any(term in normalized for term in ("malaysian customs", "customs law", "customs act"))

    def _has_plan_access(self, current: PlanLevel, required: PlanLevel) -> bool:
        return PLAN_ORDER[current] >= PLAN_ORDER[required]

    def _required_plan_from_action(self, action: CopilotIntentAction) -> PlanLevel:
        return action.required_plan

    def _build_answer(self, intent: str, query: str, data: dict[str, Any]) -> str:
        if intent == "inventory":
            items = data.get("items") or data.get("movements") or data.get("recommendation")
            if isinstance(data.get("items"), list):
                count = len(data["items"])
                return f"{count} inventory items were returned for: {query}"
            if data.get("sku"):
                return f"Inventory position for {data.get('sku')} is available."
            return "Inventory insight is available."

        if intent == "sales":
            products = data.get("products", [])
            if products:
                top = products[0]
                return f"Top selling product is {top.get('product_name') or top.get('sku')} with {top.get('units_sold')} units sold."
            return "Sales insight is available."

        if intent == "returns_profit":
            items = data.get("items", data if isinstance(data, list) else [])
            if isinstance(items, list) and items:
                top = items[0]
                return f"Highest return pressure is on {top.get('product_name') or top.get('sku')} with {top.get('returned_quantity')} returned units."
            return "Returns and profit analysis is available."

        if intent == "logistics":
            items = data.get("items", data if isinstance(data, list) else [])
            if isinstance(items, list):
                return f"{len(items)} delayed shipment records were identified."
            if data.get("shipment_number"):
                return f"Delay impact is available for shipment {data['shipment_number']}."
            return "Logistics status is available."

        if intent == "compliance_rag":
            answer_block = data.get("answer")
            if isinstance(answer_block, dict):
                return answer_block.get("answer", "Compliance guidance is available.")
            if isinstance(answer_block, str):
                return answer_block
            return data.get("answer", "Compliance guidance is available.")

        if intent == "general":
            items = data.get("items", data if isinstance(data, list) else [])
            if isinstance(items, list) and items:
                return f"{len(items)} operational risk items were identified."
            return data.get("summary", "General AI insight is available.")

        return "AI copilot response is available."

    def _extract_citations(self, data: dict[str, Any]) -> list[dict]:
        citations: list[dict] = []
        for key in ("sources", "results", "documents"):
            value = data.get(key)
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        citations.append(item)
        answer_block = data.get("answer")
        if isinstance(answer_block, dict):
            for key in ("sources", "results", "documents"):
                value = answer_block.get(key)
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            citations.append(item)
        search_block = data.get("search")
        if isinstance(search_block, dict):
            for key in ("results", "documents", "sources"):
                value = search_block.get(key)
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            citations.append(item)
        deduped: list[dict] = []
        seen = set()
        for citation in citations:
            key = citation.get("document_id") or citation.get("title") or str(citation)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(citation)
        return deduped

    def _extract_recommendations(self, data: dict[str, Any]) -> list[str]:
        recommendations: list[str] = []

        def visit(node: Any) -> None:
            if isinstance(node, dict):
                for key, value in node.items():
                    if key in {"recommended_checks", "recommended_actions", "recommended_mitigation"} and isinstance(value, list):
                        recommendations.extend(str(item) for item in value)
                    elif key == "recommendation" and isinstance(value, dict):
                        action = value.get("action")
                        reason = value.get("reason")
                        if action or reason:
                            recommendations.append(" - ".join(part for part in [str(action) if action else None, str(reason) if reason else None] if part))
                    else:
                        visit(value)
            elif isinstance(node, list):
                for item in node:
                    visit(item)

        visit(data)
        deduped: list[str] = []
        seen = set()
        for item in recommendations:
            if item in seen:
                continue
            seen.add(item)
            deduped.append(item)
        return deduped
