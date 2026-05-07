from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import EInvoiceDocument, Product, Sale, User


def _generate_document_number(db: Session) -> str:
    count = db.query(func.count(EInvoiceDocument.id)).scalar() or 0
    return f"INV-MY-{datetime.utcnow().strftime('%Y%m%d')}-{count + 1:05d}"


def _build_validation_notes(*, buyer_name: Optional[str], buyer_tin: Optional[str], seller_tin: Optional[str]) -> list[str]:
    notes: list[str] = []
    if not buyer_name:
        notes.append("buyer_name_missing")
    if not buyer_tin:
        notes.append("buyer_tin_missing")
    if not seller_tin:
        notes.append("seller_tin_missing")
    return notes


def list_einvoice_documents(db: Session, *, owner_id: int) -> list[EInvoiceDocument]:
    return (
        db.query(EInvoiceDocument)
        .filter(EInvoiceDocument.owner_id == owner_id)
        .order_by(EInvoiceDocument.issue_date.desc(), EInvoiceDocument.id.desc())
        .all()
    )


def get_einvoice_summary(db: Session, *, owner_id: int) -> dict:
    documents = list_einvoice_documents(db, owner_id=owner_id)
    return {
        "total_documents": len(documents),
        "ready_documents": sum(1 for item in documents if item.validation_status == "READY"),
        "missing_tax_identity": sum(
            1 for item in documents if "buyer_tin_missing" in (item.validation_notes or []) or "seller_tin_missing" in (item.validation_notes or [])
        ),
        "total_invoice_value": float(sum(item.total_amount for item in documents)),
    }


def create_einvoice_from_sale(
    db: Session,
    *,
    sale_id: int,
    owner: User,
    buyer_name: Optional[str] = None,
    buyer_email: Optional[str] = None,
    buyer_tin: Optional[str] = None,
    invoice_type: str = "01",
) -> EInvoiceDocument:
    sale = (
        db.query(Sale)
        .join(Product, Product.id == Sale.product_id)
        .filter(Sale.id == sale_id, Sale.owner_id == owner.id, Product.owner_id == owner.id)
        .first()
    )
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    existing = (
        db.query(EInvoiceDocument)
        .filter(EInvoiceDocument.sale_id == sale.id, EInvoiceDocument.owner_id == owner.id)
        .first()
    )
    if existing is not None:
        return existing

    product = db.query(Product).filter(Product.id == sale.product_id, Product.owner_id == owner.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    resolved_buyer_name = buyer_name or sale.customer_id or "Walk-in Customer"
    resolved_seller_name = (
        owner.organization.name if getattr(owner, "organization", None) is not None else owner.full_name or owner.email
    )
    seller_tin = None
    validation_notes = _build_validation_notes(
        buyer_name=resolved_buyer_name,
        buyer_tin=buyer_tin,
        seller_tin=seller_tin,
    )
    validation_status = "READY" if not validation_notes else "MISSING_REQUIRED_FIELDS"

    document = EInvoiceDocument(
        sale_id=sale.id,
        owner_id=owner.id,
        document_number=_generate_document_number(db),
        status="READY",
        invoice_type=invoice_type,
        currency="MYR",
        buyer_name=resolved_buyer_name,
        buyer_email=buyer_email,
        buyer_tin=buyer_tin,
        seller_name=resolved_seller_name or "IntelliFlow Workspace",
        seller_tin=seller_tin,
        issue_date=sale.sale_date,
        subtotal=float(sale.total_amount),
        tax_amount=0.0,
        total_amount=float(sale.total_amount),
        validation_status=validation_status,
        validation_notes=validation_notes,
        line_items=[
            {
                "product_id": product.id,
                "sku": product.sku,
                "product_name": product.name,
                "quantity": sale.quantity,
                "unit_price": float(sale.unit_price),
                "line_total": float(sale.total_amount),
            }
        ],
        lhdn_reference=None,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document
