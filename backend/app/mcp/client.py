from __future__ import annotations

from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from app.mcp.schemas import MCPRequestContext, MCPToolResult, PlanLevel
from app.mcp.server import InternalMCPServer
from app.models import User


def resolve_plan_level(user: User) -> PlanLevel:
    """
    Resolve a user's MCP plan from whatever subscription field the app may have.

    The current user model does not yet persist subscription state, so this
    intentionally defaults to FREE unless a compatible attribute is added later.
    """
    for attr_name in ("plan_level", "subscription_plan", "subscription_tier"):
        raw_value = getattr(user, attr_name, None)
        if not raw_value:
            continue
        try:
            return PlanLevel(str(raw_value).upper())
        except ValueError:
            continue
    return PlanLevel.FREE


def parse_plan_level(value: str | PlanLevel | None) -> PlanLevel:
    if isinstance(value, PlanLevel):
        return value
    if value is None:
        return PlanLevel.FREE
    return PlanLevel(str(value).upper())


def effective_plan_level(user: User, requested_plan: str | PlanLevel | None = None) -> PlanLevel:
    """
    Resolve the effective MCP plan for a request.

    If the user model later stores a persisted subscription tier, that tier acts
    as the server-side ceiling. Until then, the requested plan is used so the
    orchestrator can still apply MCP gating consistently for signed-in clients.
    """
    persisted_plan = resolve_plan_level(user)
    requested = parse_plan_level(requested_plan)
    if persisted_plan != PlanLevel.FREE or getattr(user, "plan_level", None) or getattr(user, "subscription_plan", None) or getattr(user, "subscription_tier", None):
        plan_rank = {PlanLevel.FREE: 0, PlanLevel.PRO: 1, PlanLevel.BOOST: 2}
        return persisted_plan if plan_rank[persisted_plan] <= plan_rank[requested] else requested
    return requested


def resolve_scopes(user: User) -> list[str]:
    raw_scopes = getattr(user, "scopes", None)
    if raw_scopes is None:
        return []
    if isinstance(raw_scopes, str):
        return [scope.strip() for scope in raw_scopes.split(",") if scope.strip()]
    if isinstance(raw_scopes, (list, tuple, set)):
        return [str(scope) for scope in raw_scopes if str(scope).strip()]
    return []


class InternalMCPClient:
    """
    Thin internal MCP client for the AI orchestrator.

    This client does not implement business logic. It only constructs request
    context and delegates to the registered MCP server, which remains policy-
    gated and service-backed.
    """

    def __init__(self, server: InternalMCPServer) -> None:
        self.server = server

    def build_context(
        self,
        user: User,
        request_id: str | None = None,
        requested_plan: str | PlanLevel | None = None,
    ) -> MCPRequestContext:
        return MCPRequestContext(
            user_id=user.id,
            email=user.email,
            plan_level=effective_plan_level(user, requested_plan),
            scopes=resolve_scopes(user),
            request_id=request_id or str(uuid4()),
        )

    def build_system_context(
        self,
        *,
        plan_level: PlanLevel = PlanLevel.BOOST,
        scopes: list[str] | None = None,
        request_id: str | None = None,
    ) -> MCPRequestContext:
        """
        Build an explicit internal context for scheduled jobs and orchestrators.

        This still goes through MCP plan enforcement. The caller must choose a
        plan level intentionally instead of bypassing tool/resource gating.
        """
        return MCPRequestContext(
            user_id=None,
            email="system@internal",
            plan_level=plan_level,
            scopes=scopes or [],
            request_id=request_id or str(uuid4()),
        )

    def invoke_tool_with_context(
        self,
        *,
        db: Session,
        context: MCPRequestContext,
        tool_name: str,
        payload: dict[str, Any] | None = None,
    ) -> MCPToolResult:
        return self.server.invoke(
            db=db,
            context=context,
            tool_name=tool_name,
            payload=payload or {},
        )

    def read_resource_with_context(
        self,
        *,
        db: Session,
        context: MCPRequestContext,
        uri: str,
    ) -> MCPToolResult:
        return self.server.read_resource(
            db=db,
            context=context,
            uri=uri,
        )

    def invoke_tool(
        self,
        *,
        db: Session,
        user: User,
        tool_name: str,
        payload: dict[str, Any] | None = None,
        request_id: str | None = None,
        requested_plan: str | PlanLevel | None = None,
    ) -> MCPToolResult:
        context = self.build_context(user, request_id=request_id, requested_plan=requested_plan)
        return self.server.invoke(
            db=db,
            context=context,
            tool_name=tool_name,
            payload=payload or {},
        )

    def read_resource(
        self,
        *,
        db: Session,
        user: User,
        uri: str,
        request_id: str | None = None,
        requested_plan: str | PlanLevel | None = None,
    ) -> MCPToolResult:
        context = self.build_context(user, request_id=request_id, requested_plan=requested_plan)
        return self.server.read_resource(
            db=db,
            context=context,
            uri=uri,
        )
