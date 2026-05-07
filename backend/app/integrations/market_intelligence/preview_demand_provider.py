from __future__ import annotations

from datetime import date, timedelta

from app.integrations.base import ProviderDefinition


PREVIEW_DEMAND_PROVIDER = ProviderDefinition(
    key="preview_demand_provider",
    name="Preview Demand Provider",
    category="MARKET_INTELLIGENCE",
    provider_type="PREVIEW",
    required_plan="FREE",
    is_live_capable=False,
    data_truth="Demand signal only. Not confirmed sales volume.",
    notes="Preview-only trend estimates for demo and fallback use.",
)


def get_preview_demand_signals(week_start: date | None = None, week_end: date | None = None, category: str | None = None) -> list[dict]:
    resolved_end = week_end or date.today()
    resolved_start = week_start or (resolved_end - timedelta(days=6))
    items = [
        {"rank": 1, "keyword_or_product": "wireless earbuds", "category": "Electronics", "score": 82.4},
        {"rank": 2, "keyword_or_product": "stainless water bottle", "category": "Home & Living", "score": 78.6},
        {"rank": 3, "keyword_or_product": "pet supplements", "category": "Pet Care", "score": 74.1},
        {"rank": 4, "keyword_or_product": "baby wipes", "category": "Family Care", "score": 71.0},
        {"rank": 5, "keyword_or_product": "portable fan", "category": "Lifestyle", "score": 69.8},
    ]
    if category:
        items = [item for item in items if item["category"].lower() == category.lower()]
    return [
        {
            **item,
            "week_start": resolved_start.isoformat(),
            "week_end": resolved_end.isoformat(),
            "data_type": "PREVIEW",
            "confidence": "LOW",
            "is_live": False,
            "is_estimated": True,
        }
        for item in items
    ]
