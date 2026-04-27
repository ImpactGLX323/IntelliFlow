from __future__ import annotations

from sqlalchemy.orm import Session

from app.jobs.scheduler import create_agent_recommendation
from app.mcp.client import InternalMCPClient
from app.mcp.schemas import MCPRequestContext
from app.models import AgentRecommendation


JOB_NAME = "weekly_sales_scan"


def run_weekly_sales_scan(
    db: Session,
    client: InternalMCPClient,
    context: MCPRequestContext,
) -> list[AgentRecommendation]:
    recommendations: list[AgentRecommendation] = []

    top_products_result = client.invoke_tool_with_context(
        db=db,
        context=context,
        tool_name="sales.get_best_selling_products",
        payload={"days": 7, "limit": 10},
    )
    products = (top_products_result.data or {}).get("products", [])
    for product in products:
        recommendations.append(
            create_agent_recommendation(
                db,
                job_name=JOB_NAME,
                domain="sales",
                recommendation_type="BEST_SELLER",
                severity="low",
                title=f"Best-selling product: {product.get('sku', product.get('product_id'))}",
                summary=(
                    f"Units sold: {product.get('units_sold')}, revenue: {product.get('revenue')}, "
                    f"gross margin: {product.get('gross_margin')}."
                ),
                payload=product,
                source_target="sales.get_best_selling_products",
            )
        )

    for product in products[:5]:
        product_id = product.get("product_id")
        if product_id is None:
            continue

        velocity_result = client.invoke_tool_with_context(
            db=db,
            context=context,
            tool_name="sales.calculate_sales_velocity",
            payload={"product_id": product_id, "days": 7},
        )
        velocity = velocity_result.data or {}
        change = velocity.get("velocity_change_pct")
        if change is not None and abs(change) >= 25:
            recommendations.append(
                create_agent_recommendation(
                    db,
                    job_name=JOB_NAME,
                    domain="sales",
                    recommendation_type="VELOCITY_CHANGE",
                    severity="medium",
                    title=f"Sales velocity change: {product.get('sku', product_id)}",
                    summary=f"Sales velocity changed by {change}% versus the prior comparison window.",
                    payload=velocity,
                    source_target="sales.calculate_sales_velocity",
                )
            )

        anomaly_result = client.invoke_tool_with_context(
            db=db,
            context=context,
            tool_name="sales.detect_sales_anomaly",
            payload={"product_id": product_id, "days": 7, "threshold_ratio": 0.5},
        )
        anomaly = anomaly_result.data or {}
        if anomaly.get("is_anomaly"):
            recommendations.append(
                create_agent_recommendation(
                    db,
                    job_name=JOB_NAME,
                    domain="sales",
                    recommendation_type="DEMAND_ANOMALY",
                    severity="high",
                    title=f"Demand anomaly: {product.get('sku', product_id)}",
                    summary=anomaly.get("summary", "Sales behavior deviated materially from the prior trend."),
                    payload=anomaly,
                    source_target="sales.detect_sales_anomaly",
                )
            )

    return recommendations
