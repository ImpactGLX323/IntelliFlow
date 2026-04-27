from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.mcp.authz import enforce_resource_access, enforce_tool_access
from app.mcp.schemas import MCPModuleSpec, MCPRequestContext, MCPResourceSpec, MCPToolResult, MCPToolSpec


class MCPRegistry:
    def __init__(self) -> None:
        self._modules: dict[str, MCPModuleSpec] = {}
        self._tools: dict[str, MCPToolSpec] = {}
        self._resources: list[tuple[MCPResourceSpec, re.Pattern[str]]] = []

    def register_module(self, module: MCPModuleSpec) -> None:
        self._modules[module.name] = module
        for tool in module.tools:
            self._tools[tool.name] = tool
        for resource in module.resources:
            pattern = self._compile_template(resource.uri_template)
            self._resources.append((resource, pattern))

    def list_modules(self) -> list[MCPModuleSpec]:
        return list(self._modules.values())

    def list_tools(self) -> list[MCPToolSpec]:
        return list(self._tools.values())

    def list_resources(self) -> list[MCPResourceSpec]:
        return [resource for resource, _ in self._resources]

    def get_tool(self, tool_name: str) -> MCPToolSpec:
        return self._tools[tool_name]

    def get_resource(self, uri: str) -> tuple[MCPResourceSpec, dict[str, str]]:
        for resource, pattern in self._resources:
            match = pattern.fullmatch(uri)
            if match:
                return resource, match.groupdict()
        raise KeyError(uri)

    def _compile_template(self, uri_template: str) -> re.Pattern[str]:
        pattern = re.sub(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}", r"(?P<\1>[^/]+)", uri_template)
        return re.compile(pattern)

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

    def read_resource(
        self,
        *,
        db: Session,
        context: MCPRequestContext,
        uri: str,
    ) -> MCPToolResult:
        resource, params = self.get_resource(uri)
        enforce_resource_access(context, resource)
        result = resource.handler(db, context, params)
        if isinstance(result, MCPToolResult):
            return result
        return MCPToolResult(ok=True, data=result)
