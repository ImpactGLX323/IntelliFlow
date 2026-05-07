from __future__ import annotations

from app.integrations.base import ProviderDefinition, env_flag, env_text


SHOPEE_PROVIDER = ProviderDefinition(
    key="shopee",
    name="Shopee Open Platform",
    category="MARKETPLACE",
    provider_type="USER_AUTHORIZED",
    required_plan="PREMIUM",
    is_live_capable=True,
    data_truth="User-authorized store sales only. Not nationwide market intelligence.",
    notes="Connection flow stub only until real OAuth integration is configured.",
)


def is_enabled() -> bool:
    return env_flag("SHOPEE_OPEN_PLATFORM_ENABLED", False)


def is_configured() -> bool:
    return bool(env_text("SHOPEE_APP_ID") and env_text("SHOPEE_APP_SECRET"))
