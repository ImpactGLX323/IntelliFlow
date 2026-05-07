from __future__ import annotations

from datetime import date
from typing import Any

from app.integrations.base import ProviderDefinition, env_flag


BNM_OPENAPI_PROVIDER = ProviderDefinition(
    key="bnm_openapi",
    name="BNM OpenAPI",
    category="PUBLIC_DATA",
    provider_type="FREE_PUBLIC",
    required_plan="FREE",
    is_live_capable=True,
    data_truth="Official BNM dataset where available.",
    notes="Backend adapter currently falls back to preview rates until the exact official endpoint contract is configured.",
)


def is_enabled() -> bool:
    return env_flag("BNM_OPENAPI_ENABLED", True)


def get_preview_rates(target_date: date | None = None, currency: str | None = None) -> dict[str, Any]:
    as_of = (target_date or date.today()).isoformat()
    base_rates = [
        {"currency": "USD", "buying_rate": 4.68, "selling_rate": 4.72, "middle_rate": 4.70, "date": as_of},
        {"currency": "CNY", "buying_rate": 0.64, "selling_rate": 0.66, "middle_rate": 0.65, "date": as_of},
        {"currency": "SGD", "buying_rate": 3.45, "selling_rate": 3.49, "middle_rate": 3.47, "date": as_of},
        {"currency": "EUR", "buying_rate": 5.06, "selling_rate": 5.12, "middle_rate": 5.09, "date": as_of},
    ]
    if currency:
        base_rates = [row for row in base_rates if row["currency"] == currency.upper()]
    return {
        "source": "preview_bnm_fallback",
        "is_live": False,
        "data_truth": "Preview FX rates only until the official BNM adapter is configured.",
        "rates": base_rates,
        "warnings": ["BNM OpenAPI adapter is using preview fallback data."],
    }
