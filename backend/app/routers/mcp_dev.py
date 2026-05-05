from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.mcp.client import InternalMCPClient
from app.schemas import MCPDevResourceReadRequest, MCPDevToolRequest


router = APIRouter(prefix="/mcp-dev", tags=["mcp-dev"])


@router.get("/registry")
async def get_mcp_registry(
    request: Request,
    db: Session = Depends(get_db),
    user_plan: str = "BOOST",
):
    client = InternalMCPClient(request.app.state.internal_mcp, db=db)
    user_context = {"user_plan": user_plan}
    return {
        "tools": client.list_tools(user_context),
        "resources": client.list_resources(user_context),
    }


@router.post("/tools/{tool_name}")
async def call_mcp_tool(
    tool_name: str,
    payload: MCPDevToolRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client = InternalMCPClient(request.app.state.internal_mcp, db=db)
    return client.call_tool(tool_name, payload.arguments, payload.user_context).model_dump()


@router.post("/resources/read")
async def read_mcp_resource(
    payload: MCPDevResourceReadRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client = InternalMCPClient(request.app.state.internal_mcp, db=db)
    return client.read_resource(payload.uri, payload.user_context).model_dump()
