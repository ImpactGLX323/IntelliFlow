from __future__ import annotations

from app.integrations.base import ProviderDefinition, ProviderLimits, env_flag


OPEN_METEO_MARINE_PROVIDER = ProviderDefinition(
    key="open_meteo_marine",
    name="Open-Meteo Marine",
    category="MARINE",
    provider_type="FREE_PUBLIC",
    required_plan="FREE",
    is_live_capable=True,
    limits=ProviderLimits(requests_per_minute=600, requests_per_hour=5000, requests_per_day=10000),
    data_truth="Marine and sea-state risk only. Not live AIS or confirmed port congestion.",
    notes="Use for weather and marine risk preview around ports and routes.",
)


def is_enabled() -> bool:
    return env_flag("OPEN_METEO_MARINE_ENABLED", True)
