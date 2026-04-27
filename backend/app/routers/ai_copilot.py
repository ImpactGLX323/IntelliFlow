from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.agents.orchestrator import CopilotOrchestrator
from app.database import get_db
from app.models import User
from app.schemas import (
    AICapabilitiesResponse,
    AgentRecommendationRead,
    CopilotQueryRequest,
    CopilotQueryResponse,
    RoadmapRequest,
    RoadmapResponse,
)
from app.auth import get_current_user
from app.services import agent_recommendation_service
from app.services import rag_service

router = APIRouter()

@router.post("/roadmap", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        roadmap = rag_service.generate_roadmap(db=db, user_id=current_user.id, query=request.query)
        return RoadmapResponse(**roadmap)
    except Exception:
        raise HTTPException(status_code=500, detail="Error generating roadmap")

@router.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quick AI insights about the business"""
    query = "Provide 3-5 key insights about my business performance, inventory status, and sales trends. Be concise and actionable."
    try:
        roadmap = rag_service.generate_roadmap(db=db, user_id=current_user.id, query=query)
        return {
            "insights": roadmap.get("insights", []),
            "summary": roadmap.get("summary", "")
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
    """
    Route a natural-language copilot query through the internal MCP layer.

    The orchestrator delegates to MCP resources/tools, which in turn must call
    service-layer functions. This preserves validation, permissions, and audit
    behavior instead of letting the AI layer bypass the application stack.
    """
    orchestrator = CopilotOrchestrator(request.app.state.internal_mcp)
    try:
        result = orchestrator.handle_query(
            db=db,
            user=current_user,
            query=payload.query,
        )
        return CopilotQueryResponse(**result)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error processing copilot query")


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
