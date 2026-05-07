from __future__ import annotations

from app.integrations.base import ProviderDefinition, ProviderLimits, env_flag


OPEN_METEO_PROVIDER = ProviderDefinition(
    key="open_meteo",
    name="Open-Meteo",
    category="WEATHER",
    provider_type="FREE_PUBLIC",
    required_plan="FREE",
    is_live_capable=True,
    limits=ProviderLimits(requests_per_minute=600, requests_per_hour=5000, requests_per_day=10000),
    data_truth="Weather risk only. Not confirmed operational congestion or vessel tracking.",
    notes="Use for weather risk preview. Production commercial use may require paid configuration review.",
)


def is_enabled() -> bool:
    return env_flag("OPEN_METEO_ENABLED", True)
