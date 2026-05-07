from __future__ import annotations

from app.integrations.base import ProviderDefinition, ProviderLimits, env_flag


OSM_OVERPASS_PROVIDER = ProviderDefinition(
    key="osm_overpass",
    name="OpenStreetMap Overpass",
    category="GEO",
    provider_type="FREE_PUBLIC",
    required_plan="FREE",
    is_live_capable=True,
    limits=ProviderLimits(requests_per_minute=10),
    data_truth="Public map directory data only. Availability, commercial relationships, and capacity are not verified.",
    notes="Use only for small bounded queries and cache results.",
)


def is_enabled() -> bool:
    return env_flag("OSM_OVERPASS_ENABLED", True)
