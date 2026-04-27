from __future__ import annotations

from sqlalchemy.orm import Session

from app.jobs.scheduler import create_agent_recommendation
from app.mcp.client import InternalMCPClient
from app.mcp.schemas import MCPRequestContext
from app.models import AgentRecommendation


JOB_NAME = "logistics_scan"


def run_logistics_scan(
    db: Session,
    client: InternalMCPClient,
    context: MCPRequestContext,
) -> list[AgentRecommendation]:
    recommendations: list[AgentRecommendation] = []

    late_shipments_result = client.invoke_tool_with_context(
        db=db,
        context=context,
        tool_name="logistics.detect_late_shipments",
        payload={"threshold_days": 1},
    )
    late_shipments = late_shipments_result.data or []
    for shipment in late_shipments:
        recommendations.append(
            create_agent_recommendation(
                db,
                job_name=JOB_NAME,
                domain="logistics",
                recommendation_type="DELAYED_SHIPMENT",
                severity="high",
                title=f"Delayed shipment: {shipment.get('shipment_number', shipment.get('shipment_id'))}",
                summary=(
                    f"Shipment is delayed by {shipment.get('delay_days')} days. "
                    f"Affected orders: {shipment.get('affected_sales_orders', []) or shipment.get('affected_orders', [])}."
                ),
                payload=shipment,
                source_target="logistics.detect_late_shipments",
            )
        )

        shipment_id = shipment.get("shipment_id") or shipment.get("id")
        if shipment_id is None:
            continue
        impact_result = client.invoke_tool_with_context(
            db=db,
            context=context,
            tool_name="logistics.calculate_delay_impact",
            payload={"shipment_id": shipment_id},
        )
        impact = impact_result.data or {}
        recommendations.append(
            create_agent_recommendation(
                db,
                job_name=JOB_NAME,
                domain="logistics",
                recommendation_type="DELAY_IMPACT",
                severity="critical" if impact.get("revenue_at_risk") else "high",
                title=f"Delay impact: {shipment.get('shipment_number', shipment_id)}",
                summary=impact.get("recommended_mitigation", "Review affected orders and mitigation options."),
                payload=impact,
                source_target="logistics.calculate_delay_impact",
            )
        )

    international_result = client.read_resource_with_context(
        db=db,
        context=context,
        uri="shipment://international/active",
    )
    for shipment in international_result.data or []:
        recommendations.append(
            create_agent_recommendation(
                db,
                job_name=JOB_NAME,
                domain="logistics",
                recommendation_type="ACTIVE_INTERNATIONAL_SHIPMENT",
                severity="low",
                title=f"International shipment in transit: {shipment.get('shipment_number', shipment.get('shipment_id'))}",
                summary=f"Current status is {shipment.get('status')} with ETA {shipment.get('estimated_arrival')}.",
                payload=shipment,
                source_target="shipment://international/active",
            )
        )

    route_delay_result = client.read_resource_with_context(
        db=db,
        context=context,
        uri="route://delays",
    )
    for route in route_delay_result.data or []:
        recommendations.append(
            create_agent_recommendation(
                db,
                job_name=JOB_NAME,
                domain="logistics",
                recommendation_type="ROUTE_DELAY",
                severity="medium",
                title=f"Route delay: {route.get('route_name', route.get('route_id'))}",
                summary=route.get("summary", "Route delay trend detected."),
                payload=route,
                source_target="route://delays",
            )
        )

    return recommendations
