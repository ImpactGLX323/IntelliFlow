import json
import os
from datetime import datetime, timedelta
from typing import Any

from openai import OpenAI
from sqlalchemy.orm import Session

from app.models import Product, RiskAlert, Sale
from app.schemas import RoadmapTask
from app.services.stock_ledger_service import get_stock_position


class RAGSystem:
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model_name = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def build_context_from_db(self, db: Session, user_id: int) -> str:
        """Build a structured context string from database records."""
        context_parts: list[str] = []

        products = db.query(Product).filter(Product.owner_id == user_id).all()
        product_data = []
        for product in products:
            stock_position = get_stock_position(db, product.id)
            product_data.append(
                {
                    "name": product.name,
                    "sku": product.sku,
                    "category": product.category,
                    "price": product.price,
                    "cost": product.cost,
                    "stock": stock_position["available"],
                    "on_hand": stock_position["on_hand"],
                    "reserved": stock_position["reserved"],
                    "threshold": product.min_stock_threshold,
                    "supplier": product.supplier,
                }
            )
        context_parts.append(f"Products: {json.dumps(product_data, indent=2)}")

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sales = (
            db.query(Sale)
            .filter(Sale.owner_id == user_id, Sale.sale_date >= thirty_days_ago)
            .all()
        )

        sales_summary: dict[int, dict[str, Any]] = {}
        for sale in sales:
            if sale.product_id not in sales_summary:
                sales_summary[sale.product_id] = {
                    "quantity": 0,
                    "revenue": 0,
                    "count": 0,
                }
            sales_summary[sale.product_id]["quantity"] += sale.quantity
            sales_summary[sale.product_id]["revenue"] += sale.total_amount
            sales_summary[sale.product_id]["count"] += 1

        context_parts.append(
            f"Sales Summary (last 30 days): {json.dumps(sales_summary, indent=2)}"
        )

        alerts = (
            db.query(RiskAlert)
            .filter(RiskAlert.owner_id == user_id, RiskAlert.is_resolved.is_(False))
            .all()
        )
        alert_data = [
            {
                "type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "product_id": alert.product_id,
            }
            for alert in alerts
        ]
        context_parts.append(f"Active Risk Alerts: {json.dumps(alert_data, indent=2)}")

        return "\n\n".join(context_parts)

    def generate_roadmap(self, query: str, db: Session, user_id: int) -> dict[str, Any]:
        """Generate an actionable roadmap directly from database context."""
        context = self.build_context_from_db(db, user_id)

        prompt = f"""You are an AI business advisor for an e-commerce seller.

Based on the business context below, generate an actionable roadmap.

Business Context:
{context}

User Query:
{query}

Return strict JSON with this structure:
{{
  "summary": "string",
  "tasks": [
    {{
      "title": "string",
      "description": "string",
      "priority": "low|medium|high|critical",
      "category": "inventory|sales|pricing|marketing|operations|general",
      "estimated_impact": "string",
      "action_items": ["string"]
    }}
  ],
  "insights": ["string"]
}}
"""

        response = self.client.responses.create(
            model=self.model_name,
            input=prompt,
            temperature=0.4,
        )
        result = response.output_text

        try:
            if "```json" in result:
                result = result.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in result:
                result = result.split("```", 1)[1].split("```", 1)[0].strip()

            roadmap_data = json.loads(result)
        except Exception:
            roadmap_data = {
                "summary": result[:500],
                "tasks": [
                    {
                        "title": "Review AI Recommendations",
                        "description": result,
                        "priority": "medium",
                        "category": "general",
                        "estimated_impact": "Moderate",
                        "action_items": ["Review the AI-generated insights above"],
                    }
                ],
                "insights": [result[:200]],
            }

        tasks = [RoadmapTask(**task) for task in roadmap_data.get("tasks", [])]

        return {
            "summary": roadmap_data.get("summary", ""),
            "tasks": tasks,
            "insights": roadmap_data.get("insights", []),
            "generated_at": datetime.utcnow(),
        }


rag_system = RAGSystem()
