from __future__ import annotations

from app.integrations.base import ProviderDefinition, env_flag


OSM_WAREHOUSE_PROVIDER = ProviderDefinition(
    key="osm_warehouse_locator",
    name="OSM Warehouse Locator",
    category="WAREHOUSE",
    provider_type="FREE_PUBLIC",
    required_plan="FREE",
    is_live_capable=True,
    data_truth="Public directory/map data only. Availability, capacity, and partner status are not verified.",
    notes="Use with Overpass for small bounded queries only.",
)


def is_enabled() -> bool:
    return env_flag("OSM_OVERPASS_ENABLED", True)
