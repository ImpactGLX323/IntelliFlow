from __future__ import annotations

from app.integrations.base import ProviderDefinition, ProviderLimits, env_flag


DATA_GOV_MY_PROVIDER = ProviderDefinition(
    key="data_gov_my",
    name="data.gov.my",
    category="PUBLIC_DATA",
    provider_type="FREE_PUBLIC",
    required_plan="FREE",
    is_live_capable=True,
    limits=ProviderLimits(requests_per_minute=4),
    data_truth="Official Malaysian open data. Not private operational data.",
    notes="Use for official public datasets only. Cached aggressively.",
)


def is_enabled() -> bool:
    return env_flag("DATA_GOV_MY_ENABLED", True)
