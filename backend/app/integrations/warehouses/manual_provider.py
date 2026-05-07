from __future__ import annotations

from app.integrations.base import ProviderDefinition


WAREHOUSE_SEEDED_PROVIDER = ProviderDefinition(
    key="seeded_preview",
    name="Seeded Warehouse Preview",
    category="WAREHOUSE",
    provider_type="PREVIEW",
    required_plan="FREE",
    is_live_capable=False,
    data_truth="Directory/location data only. Availability and capacity are not verified.",
    notes="Seeded preview locations for demo and offline fallback.",
)
