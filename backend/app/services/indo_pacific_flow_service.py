from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any

from app.integrations.maritime_flow_provider import (
    DatalasticMaritimeFlowProvider,
    GoCometMaritimeFlowProvider,
    MarineTrafficMaritimeFlowProvider,
    MaritimeFlowProvider,
    MaritimeFlowProviderError,
    PortcastMaritimeFlowProvider,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _isoformat(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def calculate_pressure_status(pressure_score: float) -> str:
    score = max(0.0, min(1.0, pressure_score))
    if score <= 0.30:
        return "LOW"
    if score <= 0.60:
        return "MEDIUM"
    if score <= 0.80:
        return "HIGH"
    return "CRITICAL"


def _calculate_pressure_score(
    vessels_waiting: int,
    average_delay_hours: float,
    berth_utilization_pct: float,
    customs_alerts: int,
) -> float:
    normalized_vessels_waiting = min(max(vessels_waiting / 30.0, 0.0), 1.0)
    normalized_average_delay = min(max(average_delay_hours / 36.0, 0.0), 1.0)
    normalized_customs_alerts = min(max(customs_alerts / 8.0, 0.0), 1.0)
    normalized_berth_utilization = min(max(berth_utilization_pct / 100.0, 0.0), 1.0)
    score = (
        0.35 * normalized_vessels_waiting
        + 0.30 * normalized_average_delay
        + 0.25 * normalized_berth_utilization
        + 0.10 * normalized_customs_alerts
    )
    return max(0.0, min(1.0, round(score, 3)))


PREVIEW_PORTS: list[dict[str, Any]] = [
    {"port_code": "MYPKG", "port_name": "Port Klang", "state": "Selangor", "coordinates": [101.4, 3.0], "average_delay_hours": 17.0, "vessels_waiting": 18, "vessels_berthed": 34, "berth_utilization_pct": 79.0, "customs_alerts": 2},
    {"port_code": "MYTPP", "port_name": "Tanjung Pelepas", "state": "Johor", "coordinates": [103.55, 1.37], "average_delay_hours": 14.0, "vessels_waiting": 11, "vessels_berthed": 29, "berth_utilization_pct": 74.0, "customs_alerts": 1},
    {"port_code": "MYPGU", "port_name": "Pasir Gudang", "state": "Johor", "coordinates": [103.9, 1.45], "average_delay_hours": 9.0, "vessels_waiting": 6, "vessels_berthed": 17, "berth_utilization_pct": 58.0, "customs_alerts": 1},
    {"port_code": "MYPEN", "port_name": "Penang / Perai", "state": "Penang", "coordinates": [100.36, 5.39], "average_delay_hours": 12.0, "vessels_waiting": 7, "vessels_berthed": 14, "berth_utilization_pct": 61.0, "customs_alerts": 1},
    {"port_code": "MYKUA", "port_name": "Kuantan", "state": "Pahang", "coordinates": [103.43, 3.97], "average_delay_hours": 21.0, "vessels_waiting": 14, "vessels_berthed": 18, "berth_utilization_pct": 72.0, "customs_alerts": 3},
    {"port_code": "MYBTU", "port_name": "Bintulu", "state": "Sarawak", "coordinates": [113.03, 3.27], "average_delay_hours": 7.0, "vessels_waiting": 4, "vessels_berthed": 13, "berth_utilization_pct": 49.0, "customs_alerts": 0},
    {"port_code": "MYKCH", "port_name": "Kuching", "state": "Sarawak", "coordinates": [110.35, 1.56], "average_delay_hours": 6.0, "vessels_waiting": 3, "vessels_berthed": 9, "berth_utilization_pct": 43.0, "customs_alerts": 0},
    {"port_code": "MYBKI", "port_name": "Kota Kinabalu", "state": "Sabah", "coordinates": [116.07, 5.98], "average_delay_hours": 10.0, "vessels_waiting": 8, "vessels_berthed": 12, "berth_utilization_pct": 57.0, "customs_alerts": 1},
    {"port_code": "MYSDK", "port_name": "Sandakan", "state": "Sabah", "coordinates": [118.12, 5.84], "average_delay_hours": 5.0, "vessels_waiting": 2, "vessels_berthed": 8, "berth_utilization_pct": 38.0, "customs_alerts": 0},
]

PREVIEW_LANES: list[dict[str, Any]] = [
    {
        "route_name": "South China Sea → Port Klang → Malacca Strait",
        "coordinates": [[114.0, 12.0], [103.8, 1.4], [101.4, 3.0], [98.0, 5.5]],
        "origin_region": "South China Sea",
        "destination_region": "Malacca Strait",
        "affected_malaysia_ports": ["MYPKG", "MYTPP"],
        "flow_intensity": 0.88,
        "estimated_vessel_count": 44,
        "average_delay_hours": 18.0,
        "risk_level": "HIGH",
        "direction": "EAST_TO_WEST",
    },
    {
        "route_name": "Singapore Strait → Tanjung Pelepas → Port Klang",
        "coordinates": [[104.1, 1.25], [103.55, 1.37], [101.4, 3.0]],
        "origin_region": "Singapore Strait",
        "destination_region": "Port Klang",
        "affected_malaysia_ports": ["MYTPP", "MYPKG"],
        "flow_intensity": 0.82,
        "estimated_vessel_count": 37,
        "average_delay_hours": 12.0,
        "risk_level": "MEDIUM",
        "direction": "EAST_TO_WEST",
    },
    {
        "route_name": "South China Sea → Kuantan → Port Klang",
        "coordinates": [[112.0, 8.0], [103.43, 3.97], [101.4, 3.0]],
        "origin_region": "South China Sea",
        "destination_region": "Port Klang",
        "affected_malaysia_ports": ["MYKUA", "MYPKG"],
        "flow_intensity": 0.67,
        "estimated_vessel_count": 24,
        "average_delay_hours": 16.0,
        "risk_level": "MEDIUM",
        "direction": "EAST_TO_WEST",
    },
    {
        "route_name": "Bay of Bengal → Penang → Port Klang",
        "coordinates": [[92.0, 10.0], [100.36, 5.39], [101.4, 3.0]],
        "origin_region": "Bay of Bengal",
        "destination_region": "Port Klang",
        "affected_malaysia_ports": ["MYPEN", "MYPKG"],
        "flow_intensity": 0.63,
        "estimated_vessel_count": 21,
        "average_delay_hours": 10.0,
        "risk_level": "MEDIUM",
        "direction": "WEST_TO_EAST",
    },
    {
        "route_name": "South China Sea → Bintulu → Kota Kinabalu",
        "coordinates": [[115.0, 7.0], [113.03, 3.27], [116.07, 5.98]],
        "origin_region": "South China Sea",
        "destination_region": "Sabah Corridor",
        "affected_malaysia_ports": ["MYBTU", "MYBKI"],
        "flow_intensity": 0.49,
        "estimated_vessel_count": 15,
        "average_delay_hours": 8.0,
        "risk_level": "LOW",
        "direction": "SOUTH_TO_NORTH",
    },
    {
        "route_name": "Java Sea → Singapore Strait → Tanjung Pelepas",
        "coordinates": [[108.0, -5.5], [104.1, 1.25], [103.55, 1.37]],
        "origin_region": "Java Sea",
        "destination_region": "Singapore Strait",
        "affected_malaysia_ports": ["MYTPP"],
        "flow_intensity": 0.58,
        "estimated_vessel_count": 19,
        "average_delay_hours": 11.0,
        "risk_level": "MEDIUM",
        "direction": "SOUTH_TO_NORTH",
    },
]

PREVIEW_CLUSTERS: list[dict[str, Any]] = [
    {"cluster_name": "Malacca Strait Cluster", "coordinates": [100.8, 3.7], "estimated_vessels": 32, "dominant_direction": "EAST_TO_WEST", "flow_intensity": 0.86},
    {"cluster_name": "South China Sea Cluster", "coordinates": [112.2, 7.8], "estimated_vessels": 24, "dominant_direction": "WEST_TO_EAST", "flow_intensity": 0.69},
    {"cluster_name": "Sabah Coastal Cluster", "coordinates": [116.7, 6.2], "estimated_vessels": 11, "dominant_direction": "SOUTH_TO_NORTH", "flow_intensity": 0.44},
]


@dataclass
class CacheEntry:
    expires_at: datetime
    payload: dict[str, Any]


_CACHE: dict[str, CacheEntry] = {}
_CACHE_LOCK = Lock()
_CACHE_TTL = timedelta(minutes=10)


def _cache_key(
    include_ports: bool,
    include_routes: bool,
    include_vessel_clusters: bool,
    provider: str,
) -> str:
    return f"{provider}:{int(include_ports)}:{int(include_routes)}:{int(include_vessel_clusters)}"


def _get_cached_payload(key: str) -> dict[str, Any] | None:
    with _CACHE_LOCK:
        entry = _CACHE.get(key)
        if not entry:
            return None
        if entry.expires_at <= _utc_now():
            _CACHE.pop(key, None)
            return None
        return entry.payload


def _set_cached_payload(key: str, payload: dict[str, Any]) -> None:
    with _CACHE_LOCK:
        _CACHE[key] = CacheEntry(expires_at=_utc_now() + _CACHE_TTL, payload=payload)


def _build_port_feature(port: dict[str, Any], updated_at: str) -> dict[str, Any]:
    missing_data: list[str] = []
    pressure_score = port.get("pressure_score")
    if pressure_score is None:
        pressure_score = _calculate_pressure_score(
            vessels_waiting=port["vessels_waiting"],
            average_delay_hours=port["average_delay_hours"],
            berth_utilization_pct=port["berth_utilization_pct"],
            customs_alerts=port["customs_alerts"],
        )
    if port.get("customs_alerts") is None:
        missing_data.append("customs_alerts")
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": port["coordinates"],
        },
        "properties": {
            "kind": "malaysia_port",
            "port_code": port["port_code"],
            "port_name": port["port_name"],
            "state": port["state"],
            "pressure_status": calculate_pressure_status(pressure_score),
            "pressure_score": pressure_score,
            "average_delay_hours": port["average_delay_hours"],
            "vessels_waiting": port["vessels_waiting"],
            "vessels_berthed": port["vessels_berthed"],
            "berth_utilization_pct": port["berth_utilization_pct"],
            "customs_alerts": port["customs_alerts"],
            "last_updated": updated_at,
            "missing_data": missing_data,
        },
    }


def _build_lane_feature(route: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": route["coordinates"],
        },
        "properties": {
            "kind": "shipping_lane",
            "route_name": route["route_name"],
            "origin_region": route["origin_region"],
            "destination_region": route["destination_region"],
            "affected_malaysia_ports": route["affected_malaysia_ports"],
            "flow_intensity": route["flow_intensity"],
            "estimated_vessel_count": route["estimated_vessel_count"],
            "average_delay_hours": route["average_delay_hours"],
            "risk_level": route["risk_level"],
            "direction": route["direction"],
        },
    }


def _build_cluster_feature(cluster: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": cluster["coordinates"],
        },
        "properties": {
            "kind": "vessel_cluster",
            "cluster_name": cluster["cluster_name"],
            "estimated_vessels": cluster["estimated_vessels"],
            "dominant_direction": cluster["dominant_direction"],
            "flow_intensity": cluster["flow_intensity"],
            "source_note": "Aggregated vessel cluster, not individual vessel tracking",
        },
    }


def build_preview_response(
    include_ports: bool,
    include_routes: bool,
    include_vessel_clusters: bool,
    source: str = "preview",
    provider_error: str | None = None,
) -> dict[str, Any]:
    updated_at = _isoformat(_utc_now())
    features: list[dict[str, Any]] = []
    port_features: list[dict[str, Any]] = []

    if include_ports:
        port_features = [_build_port_feature(port, updated_at) for port in PREVIEW_PORTS]
        features.extend(port_features)
    if include_routes:
        features.extend(_build_lane_feature(route) for route in PREVIEW_LANES)
    if include_vessel_clusters:
        features.extend(_build_cluster_feature(cluster) for cluster in PREVIEW_CLUSTERS)

    pressure_scores = [feature["properties"]["pressure_score"] for feature in port_features]
    statuses = [feature["properties"]["pressure_status"] for feature in port_features]
    summary = {
        "routes_monitored": len(PREVIEW_LANES) if include_routes else 0,
        "malaysian_ports_monitored": len(port_features),
        "average_malaysia_port_pressure": round(sum(pressure_scores) / len(pressure_scores), 3) if pressure_scores else 0.0,
        "high_pressure_ports": sum(1 for status in statuses if status in {"HIGH", "CRITICAL"}),
        "medium_pressure_ports": sum(1 for status in statuses if status == "MEDIUM"),
        "low_pressure_ports": sum(1 for status in statuses if status == "LOW"),
        "estimated_regional_flow_intensity": round(
            sum(route["flow_intensity"] for route in PREVIEW_LANES) / len(PREVIEW_LANES),
            3,
        ) if include_routes else 0.0,
    }

    payload = {
        "is_live": False,
        "source": source,
        "last_updated": updated_at,
        "region": "Indo-Pacific",
        "summary": summary,
        "geojson": {
            "type": "FeatureCollection",
            "features": features,
        },
    }
    if provider_error:
        payload["provider_error"] = provider_error
    return payload


def _has_value(name: str) -> bool:
    value = os.getenv(name)
    return bool(value and value.strip())


def _select_provider(provider: str) -> MaritimeFlowProvider | None:
    explicit_provider = provider.strip().lower()
    if explicit_provider == "preview":
        return None
    if explicit_provider == "portcast":
        return PortcastMaritimeFlowProvider()
    if explicit_provider == "gocomet":
        return GoCometMaritimeFlowProvider()
    if explicit_provider == "marinetraffic":
        return MarineTrafficMaritimeFlowProvider()
    if explicit_provider == "datalastic":
        return DatalasticMaritimeFlowProvider()

    preferred_provider = os.getenv("MARITIME_FLOW_PROVIDER", "auto").strip().lower()
    if preferred_provider in {"portcast", "gocomet", "marinetraffic", "datalastic", "preview"} and explicit_provider == "auto":
        return _select_provider(preferred_provider)

    if _has_value("PORTCAST_API_KEY"):
        return PortcastMaritimeFlowProvider()
    if _has_value("GOCOMET_API_KEY"):
        return GoCometMaritimeFlowProvider()
    if _has_value("MARINETRAFFIC_API_KEY"):
        return MarineTrafficMaritimeFlowProvider()
    if _has_value("DATALASTIC_API_KEY"):
        return DatalasticMaritimeFlowProvider()
    return None


async def get_indo_pacific_ship_flow(
    include_ports: bool = True,
    include_routes: bool = True,
    include_vessel_clusters: bool = False,
    provider: str = "auto",
) -> dict[str, Any]:
    provider_name = provider.strip().lower()
    cache_key = _cache_key(include_ports, include_routes, include_vessel_clusters, provider_name)
    cached_payload = _get_cached_payload(cache_key)
    if cached_payload is not None:
        return cached_payload

    selected_provider = _select_provider(provider_name)
    if selected_provider is None:
        payload = build_preview_response(include_ports, include_routes, include_vessel_clusters, source="preview")
        _set_cached_payload(cache_key, payload)
        return payload

    try:
        payload = await selected_provider.get_indo_pacific_ship_flow(
            include_ports=include_ports,
            include_routes=include_routes,
            include_vessel_clusters=include_vessel_clusters,
        )
    except MaritimeFlowProviderError as exc:
        payload = build_preview_response(
            include_ports,
            include_routes,
            include_vessel_clusters,
            source="fallback_preview",
            provider_error="Provider unavailable",
        )
    except Exception:
        payload = build_preview_response(
            include_ports,
            include_routes,
            include_vessel_clusters,
            source="fallback_preview",
            provider_error="Provider unavailable",
        )

    _set_cached_payload(cache_key, payload)
    return payload


def get_indo_pacific_ship_flow_sync(
    include_ports: bool = True,
    include_routes: bool = True,
    include_vessel_clusters: bool = False,
    provider: str = "auto",
) -> dict[str, Any]:
    return asyncio.run(
        get_indo_pacific_ship_flow(
            include_ports=include_ports,
            include_routes=include_routes,
            include_vessel_clusters=include_vessel_clusters,
            provider=provider,
        )
    )
