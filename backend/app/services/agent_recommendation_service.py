from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.mcp.client import resolve_plan_level
from app.mcp.schemas import PlanLevel
from app.models import AgentRecommendation, User


PLAN_DOMAIN_ACCESS = {
    PlanLevel.FREE: {"inventory"},
    PlanLevel.PRO: {"inventory", "sales", "returns", "rag"},
    PlanLevel.BOOST: {"inventory", "sales", "returns", "rag", "logistics"},
}


def _extract_string_list(payload: Any, candidate_keys: tuple[str, ...]) -> list[str]:
    values: list[str] = []

    def visit(node: Any) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if key in candidate_keys:
                    if isinstance(value, list):
                        values.extend(str(item) for item in value if item is not None)
                    elif value is not None:
                        values.append(str(value))
                else:
                    visit(value)
        elif isinstance(node, list):
            for item in node:
                visit(item)

    visit(payload)
    deduped: list[str] = []
    seen = set()
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


def _recommended_action(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    for key in ("recommended_action", "recommended_mitigation", "next_action", "summary"):
        value = payload.get(key)
        if value:
            return str(value)
    if "margin" in payload and isinstance(payload["margin"], dict):
        margin = payload["margin"]
        if margin.get("missing_data"):
            return "Review missing cost data before acting on the margin estimate."
    return None


def serialize_recommendation(recommendation: AgentRecommendation) -> dict[str, Any]:
    payload = recommendation.payload or {}
    return {
        "id": recommendation.id,
        "job_name": recommendation.job_name,
        "domain": recommendation.domain,
        "recommendation_type": recommendation.recommendation_type,
        "severity": recommendation.severity,
        "title": recommendation.title,
        "explanation": recommendation.summary,
        "affected_skus": _extract_string_list(payload, ("sku", "skus", "affected_skus")),
        "affected_orders": _extract_string_list(
            payload,
            ("order_number", "order_numbers", "affected_orders", "affected_sales_orders", "affected_purchase_orders"),
        ),
        "affected_shipments": _extract_string_list(
            payload,
            ("shipment_number", "shipment_numbers", "affected_shipments"),
        ),
        "recommended_action": _recommended_action(payload),
        "status": recommendation.status,
        "created_at": recommendation.created_at,
    }


def get_allowed_domains(user: User) -> list[str]:
    plan_level = resolve_plan_level(user)
    return sorted(PLAN_DOMAIN_ACCESS[plan_level])


def get_capabilities(user: User) -> dict[str, Any]:
    plan_level = resolve_plan_level(user)
    allowed_domains = PLAN_DOMAIN_ACCESS[plan_level]
    return {
        "plan_level": plan_level.value,
        "allowed_domains": sorted(allowed_domains),
        "features": {
            "inventory_insights": True,
            "sales_insights": "sales" in allowed_domains,
            "returns_profit": "returns" in allowed_domains,
            "compliance_rag": "rag" in allowed_domains,
            "logistics_control_tower": "logistics" in allowed_domains,
            "advanced_recommendations": plan_level == PlanLevel.BOOST,
        },
    }


def list_recommendations(
    db: Session,
    *,
    user: User,
    domain: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    allowed_domains = set(get_allowed_domains(user))
    query = db.query(AgentRecommendation).filter(AgentRecommendation.domain.in_(allowed_domains))
    if domain:
        if domain not in allowed_domains:
            return []
        query = query.filter(AgentRecommendation.domain == domain)
    recommendations = query.order_by(AgentRecommendation.created_at.desc()).limit(limit).all()
    return [serialize_recommendation(item) for item in recommendations]
