from __future__ import annotations

import os
from typing import Any


def _template_answer(intent: str, data: dict[str, Any], warnings: list[str]) -> str:
    if intent == "inventory":
        items = data.get("items") if isinstance(data.get("items"), list) else None
        if items is not None:
            return f"Inventory review complete. {len(items)} low-stock items were found."
        if data.get("sku"):
            return f"Inventory position is available for SKU {data['sku']}."
        return "Inventory data is available."
    if intent == "sales":
        products = data.get("products", [])
        return f"Sales review complete. {len(products)} top-selling products were returned."
    if intent == "returns":
        items = data.get("items") if isinstance(data.get("items"), list) else data
        count = len(items) if isinstance(items, list) else 1
        return f"Returns review complete. {count} return-impact records were returned."
    if intent == "logistics":
        items = data.get("items") if isinstance(data.get("items"), list) else data
        count = len(items) if isinstance(items, list) else 1
        return f"Logistics review complete. {count} delayed-shipment records were returned."
    if intent == "rag":
        if data.get("summary"):
            return str(data["summary"])
        if warnings:
            return warnings[0]
        return "Compliance context is available."
    return "Copilot response is ready."


def generate_answer(
    *,
    provider: str,
    message: str,
    intent: str,
    data: dict[str, Any],
    citations: list[dict[str, Any]],
    recommendations: list[str],
    warnings: list[str],
) -> str:
    normalized = (provider or "template").lower()
    if normalized == "openai" and os.getenv("OPENAI_API_KEY"):
        # TODO: Replace template fallback with a real OpenAI completion when the
        # project is ready to depend on an external LLM provider.
        pass
    return _template_answer(intent, data, warnings)
