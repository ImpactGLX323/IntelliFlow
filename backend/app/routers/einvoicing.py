from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import EInvoiceCreateFromSaleRequest, EInvoiceRead, EInvoiceSummaryRead
from app.services.einvoicing_service import create_einvoice_from_sale, get_einvoice_summary, list_einvoice_documents

router = APIRouter()


@router.get("/summary", response_model=EInvoiceSummaryRead)
async def einvoice_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_einvoice_summary(db, owner_id=current_user.id)


@router.get("/documents", response_model=list[EInvoiceRead])
async def einvoice_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_einvoice_documents(db, owner_id=current_user.id)


@router.post("/from-sale/{sale_id}", response_model=EInvoiceRead, status_code=status.HTTP_201_CREATED)
async def einvoice_from_sale(
    sale_id: int,
    payload: EInvoiceCreateFromSaleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_einvoice_from_sale(
        db,
        sale_id=sale_id,
        owner=current_user,
        buyer_name=payload.buyer_name,
        buyer_email=payload.buyer_email,
        buyer_tin=payload.buyer_tin,
        invoice_type=payload.invoice_type,
    )
