from __future__ import annotations

from app.integrations.base import ProviderDefinition, env_flag, env_text


TIKTOK_SHOP_PROVIDER = ProviderDefinition(
    key="tiktok_shop",
    name="TikTok Shop",
    category="MARKETPLACE",
    provider_type="USER_AUTHORIZED",
    required_plan="PREMIUM",
    is_live_capable=True,
    data_truth="User-authorized store sales only. Not nationwide market intelligence.",
    notes="Connection flow stub only until real OAuth integration is configured.",
)


def is_enabled() -> bool:
    return env_flag("TIKTOK_SHOP_ENABLED", False)


def is_configured() -> bool:
    return bool(env_text("TIKTOK_APP_KEY") and env_text("TIKTOK_APP_SECRET"))
