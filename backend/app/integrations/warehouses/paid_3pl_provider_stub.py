from __future__ import annotations

from app.integrations.base import ProviderDefinition, env_flag


PAID_3PL_PROVIDER = ProviderDefinition(
    key="paid_3pl_provider",
    name="Paid 3PL/WMS Provider",
    category="WAREHOUSE",
    provider_type="PAID",
    required_plan="BOOST",
    is_live_capable=True,
    data_truth="Potential live warehouse availability or operational data if an approved provider is configured.",
    notes="Paid provider stub only. No warehouse capacity claims are made without configuration.",
)


def is_enabled() -> bool:
    return env_flag("PAID_WAREHOUSE_PROVIDER_ENABLED", False)
