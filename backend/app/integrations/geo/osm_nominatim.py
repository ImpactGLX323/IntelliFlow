from __future__ import annotations

from app.integrations.base import ProviderDefinition, ProviderLimits, env_flag


OSM_NOMINATIM_PROVIDER = ProviderDefinition(
    key="osm_nominatim",
    name="OpenStreetMap Nominatim",
    category="GEO",
    provider_type="FREE_PUBLIC",
    required_plan="FREE",
    is_live_capable=True,
    limits=ProviderLimits(requests_per_minute=60),
    data_truth="Public geocoding and place lookup only. Not operational availability data.",
    notes="Use with identifying User-Agent, cache all results, and avoid bulk geocoding.",
)


def is_enabled() -> bool:
    return env_flag("OSM_NOMINATIM_ENABLED", True)
