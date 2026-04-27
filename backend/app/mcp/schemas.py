from __future__ import annotations

from enum import Enum
from typing import Any, Callable, Optional

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session


class PlanLevel(str, Enum):
    FREE = "FREE"
    PRO = "PRO"
    BOOST = "BOOST"


class MCPRequestContext(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    plan_level: PlanLevel = PlanLevel.FREE
    scopes: list[str] = Field(default_factory=list)
    request_id: Optional[str] = None


class MCPToolResult(BaseModel):
    ok: bool = True
    data: Any = None
    message: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)


class MCPToolSpec(BaseModel):
    name: str
    domain: str
    description: str
    min_plan: PlanLevel = PlanLevel.FREE
    read_only: bool = True
    scopes: list[str] = Field(default_factory=list)
    handler: Callable[[Session, MCPRequestContext, dict[str, Any]], Any]

    model_config = ConfigDict(arbitrary_types_allowed=True)


class MCPModuleSpec(BaseModel):
    name: str
    description: str
    min_plan: PlanLevel = PlanLevel.FREE
    tools: list[MCPToolSpec] = Field(default_factory=list)
