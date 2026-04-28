from __future__ import annotations

from app.mcp.schemas import (
    MCPModuleSpec,
    MCPRequestContext,
    MCPResourceSpec,
    MCPToolSpec,
    PlanLevel,
)
from app.services import logistics_service


def _resource_shipment(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.serialize_shipment_status(db, int(payload["shipment_id"]))


def _resource_international_active(db, context: MCPRequestContext, payload: dict) -> list[dict]:
    return logistics_service.get_international_active_shipments(db)


def _resource_route(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.get_route_status(db, int(payload["route_id"]))


def _resource_route_delays(db, context: MCPRequestContext, payload: dict) -> list[dict]:
    return logistics_service.get_route_delays(db)


def _tool_get_active_shipments(db, context: MCPRequestContext, payload: dict) -> list[dict]:
    return [logistics_service.serialize_shipment_status(db, shipment.id) for shipment in logistics_service.get_active_shipments(db)]


def _tool_get_route_status(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.get_route_status(db, int(payload["route_id"]))


def _tool_get_eta(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.get_eta(db, int(payload["shipment_id"]))


def _tool_detect_late_shipments(db, context: MCPRequestContext, payload: dict) -> list[dict]:
    return logistics_service.detect_late_shipments(db, int(payload.get("threshold_days", 1)))


def _tool_calculate_delay_impact(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.calculate_delay_impact(db, int(payload["shipment_id"]))


def _tool_find_affected_orders(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.find_affected_orders(db, int(payload["shipment_id"]))


def _tool_recommend_reroute(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.recommend_reroute(db, int(payload["shipment_id"]))


def _tool_create_logistics_exception(db, context: MCPRequestContext, payload: dict) -> dict:
    return logistics_service.create_logistics_exception(
        db,
        shipment_id=int(payload["shipment_id"]),
        issue_summary=payload.get("issue_summary"),
    )


def register_logistics_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="logistics",
        description="BOOST logistics MCP resources and control-tower tools.",
        min_plan=PlanLevel.BOOST,
        resources=[
            MCPResourceSpec(
                uri_template="shipment://international/active",
                domain="logistics",
                description="Read active international shipments with delay and business impact context.",
                min_plan=PlanLevel.BOOST,
                handler=_resource_international_active,
            ),
            MCPResourceSpec(
                uri_template="shipment://{shipment_id}",
                domain="logistics",
                description="Read a shipment with business impact context.",
                min_plan=PlanLevel.BOOST,
                handler=_resource_shipment,
            ),
            MCPResourceSpec(
                uri_template="route://delays",
                domain="logistics",
                description="Read route delay status summary.",
                min_plan=PlanLevel.BOOST,
                handler=_resource_route_delays,
            ),
            MCPResourceSpec(
                uri_template="route://{route_id}",
                domain="logistics",
                description="Read route status based on matching shipment activity and delays.",
                min_plan=PlanLevel.BOOST,
                handler=_resource_route,
            ),
        ],
        tools=[
            MCPToolSpec(
                name="logistics.get_active_shipments",
                domain="logistics",
                description="Read active shipments with ETA, affected SKUs, affected orders, revenue at risk, and mitigation guidance.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_get_active_shipments,
            ),
            MCPToolSpec(
                name="logistics.get_route_status",
                domain="logistics",
                description="Read route health and shipment disruption status.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_get_route_status,
            ),
            MCPToolSpec(
                name="logistics.get_eta",
                domain="logistics",
                description="Read ETA and delay status for a shipment.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_get_eta,
            ),
            MCPToolSpec(
                name="logistics.detect_late_shipments",
                domain="logistics",
                description="Detect late shipments above a threshold and summarize business impact.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_detect_late_shipments,
            ),
            MCPToolSpec(
                name="logistics.calculate_delay_impact",
                domain="logistics",
                description="Calculate shipment delay impact including affected orders, revenue at risk, inventory cover, and mitigation.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_calculate_delay_impact,
            ),
            MCPToolSpec(
                name="logistics.find_affected_orders",
                domain="logistics",
                description="Find the purchase orders, sales orders, and SKUs affected by a shipment.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_find_affected_orders,
            ),
            MCPToolSpec(
                name="logistics.recommend_reroute",
                domain="logistics",
                description="Recommend an alternate route and mitigation plan without external carrier calls.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_tool_recommend_reroute,
            ),
            MCPToolSpec(
                name="logistics.create_logistics_exception",
                domain="logistics",
                description="Create a safe logistics exception recommendation record via the service layer.",
                min_plan=PlanLevel.BOOST,
                read_only=False,
                handler=_tool_create_logistics_exception,
            ),
        ],
    )
