from __future__ import annotations

from app.integrations.base import ProviderDefinition, env_flag, env_text


GOOGLE_TRENDS_ALPHA_PROVIDER = ProviderDefinition(
    key="google_trends_alpha",
    name="Google Trends Alpha",
    category="MARKET_INTELLIGENCE",
    provider_type="LIMITED_PUBLIC",
    required_plan="BOOST",
    is_live_capable=True,
    data_truth="Search-interest signal only. Not confirmed sales volume.",
    notes="Alpha access required. Use only as demand proxy, not market-wide sales truth.",
)


def is_enabled() -> bool:
    return env_flag("GOOGLE_TRENDS_ALPHA_ENABLED", False)


def is_configured() -> bool:
    return bool(env_text("GOOGLE_TRENDS_API_KEY"))
