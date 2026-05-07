from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status

from sqlalchemy.orm import Session

from app.core.config import get_app_config
from app.mcp.authz import enforce_resource_access, enforce_tool_access
from app.mcp.registry import MCPRegistry
from app.mcp.schemas import MCPRequestContext, MCPToolResult, PlanLevel
from app.mcp.server import InternalMCPServer
from app.models import User


def resolve_plan_level(user: User) -> PlanLevel:
    override = get_app_config().testing_plan_override
    if override:
        return parse_plan_level(override)
    for attr_name in ("plan_level", "subscription_plan", "subscription_tier"):
        raw_value = getattr(user, attr_name, None)
        if not raw_value:
            continue
        try:
            return parse_plan_level(raw_value)
        except ValueError:
            continue
    organization = getattr(user, "organization", None)
    organization_plan = getattr(organization, "subscription_plan", None) if organization is not None else None
    if organization_plan:
        return parse_plan_level(organization_plan)
    return PlanLevel.FREE


def parse_plan_level(value: str | PlanLevel | None) -> PlanLevel:
    if isinstance(value, PlanLevel):
        return value
    if value is None:
        return PlanLevel.FREE
    normalized = str(value).upper()
    if normalized == "PREMIUM":
        normalized = PlanLevel.PRO.value
    return PlanLevel(normalized)


def effective_plan_level(user: User, requested_plan: str | PlanLevel | None = None) -> PlanLevel:
    _ = requested_plan
    return resolve_plan_level(user)


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

    def __init__(self, server: InternalMCPServer, db: Session | None = None) -> None:
        self.server = server
        self.db = db

    @property
    def registry(self) -> MCPRegistry:
        return self.server.registry

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
        plan_level: str | PlanLevel = PlanLevel.BOOST,
        scopes: list[str] | None = None,
        request_id: str | None = None,
        user_id: int | None = None,
        email: str | None = None,
    ) -> MCPRequestContext:
        """
        Build an explicit internal context for scheduled jobs and orchestrators.

        This still goes through MCP plan enforcement. The caller must choose a
        plan level intentionally instead of bypassing tool/resource gating.
        """
        return MCPRequestContext(
            user_id=user_id,
            email=email or "system@internal",
            plan_level=parse_plan_level(plan_level),
            scopes=scopes or [],
            request_id=request_id or str(uuid4()),
        )

    def build_context_from_user_context(self, user_context: dict[str, Any] | None) -> MCPRequestContext:
        user_context = user_context or {}
        return MCPRequestContext(
            user_id=user_context.get("user_id"),
            email=user_context.get("email", "system@internal"),
            plan_level=parse_plan_level(user_context.get("user_plan") or user_context.get("plan_level")),
            scopes=[str(scope) for scope in user_context.get("scopes", [])],
            request_id=user_context.get("request_id") or str(uuid4()),
        )

    def _require_db(self, db: Session | None = None) -> Session:
        active_db = db or self.db
        if active_db is None:
            raise RuntimeError("InternalMCPClient requires a database session for this operation")
        return active_db

    def _tool_descriptor(self, tool) -> dict[str, Any]:
        return {
            "name": tool.name,
            "domain": tool.domain,
            "description": tool.description,
            "min_plan": tool.min_plan.value,
            "read_only": tool.read_only,
            "scopes": tool.scopes,
        }

    def _resource_descriptor(self, resource) -> dict[str, Any]:
        return {
            "uri_template": resource.uri_template,
            "domain": resource.domain,
            "description": resource.description,
            "min_plan": resource.min_plan.value,
            "scopes": resource.scopes,
        }

    def _error_result(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        target: str | None = None,
    ) -> MCPToolResult:
        return MCPToolResult(
            ok=False,
            data={
                "error": {
                    "code": code,
                    "message": message,
                    "status_code": status_code,
                    "target": target,
                }
            },
            message=message,
        )

    def list_tools(self, user_context: dict[str, Any] | None = None) -> dict[str, Any]:
        context = self.build_context_from_user_context(user_context)
        allowed: list[dict[str, Any]] = []
        blocked: list[dict[str, Any]] = []
        for tool in self.registry.list_tools():
            try:
                enforce_tool_access(context, tool)
                allowed.append(self._tool_descriptor(tool))
            except HTTPException as exc:
                blocked.append(
                    {
                        **self._tool_descriptor(tool),
                        "error": exc.detail,
                        "status_code": exc.status_code,
                    }
                )
        return {
            "tools": allowed,
            "blocked_tools": blocked,
            "plan_level": context.plan_level.value,
            "request_id": context.request_id,
        }

    def list_resources(self, user_context: dict[str, Any] | None = None) -> dict[str, Any]:
        context = self.build_context_from_user_context(user_context)
        allowed: list[dict[str, Any]] = []
        blocked: list[dict[str, Any]] = []
        for resource in self.registry.list_resources():
            try:
                enforce_resource_access(context, resource)
                allowed.append(self._resource_descriptor(resource))
            except HTTPException as exc:
                blocked.append(
                    {
                        **self._resource_descriptor(resource),
                        "error": exc.detail,
                        "status_code": exc.status_code,
                    }
                )
        return {
            "resources": allowed,
            "blocked_resources": blocked,
            "plan_level": context.plan_level.value,
            "request_id": context.request_id,
        }

    def call_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        user_context: dict[str, Any] | None = None,
        *,
        db: Session | None = None,
    ) -> MCPToolResult:
        context = self.build_context_from_user_context(user_context)
        active_db = self._require_db(db)
        try:
            return self.server.invoke(
                db=active_db,
                context=context,
                tool_name=tool_name,
                payload=arguments,
            )
        except KeyError:
            return self._error_result(
                code="tool_not_found",
                message=f"MCP tool '{tool_name}' is not registered.",
                status_code=status.HTTP_404_NOT_FOUND,
                target=tool_name,
            )
        except HTTPException as exc:
            return self._error_result(
                code="tool_access_denied" if exc.status_code == status.HTTP_403_FORBIDDEN else "tool_error",
                message=str(exc.detail),
                status_code=exc.status_code,
                target=tool_name,
            )
        except Exception:
            return self._error_result(
                code="tool_execution_failed",
                message="MCP tool execution failed.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                target=tool_name,
            )

    def read_resource(
        self,
        uri: str | None = None,
        user_context: dict[str, Any] | None = None,
        *,
        db: Session | None = None,
        user: User | None = None,
        request_id: str | None = None,
        requested_plan: str | PlanLevel | None = None,
    ) -> MCPToolResult:
        if user is not None:
            if uri is None:
                raise ValueError("uri is required when reading an MCP resource for a user")
            context = self.build_context(user, request_id=request_id, requested_plan=requested_plan)
            active_db = self._require_db(db)
            return self.server.read_resource(
                db=active_db,
                context=context,
                uri=uri,
            )

        if uri is None:
            raise ValueError("uri is required")
        context = self.build_context_from_user_context(user_context)
        active_db = self._require_db(db)
        try:
            return self.server.read_resource(
                db=active_db,
                context=context,
                uri=uri,
            )
        except KeyError:
            return self._error_result(
                code="resource_not_found",
                message=f"MCP resource '{uri}' is not registered.",
                status_code=status.HTTP_404_NOT_FOUND,
                target=uri,
            )
        except HTTPException as exc:
            return self._error_result(
                code="resource_access_denied" if exc.status_code == status.HTTP_403_FORBIDDEN else "resource_error",
                message=str(exc.detail),
                status_code=exc.status_code,
                target=uri,
            )
        except Exception:
            return self._error_result(
                code="resource_read_failed",
                message="MCP resource read failed.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                target=uri,
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

    def read_resource_for_user(
        self,
        *,
        db: Session,
        user: User,
        uri: str,
        request_id: str | None = None,
        requested_plan: str | PlanLevel | None = None,
    ) -> MCPToolResult:
        return self.read_resource(
            uri=uri,
            db=db,
            user=user,
            request_id=request_id,
            requested_plan=requested_plan,
        )
