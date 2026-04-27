from __future__ import annotations

from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPToolResult, MCPToolSpec, PlanLevel
from app.services import logistics_service


def _get_active_shipments(db, context: MCPRequestContext, payload: dict) -> list:
    shipments = logistics_service.get_active_shipments(db)
    return [
        {
            "id": shipment.id,
            "shipment_number": shipment.shipment_number,
            "status": shipment.status,
            "related_type": shipment.related_type,
            "related_id": shipment.related_id,
            "carrier_name": shipment.carrier_name,
        }
        for shipment in shipments
    ]


def _get_delay_impact(db, context: MCPRequestContext, payload: dict) -> dict:
    shipment_id = int(payload["shipment_id"])
    return logistics_service.calculate_delay_impact(db, shipment_id)


def _logistics_control_tower_placeholder(db, context: MCPRequestContext, payload: dict) -> MCPToolResult:
    return MCPToolResult(
        ok=True,
        data={
            "phase": "foundation",
            "enabled": False,
            "rule": (
                "Future BOOST logistics MCP tools must call logistics_service entrypoints "
                "for updates and external carrier orchestration, never direct model writes."
            ),
        },
    )


def register_logistics_mcp() -> MCPModuleSpec:
    return MCPModuleSpec(
        name="logistics",
        description="Logistics and control-tower MCP tools.",
        min_plan=PlanLevel.BOOST,
        tools=[
            MCPToolSpec(
                name="logistics.get_active_shipments",
                domain="logistics",
                description="Read active shipments through the logistics service.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_get_active_shipments,
            ),
            MCPToolSpec(
                name="logistics.get_delay_impact",
                domain="logistics",
                description="Read shipment delay impact through the logistics service.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_get_delay_impact,
            ),
            MCPToolSpec(
                name="logistics.plan_control_tower_actions",
                domain="logistics",
                description="Placeholder for future BOOST logistics action tools.",
                min_plan=PlanLevel.BOOST,
                read_only=True,
                handler=_logistics_control_tower_placeholder,
            ),
        ],
    )
