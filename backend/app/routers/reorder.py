from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import ReorderPointCreate, ReorderPointRead, ReorderSuggestionRead
from app.services.reorder_service import get_reorder_suggestions, set_reorder_point

router = APIRouter()


@router.get("/reorder/suggestions", response_model=List[ReorderSuggestionRead])
async def reorder_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return get_reorder_suggestions(db)


@router.post("/reorder-points", response_model=ReorderPointRead, status_code=status.HTTP_201_CREATED)
async def create_reorder_point(
    payload: ReorderPointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return set_reorder_point(
        db,
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        minimum_quantity=payload.minimum_quantity,
        reorder_quantity=payload.reorder_quantity,
    )
