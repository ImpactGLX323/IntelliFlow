from __future__ import annotations

import os
import logging
from functools import lru_cache
from typing import Any

from openai import OpenAI

logger = logging.getLogger(__name__)

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


@lru_cache(maxsize=1)
def _get_openai_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    return OpenAI(api_key=api_key, base_url=base_url)


def _openai_answer(
    *,
    message: str,
    intent: str,
    data: dict[str, Any],
    citations: list[dict[str, Any]],
    recommendations: list[str],
    warnings: list[str],
) -> str | None:
    client = _get_openai_client()
    if client is None:
        return None

    model_name = os.getenv("OPENAI_CHAT_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
    system_prompt = (
        "You are IntelliFlow Copilot, a concise supply-chain operations assistant. "
        "Answer only from the provided operational data, citations, and warnings. "
        "Do not invent facts, do not promise compliance certification, and clearly mention preview or estimated data when present. "
        "Keep the answer practical and short."
    )
    user_prompt = (
        f"User question:\n{message}\n\n"
        f"Intent:\n{intent}\n\n"
        f"Structured data:\n{data}\n\n"
        f"Citations:\n{citations}\n\n"
        f"Recommendations:\n{recommendations}\n\n"
        f"Warnings:\n{warnings}\n"
    )

    response = client.responses.create(
        model=model_name,
        input=[
            {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
        temperature=0.25,
        max_output_tokens=240,
    )
    answer = getattr(response, "output_text", "") or ""
    normalized = answer.strip()
    return normalized or None


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
    normalized_provider = (provider or "template").lower()
    use_openai = normalized_provider == "openai" or (
        normalized_provider == "template" and os.getenv("OPENAI_API_KEY") and os.getenv("AI_PROVIDER", "").lower() == "openai"
    )
    if use_openai:
        try:
            answer = _openai_answer(
                message=message,
                intent=intent,
                data=data,
                citations=citations,
                recommendations=recommendations,
                warnings=warnings,
            )
            if answer:
                return answer
        except Exception as exc:
            logger.warning("OpenAI copilot provider fallback triggered: %s", exc)
    return _template_answer(intent, data, warnings)
