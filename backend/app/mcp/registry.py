from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.mcp.authz import enforce_tool_access
from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPToolResult, MCPToolSpec


class MCPRegistry:
    def __init__(self) -> None:
        self._modules: dict[str, MCPModuleSpec] = {}
        self._tools: dict[str, MCPToolSpec] = {}

    def register_module(self, module: MCPModuleSpec) -> None:
        self._modules[module.name] = module
        for tool in module.tools:
            self._tools[tool.name] = tool

    def list_modules(self) -> list[MCPModuleSpec]:
        return list(self._modules.values())

    def list_tools(self) -> list[MCPToolSpec]:
        return list(self._tools.values())

    def get_tool(self, tool_name: str) -> MCPToolSpec:
        return self._tools[tool_name]

    def invoke(
        self,
        *,
        db: Session,
        context: MCPRequestContext,
        tool_name: str,
        payload: dict[str, Any] | None = None,
    ) -> MCPToolResult:
        tool = self.get_tool(tool_name)
        enforce_tool_access(context, tool)
        result = tool.handler(db, context, payload or {})
        if isinstance(result, MCPToolResult):
            return result
        return MCPToolResult(ok=True, data=result)
