from __future__ import annotations

from typing import Any

from app.mcp.free_integrations_mcp import register_free_integrations_mcp
from app.mcp.inventory_mcp import register_inventory_mcp
from app.mcp.logistics_mcp import register_logistics_mcp
from app.mcp.rag_mcp import register_rag_mcp
from app.mcp.registry import MCPRegistry
from app.mcp.schemas import MCPRequestContext, MCPToolResult
from app.mcp.returns_mcp import register_returns_mcp
from app.mcp.sales_mcp import register_sales_mcp
from sqlalchemy.orm import Session


class InternalMCPServer:
    """
    Internal MCP facade for the AI orchestrator.

    This layer does not replace the public FastAPI API. It provides a structured,
    policy-gated tool surface for AI workflows and must delegate all business
    operations to service-layer functions rather than touching ORM writes directly.
    """

    def __init__(self, registry: MCPRegistry | None = None) -> None:
        self.registry = registry or build_internal_mcp_registry()

    def list_tools(self):
        return self.registry.list_tools()

    def list_modules(self):
        return self.registry.list_modules()

    def list_resources(self):
        return self.registry.list_resources()

    def invoke(
        self,
        *,
        db: Session,
        context: MCPRequestContext,
        tool_name: str,
        payload: dict[str, Any] | None = None,
    ) -> MCPToolResult:
        return self.registry.invoke(
            db=db,
            context=context,
            tool_name=tool_name,
            payload=payload,
        )

    def read_resource(
        self,
        *,
        db: Session,
        context: MCPRequestContext,
        uri: str,
    ) -> MCPToolResult:
        return self.registry.read_resource(
            db=db,
            context=context,
            uri=uri,
        )


def build_internal_mcp_registry() -> MCPRegistry:
    registry = MCPRegistry()
    for module_factory in (
        register_free_integrations_mcp,
        register_inventory_mcp,
        register_sales_mcp,
        register_returns_mcp,
        register_logistics_mcp,
        register_rag_mcp,
    ):
        registry.register_module(module_factory())
    return registry
