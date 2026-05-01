from __future__ import annotations

from typing import Literal, Union

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.indo_pacific_flow_service import get_indo_pacific_ship_flow

router = APIRouter()


class LogisticsFlowSummary(BaseModel):
    routes_monitored: int
    malaysian_ports_monitored: int
    average_malaysia_port_pressure: float
    high_pressure_ports: int
    medium_pressure_ports: int
    low_pressure_ports: int
    estimated_regional_flow_intensity: float


class PointGeometry(BaseModel):
    type: Literal["Point"]
    coordinates: list[float]


class LineGeometry(BaseModel):
    type: Literal["LineString"]
    coordinates: list[list[float]]


class MalaysiaPortFeatureProperties(BaseModel):
    kind: Literal["malaysia_port"]
    port_code: str
    port_name: str
    state: str
    pressure_status: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]
    pressure_score: float
    average_delay_hours: float
    vessels_waiting: int
    vessels_berthed: int
    berth_utilization_pct: float
    customs_alerts: int
    last_updated: str
    missing_data: list[str] = Field(default_factory=list)


class ShippingLaneFeatureProperties(BaseModel):
    kind: Literal["shipping_lane"]
    route_name: str
    origin_region: str
    destination_region: str
    affected_malaysia_ports: list[str]
    flow_intensity: float
    estimated_vessel_count: int
    average_delay_hours: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]
    direction: Literal["EAST_TO_WEST", "WEST_TO_EAST", "NORTH_TO_SOUTH", "SOUTH_TO_NORTH"]


class VesselClusterFeatureProperties(BaseModel):
    kind: Literal["vessel_cluster"]
    cluster_name: str
    estimated_vessels: int
    dominant_direction: Literal["EAST_TO_WEST", "WEST_TO_EAST", "NORTH_TO_SOUTH", "SOUTH_TO_NORTH"]
    flow_intensity: float
    source_note: str


class MalaysiaPortFeature(BaseModel):
    type: Literal["Feature"]
    geometry: PointGeometry
    properties: MalaysiaPortFeatureProperties


class ShippingLaneFeature(BaseModel):
    type: Literal["Feature"]
    geometry: LineGeometry
    properties: ShippingLaneFeatureProperties


class VesselClusterFeature(BaseModel):
    type: Literal["Feature"]
    geometry: PointGeometry
    properties: VesselClusterFeatureProperties


class GeoJsonFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[Union[MalaysiaPortFeature, ShippingLaneFeature, VesselClusterFeature]]


class IndoPacificFlowResponse(BaseModel):
    is_live: bool
    source: Literal["preview", "portcast", "gocomet", "marinetraffic", "datalastic", "fallback_preview"]
    last_updated: str
    region: Literal["Indo-Pacific"]
    summary: LogisticsFlowSummary
    geojson: GeoJsonFeatureCollection
    provider_error: str | None = None


@router.get(
    "/indo-pacific-ship-flow",
    response_model=IndoPacificFlowResponse,
    summary="Get public Indo-Pacific ship-flow corridors and Malaysian port pressure",
)
async def indo_pacific_ship_flow(
    include_ports: bool = Query(default=True),
    include_routes: bool = Query(default=True),
    include_vessel_clusters: bool = Query(default=False),
    provider: str = Query(default="auto"),
):
    return await get_indo_pacific_ship_flow(
        include_ports=include_ports,
        include_routes=include_routes,
        include_vessel_clusters=include_vessel_clusters,
        provider=provider,
    )
