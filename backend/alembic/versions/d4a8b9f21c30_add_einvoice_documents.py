"""add e-invoice documents

Revision ID: d4a8b9f21c30
Revises: c2f4a6d8e901
Create Date: 2026-05-06 12:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "d4a8b9f21c30"
down_revision = "c2f4a6d8e901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "e_invoice_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("document_number", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="READY"),
        sa.Column("invoice_type", sa.String(), nullable=False, server_default="01"),
        sa.Column("currency", sa.String(), nullable=False, server_default="MYR"),
        sa.Column("buyer_name", sa.String(), nullable=True),
        sa.Column("buyer_email", sa.String(), nullable=True),
        sa.Column("buyer_tin", sa.String(), nullable=True),
        sa.Column("seller_name", sa.String(), nullable=False),
        sa.Column("seller_tin", sa.String(), nullable=True),
        sa.Column("issue_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("validation_status", sa.String(), nullable=False, server_default="READY"),
        sa.Column("validation_notes", sa.JSON(), nullable=False),
        sa.Column("line_items", sa.JSON(), nullable=False),
        sa.Column("lhdn_reference", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_e_invoice_documents_id"), "e_invoice_documents", ["id"], unique=False)
    op.create_index(op.f("ix_e_invoice_documents_sale_id"), "e_invoice_documents", ["sale_id"], unique=False)
    op.create_index(op.f("ix_e_invoice_documents_owner_id"), "e_invoice_documents", ["owner_id"], unique=False)
    op.create_index(op.f("ix_e_invoice_documents_document_number"), "e_invoice_documents", ["document_number"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_e_invoice_documents_document_number"), table_name="e_invoice_documents")
    op.drop_index(op.f("ix_e_invoice_documents_owner_id"), table_name="e_invoice_documents")
    op.drop_index(op.f("ix_e_invoice_documents_sale_id"), table_name="e_invoice_documents")
    op.drop_index(op.f("ix_e_invoice_documents_id"), table_name="e_invoice_documents")
    op.drop_table("e_invoice_documents")
