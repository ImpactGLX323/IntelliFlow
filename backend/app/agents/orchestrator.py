from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.agents.llm_provider import generate_answer
from app.mcp.client import InternalMCPClient, parse_plan_level
from app.mcp.schemas import MCPToolResult, PlanLevel
from app.mcp.server import InternalMCPServer


PLAN_ORDER = {
    PlanLevel.FREE: 0,
    PlanLevel.PRO: 1,
    PlanLevel.BOOST: 2,
}


@dataclass(frozen=True)
class CopilotResolution:
    intent: str
    feature: str
    required_plan: PlanLevel
    tool_name: str | None = None
    resource_uri: str | None = None
    arguments: dict[str, Any] | None = None


def classify_intent(message: str) -> str:
    normalized = message.strip().lower()

    if any(token in normalized for token in ("low stock", "stock", "inventory", "warehouse")):
        return "inventory"
    if any(token in normalized for token in ("best-selling", "best selling", "sales", "revenue", "velocity")):
        return "sales"
    if any(token in normalized for token in ("return", "refund", "damaged", "profit leakage")):
        return "returns"
    if any(token in normalized for token in ("shipment", "route", "delay", "port", "logistics")):
        return "logistics"
    if any(token in normalized for token in ("customs", "tax", "lhdn", "road transport", "macc", "compliance")):
        return "rag"
    return "general"


class CopilotOrchestrator:
    def __init__(self, mcp_server: InternalMCPServer) -> None:
        self.server = mcp_server

    def handle_query(
        self,
        *,
        db: Session,
        user,
        query: str,
        organization_id: str | None = None,
        requested_plan: str | PlanLevel | None = None,
    ) -> dict[str, Any]:
        user_id = getattr(user, "id", None)
        return self.handle_copilot_query(
            db=db,
            message=query,
            organization_id=organization_id,
            user_plan=requested_plan or "FREE",
            user_id=str(user_id) if user_id is not None else None,
        )

    def handle_copilot_query(
        self,
        *,
        db: Session,
        message: str,
        organization_id: str | None,
        user_plan: str,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        _ = organization_id
        intent = classify_intent(message)
        resolution = self._resolve_intent(intent=intent, message=message)
        requested_plan = parse_plan_level(user_plan)

        if not self._has_plan_access(requested_plan, resolution.required_plan):
            return self._upgrade_response(
                intent=intent,
                required_plan=resolution.required_plan,
                feature=resolution.feature,
            )

        client = InternalMCPClient(self.server, db=db)
        user_context = {
            "user_id": int(user_id) if user_id not in (None, "") else None,
            "user_plan": requested_plan.value,
            "scopes": [],
        }

        if resolution.resource_uri:
            result = client.read_resource(resolution.resource_uri, user_context)
            tools_used = [resolution.resource_uri]
        elif resolution.tool_name:
            result = client.call_tool(resolution.tool_name, resolution.arguments or {}, user_context)
            tools_used = [resolution.tool_name]
        else:
            result = MCPToolResult(
                ok=True,
                data={
                    "message": "IntelliFlow Copilot is ready. Ask about inventory, sales, returns, logistics, or compliance.",
                },
            )
            tools_used = []

        if not result.ok:
            return self._result_to_error_response(
                intent=intent,
                feature=resolution.feature,
                required_plan=resolution.required_plan,
                result=result,
                tools_used=tools_used,
            )

        data = result.data if isinstance(result.data, dict) else {"items": result.data}
        citations = self._extract_citations(data)
        warnings = self._extract_warnings(result, data, intent)
        recommendations = self._extract_recommendations(data)
        answer = generate_answer(
            provider=os.getenv("AI_PROVIDER", "template"),
            message=message,
            intent=intent,
            data=data,
            citations=citations,
            recommendations=recommendations,
            warnings=warnings,
        )
        return {
            "intent": intent,
            "tools_used": tools_used,
            "answer": answer,
            "data": data,
            "citations": citations,
            "recommendations": recommendations,
            "warnings": warnings,
            "upgrade_required": False,
            "required_plan": None,
        }

    def _resolve_intent(self, *, intent: str, message: str) -> CopilotResolution:
        normalized = message.lower()
        if intent == "inventory":
            if "position" in normalized or "available" in normalized:
                return CopilotResolution(
                    intent=intent,
                    feature="inventory_position",
                    required_plan=PlanLevel.FREE,
                    tool_name="inventory.get_stock_position",
                    arguments={"product_id": 1},
                )
            return CopilotResolution(
                intent=intent,
                feature="inventory_low_stock",
                required_plan=PlanLevel.FREE,
                tool_name="inventory.get_low_stock_items",
                arguments={},
            )
        if intent == "sales":
            return CopilotResolution(
                intent=intent,
                feature="sales_best_sellers",
                required_plan=PlanLevel.PRO,
                tool_name="sales.get_best_selling_products",
                arguments={"days": 7 if "week" in normalized else 30, "limit": 10},
            )
        if intent == "returns":
            return CopilotResolution(
                intent=intent,
                feature="returns_profit_leakage",
                required_plan=PlanLevel.PRO,
                resource_uri="returns://high-return-products",
            )
        if intent == "logistics":
            return CopilotResolution(
                intent=intent,
                feature="logistics_delays",
                required_plan=PlanLevel.BOOST,
                tool_name="logistics.detect_late_shipments",
                arguments={"threshold_days": 1},
            )
        if intent == "rag":
            advanced_terms = ("shipment", "route", "delay", "logistics", "transport")
            if any(term in normalized for term in advanced_terms):
                return CopilotResolution(
                    intent=intent,
                    feature="advanced_rag_compliance",
                    required_plan=PlanLevel.BOOST,
                    tool_name="rag.check_transport_compliance" if "transport" in normalized else "rag.check_customs_risk",
                    arguments={"query": message},
                )
            return CopilotResolution(
                intent=intent,
                feature="basic_rag_compliance",
                required_plan=PlanLevel.PRO,
                tool_name="rag.answer_with_citations",
                arguments={"query": message},
            )
        return CopilotResolution(
            intent="general",
            feature="general_inventory_snapshot",
            required_plan=PlanLevel.FREE,
            tool_name="inventory.get_low_stock_items",
            arguments={},
        )

    def _has_plan_access(self, current: PlanLevel, required: PlanLevel) -> bool:
        return PLAN_ORDER[current] >= PLAN_ORDER[required]

    def _upgrade_response(self, *, intent: str, required_plan: PlanLevel, feature: str) -> dict[str, Any]:
        return {
            "intent": intent,
            "tools_used": [],
            "answer": "Upgrade required to use this feature.",
            "data": {
                "upgrade_required": True,
                "required_plan": "PREMIUM" if required_plan == PlanLevel.PRO else required_plan.value,
                "feature": feature,
                "message": "Upgrade required to use this feature.",
            },
            "citations": [],
            "recommendations": [],
            "warnings": [],
            "upgrade_required": True,
            "required_plan": "PREMIUM" if required_plan == PlanLevel.PRO else required_plan.value,
        }

    def _result_to_error_response(
        self,
        *,
        intent: str,
        feature: str,
        required_plan: PlanLevel,
        result: MCPToolResult,
        tools_used: list[str],
    ) -> dict[str, Any]:
        error = result.data.get("error", {}) if isinstance(result.data, dict) else {}
        if error.get("status_code") == 403:
            return self._upgrade_response(intent=intent, required_plan=required_plan, feature=feature)
        return {
            "intent": intent,
            "tools_used": tools_used,
            "answer": result.message or "Unable to process this copilot request.",
            "data": result.data if isinstance(result.data, dict) else {"message": result.message},
            "citations": [],
            "recommendations": [],
            "warnings": [result.message or "MCP tool execution failed."],
            "upgrade_required": False,
            "required_plan": None,
        }

    def _extract_citations(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        citations: list[dict[str, Any]] = []
        for key in ("citations", "sources", "results", "documents"):
            value = data.get(key)
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        citations.append(item)
        return citations[:5]

    def _extract_recommendations(self, data: dict[str, Any]) -> list[str]:
        recommendations: list[str] = []
        if isinstance(data.get("recommended_checks"), list):
            recommendations.extend(str(item) for item in data["recommended_checks"])
        if isinstance(data.get("items"), list):
            for item in data["items"][:5]:
                if isinstance(item, dict):
                    rec = item.get("recommendation")
                    if isinstance(rec, dict) and rec.get("reason"):
                        recommendations.append(str(rec["reason"]))
        if isinstance(data.get("recommendation"), dict) and data["recommendation"].get("reason"):
            recommendations.append(str(data["recommendation"]["reason"]))
        deduped: list[str] = []
        seen = set()
        for recommendation in recommendations:
            if recommendation in seen:
                continue
            seen.add(recommendation)
            deduped.append(recommendation)
        return deduped

    def _extract_warnings(self, result: MCPToolResult, data: dict[str, Any], intent: str) -> list[str]:
        warnings = list(result.warnings or [])
        if isinstance(data.get("warnings"), list):
            warnings.extend(str(item) for item in data["warnings"])
        if intent == "rag" and not self._extract_citations(data):
            warnings.append("No citations available. Do not treat this as compliance advice.")
        return list(dict.fromkeys(warnings))
