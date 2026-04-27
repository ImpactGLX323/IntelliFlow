from __future__ import annotations

from sqlalchemy.orm import Session

from app.jobs.scheduler import create_agent_recommendation
from app.mcp.client import InternalMCPClient
from app.mcp.schemas import MCPRequestContext
from app.models import AgentRecommendation, Product


JOB_NAME = "daily_inventory_scan"


def run_daily_inventory_scan(
    db: Session,
    client: InternalMCPClient,
    context: MCPRequestContext,
) -> list[AgentRecommendation]:
    recommendations: list[AgentRecommendation] = []

    low_stock_result = client.read_resource_with_context(
        db=db,
        context=context,
        uri="inventory://low-stock",
    )
    low_stock_items = low_stock_result.data or []

    for item in low_stock_items:
        recommendations.append(
            create_agent_recommendation(
                db,
                job_name=JOB_NAME,
                domain="inventory",
                recommendation_type="LOW_STOCK",
                severity="high",
                title=f"Low stock: {item.get('sku', item.get('product_id'))}",
                summary=(
                    f"Available stock is {item.get('available')} against minimum "
                    f"{item.get('minimum_quantity', item.get('min_stock_threshold'))}."
                ),
                payload=item,
                source_target="inventory://low-stock",
            )
        )

    for product in db.query(Product).all():
        days_of_cover_result = client.invoke_tool_with_context(
            db=db,
            context=context,
            tool_name="inventory.calculate_days_of_cover",
            payload={"product_id": product.id, "lookback_days": 30},
        )
        days_of_cover = days_of_cover_result.data or {}
        cover_value = days_of_cover.get("days_of_cover")
        if cover_value is None:
            continue

        if cover_value <= 7:
            recommendations.append(
                create_agent_recommendation(
                    db,
                    job_name=JOB_NAME,
                    domain="inventory",
                    recommendation_type="STOCKOUT_RISK",
                    severity="critical",
                    title=f"Stockout risk: {product.sku}",
                    summary=f"Estimated days of cover is {cover_value}, which indicates immediate replenishment risk.",
                    payload=days_of_cover,
                    source_target="inventory.calculate_days_of_cover",
                )
            )
        elif cover_value >= 90:
            recommendations.append(
                create_agent_recommendation(
                    db,
                    job_name=JOB_NAME,
                    domain="inventory",
                    recommendation_type="OVERSTOCK",
                    severity="medium",
                    title=f"Overstock risk: {product.sku}",
                    summary=f"Estimated days of cover is {cover_value}, which suggests excess inventory is tied up.",
                    payload=days_of_cover,
                    source_target="inventory.calculate_days_of_cover",
                )
            )

    return recommendations
