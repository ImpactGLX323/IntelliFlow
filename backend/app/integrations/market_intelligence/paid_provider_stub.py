from __future__ import annotations

from app.integrations.base import ProviderDefinition, env_flag


PAID_MARKET_INTELLIGENCE_PROVIDER = ProviderDefinition(
    key="paid_market_intelligence",
    name="Paid Market Intelligence Provider",
    category="MARKET_INTELLIGENCE",
    provider_type="PAID",
    required_plan="BOOST",
    is_live_capable=True,
    data_truth="Potential market estimate or verified market data depending provider contract.",
    notes="Commercial provider stub only. No scraping is implemented.",
)


def is_enabled() -> bool:
    return env_flag("PAID_MARKET_INTELLIGENCE_ENABLED", False)
