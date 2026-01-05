from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import RoadmapRequest, RoadmapResponse
from app.auth import get_current_user
from app.rag_system import rag_system

router = APIRouter()

@router.post("/roadmap", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        roadmap = rag_system.generate_roadmap(
            query=request.query,
            db=db,
            user_id=current_user.id
        )
        return RoadmapResponse(**roadmap)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating roadmap: {str(e)}"
        )

@router.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quick AI insights about the business"""
    query = "Provide 3-5 key insights about my business performance, inventory status, and sales trends. Be concise and actionable."
    try:
        roadmap = rag_system.generate_roadmap(
            query=query,
            db=db,
            user_id=current_user.id
        )
        return {
            "insights": roadmap.get("insights", []),
            "summary": roadmap.get("summary", "")
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating insights: {str(e)}"
        )

