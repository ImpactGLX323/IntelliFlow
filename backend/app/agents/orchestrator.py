from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.mcp.client import InternalMCPClient
from app.mcp.server import InternalMCPServer
from app.models import User


@dataclass(frozen=True)
class CopilotAction:
    domain: str
    action: str
    mode: str
    target: str
    payload: dict[str, Any]


class CopilotOrchestrator:
    """
    Simple domain router for the AI copilot.

    It maps natural-language requests to a small set of internal MCP reads/tools.
    The orchestrator never writes directly to the database and must rely on MCP
    policy checks rather than bypassing plan restrictions.
    """

    def __init__(self, mcp_server: InternalMCPServer) -> None:
        self.client = InternalMCPClient(mcp_server)

    def handle_query(self, *, db: Session, user: User, query: str) -> dict[str, Any]:
        request_id = str(uuid4())
        action = self._route_query(query)

        try:
            if action.mode == "resource":
                mcp_result = self.client.read_resource(
                    db=db,
                    user=user,
                    uri=action.target,
                    request_id=request_id,
                )
            else:
                mcp_result = self.client.invoke_tool(
                    db=db,
                    user=user,
                    tool_name=action.target,
                    payload=action.payload,
                    request_id=request_id,
                )
        except HTTPException as exc:
            if exc.status_code == status.HTTP_403_FORBIDDEN:
                return {
                    "domain": action.domain,
                    "action": action.action,
                    "query": query,
                    "result": {
                        "message": exc.detail,
                        "requested_target": action.target,
                    },
                    "warnings": [
                        "The current user plan or scopes do not allow this MCP capability."
                    ],
                    "permission_denied": True,
                    "request_id": request_id,
                }
            raise
        except KeyError:
            raise HTTPException(status_code=400, detail="Unsupported copilot request")

        return {
            "domain": action.domain,
            "action": action.action,
            "query": query,
            "result": mcp_result.data if isinstance(mcp_result.data, dict) else {"items": mcp_result.data},
            "warnings": mcp_result.warnings,
            "permission_denied": False,
            "request_id": request_id,
        }

    def _route_query(self, query: str) -> CopilotAction:
        normalized = query.strip().lower()

        if "low on stock" in normalized or "low stock" in normalized:
            return CopilotAction(
                domain="inventory",
                action="get_low_stock_items",
                mode="resource",
                target="inventory://low-stock",
                payload={},
            )

        if "best-selling" in normalized or "best selling" in normalized or "top products" in normalized:
            days = 7 if "week" in normalized else 30
            return CopilotAction(
                domain="sales",
                action="get_best_selling_products",
                mode="tool",
                target="sales.get_best_selling_products",
                payload={"days": days, "limit": 10},
            )

        if "leaking profit" in normalized or ("returns" in normalized and "profit" in normalized):
            return CopilotAction(
                domain="returns",
                action="get_high_return_products",
                mode="resource",
                target="returns://high-return-products",
                payload={},
            )

        if "international shipment" in normalized and ("delayed" in normalized or "late" in normalized):
            return CopilotAction(
                domain="logistics",
                action="detect_late_shipments",
                mode="tool",
                target="logistics.detect_late_shipments",
                payload={"threshold_days": 1},
            )

        if any(term in normalized for term in ("malaysian customs", "customs law", "customs act")):
            if "shipment" in normalized:
                return CopilotAction(
                    domain="rag",
                    action="check_customs_risk",
                    mode="tool",
                    target="rag.check_customs_risk",
                    payload={"query": query},
                )
            return CopilotAction(
                domain="rag",
                action="answer_with_citations",
                mode="tool",
                target="rag.answer_with_citations",
                payload={"query": query},
            )

        if any(term in normalized for term in ("road transport", "transport compliance", "truck compliance")):
            return CopilotAction(
                domain="rag",
                action="check_transport_compliance",
                mode="tool",
                target="rag.check_transport_compliance",
                payload={"query": query},
            )

        if any(term in normalized for term in ("inventory risk", "inventory snapshot")):
            return CopilotAction(
                domain="rag",
                action="get_inventory_risk_snapshot",
                mode="tool",
                target="rag.get_inventory_risk_snapshot",
                payload={},
            )

        return CopilotAction(
            domain="rag",
            action="answer_with_citations",
            mode="tool",
            target="rag.answer_with_citations",
            payload={"query": query},
        )
