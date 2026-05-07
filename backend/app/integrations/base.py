from __future__ import annotations

import os
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class ProviderLimits:
    requests_per_minute: int | None = None
    requests_per_hour: int | None = None
    requests_per_day: int | None = None


@dataclass(frozen=True)
class ProviderDefinition:
    key: str
    name: str
    category: str
    provider_type: str
    required_plan: str
    is_live_capable: bool
    data_truth: str
    notes: str | None = None
    limits: ProviderLimits = field(default_factory=ProviderLimits)

    def to_public_dict(self, *, enabled: bool) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "category": self.category,
            "provider_type": self.provider_type,
            "required_plan": self.required_plan,
            "is_enabled": enabled,
            "is_live_capable": self.is_live_capable,
            "limits": {key: value for key, value in asdict(self.limits).items() if value is not None},
            "data_truth": self.data_truth,
            "notes": self.notes,
        }


def env_flag(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_text(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()
