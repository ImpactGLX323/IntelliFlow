from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.agents.orchestrator import CopilotOrchestrator
from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    AICapabilitiesResponse,
    AICopilotRequest,
    AICopilotResponse,
    AgentRecommendationRead,
    CopilotQueryRequest,
    CopilotQueryResponse,
    RoadmapRequest,
    RoadmapResponse,
)
from app.services import agent_recommendation_service, rag_service


router = APIRouter()
public_router = APIRouter(prefix="/ai-copilot", tags=["ai-copilot"])


@router.post("/roadmap", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        roadmap = rag_service.generate_roadmap(db=db, user_id=current_user.id, query=request.query)
        return RoadmapResponse(**roadmap)
    except Exception:
        raise HTTPException(status_code=500, detail="Error generating roadmap")


@router.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = "Provide 3-5 key insights about my business performance, inventory status, and sales trends. Be concise and actionable."
    try:
        roadmap = rag_service.generate_roadmap(db=db, user_id=current_user.id, query=query)
        return {
            "insights": roadmap.get("insights", []),
            "summary": roadmap.get("summary", ""),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Error generating insights")


@router.post("/query", response_model=CopilotQueryResponse)
async def query_copilot(
    payload: CopilotQueryRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orchestrator = CopilotOrchestrator(request.app.state.internal_mcp)
    try:
        result = orchestrator.handle_query(
            db=db,
            user=current_user,
            query=payload.query,
        )
        return CopilotQueryResponse(
            domain=result["intent"],
            action="orchestrated_query",
            query=payload.query,
            result=result["data"],
            warnings=result.get("warnings", []),
            permission_denied=result.get("upgrade_required", False),
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error processing copilot query")


@router.post("/ai-copilot", response_model=AICopilotResponse)
async def ai_copilot_message(
    payload: AICopilotRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orchestrator = CopilotOrchestrator(request.app.state.internal_mcp)
    try:
        result = orchestrator.handle_query(
            db=db,
            user=current_user,
            query=payload.message,
            organization_id=payload.organization_id,
            requested_plan=payload.user_plan,
        )
        return AICopilotResponse(**result)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error processing AI copilot request")


@public_router.post("/query", response_model=AICopilotResponse)
async def public_ai_copilot_query(
    payload: AICopilotRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    orchestrator = CopilotOrchestrator(request.app.state.internal_mcp)
    try:
        result = orchestrator.handle_copilot_query(
            db=db,
            message=payload.message,
            organization_id=payload.organization_id,
            user_plan=payload.user_plan,
            user_id=payload.user_id,
        )
        return AICopilotResponse(**result)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error processing AI copilot request")


@router.get("/capabilities", response_model=AICapabilitiesResponse)
async def get_ai_capabilities(current_user: User = Depends(get_current_user)):
    return agent_recommendation_service.get_capabilities(current_user)


@router.get("/recommendations", response_model=list[AgentRecommendationRead])
async def get_agent_recommendations(
    domain: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return agent_recommendation_service.list_recommendations(
        db,
        user=current_user,
        domain=domain,
        limit=limit,
    )
