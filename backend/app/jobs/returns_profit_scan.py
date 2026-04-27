from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.jobs.scheduler import create_agent_recommendation
from app.mcp.client import InternalMCPClient
from app.mcp.schemas import MCPRequestContext
from app.models import AgentRecommendation


JOB_NAME = "returns_profit_scan"


def run_returns_profit_scan(
    db: Session,
    client: InternalMCPClient,
    context: MCPRequestContext,
) -> list[AgentRecommendation]:
    recommendations: list[AgentRecommendation] = []
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    iso_range = {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }

    high_return_result = client.read_resource_with_context(
        db=db,
        context=context,
        uri="returns://high-return-products",
    )
    high_return_products = high_return_result.data or []

    for item in high_return_products:
        product_id = item.get("product_id")
        if product_id is None:
            continue

        margin_result = client.invoke_tool_with_context(
            db=db,
            context=context,
            tool_name="returns.calculate_return_adjusted_margin",
            payload={"product_id": product_id, **iso_range},
        )
        margin = margin_result.data or {}
        recommendations.append(
            create_agent_recommendation(
                db,
                job_name=JOB_NAME,
                domain="returns",
                recommendation_type="PROFIT_LEAKAGE",
                severity="high",
                title=f"Return-driven profit leakage: {item.get('sku', product_id)}",
                summary=(
                    f"Return-adjusted profit estimate is {margin.get('return_adjusted_profit')} "
                    f"with confidence {margin.get('confidence_level')}."
                ),
                payload={"high_return_product": item, "margin": margin},
                source_target="returns.calculate_return_adjusted_margin",
            )
        )

        spike_result = client.invoke_tool_with_context(
            db=db,
            context=context,
            tool_name="returns.detect_return_spike",
            payload={"product_id": product_id, "days": 7, "threshold_ratio": 0.5},
        )
        spike = spike_result.data or {}
        if spike.get("is_spike"):
            recommendations.append(
                create_agent_recommendation(
                    db,
                    job_name=JOB_NAME,
                    domain="returns",
                    recommendation_type="RETURN_SPIKE",
                    severity="critical",
                    title=f"Return spike: {item.get('sku', product_id)}",
                    summary=spike.get("summary", "Return activity has spiked materially against the prior window."),
                    payload=spike,
                    source_target="returns.detect_return_spike",
                )
            )

    return recommendations
