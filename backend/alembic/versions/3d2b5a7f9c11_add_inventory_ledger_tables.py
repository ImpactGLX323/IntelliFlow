"""add inventory ledger tables

Revision ID: 3d2b5a7f9c11
Revises: f7ffcbf0bbc0
Create Date: 2026-04-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3d2b5a7f9c11"
down_revision = "f7ffcbf0bbc0"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "warehouses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_warehouses_id"), "warehouses", ["id"], unique=False)
    op.create_index(op.f("ix_warehouses_code"), "warehouses", ["code"], unique=True)

    op.create_table(
        "inventory_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), nullable=False),
        sa.Column("transaction_type", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("reference_type", sa.String(), nullable=True),
        sa.Column("reference_id", sa.String(), nullable=True),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["warehouse_id"], ["warehouses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inventory_transactions_id"), "inventory_transactions", ["id"], unique=False)
    op.create_index(op.f("ix_inventory_transactions_product_id"), "inventory_transactions", ["product_id"], unique=False)
    op.create_index(op.f("ix_inventory_transactions_warehouse_id"), "inventory_transactions", ["warehouse_id"], unique=False)
    op.create_index(op.f("ix_inventory_transactions_transaction_type"), "inventory_transactions", ["transaction_type"], unique=False)
    op.create_index(op.f("ix_inventory_transactions_direction"), "inventory_transactions", ["direction"], unique=False)
    op.create_index(op.f("ix_inventory_transactions_reference_type"), "inventory_transactions", ["reference_type"], unique=False)
    op.create_index(op.f("ix_inventory_transactions_reference_id"), "inventory_transactions", ["reference_id"], unique=False)
    op.create_index(op.f("ix_inventory_transactions_created_at"), "inventory_transactions", ["created_at"], unique=False)

    op.create_table(
        "stock_reservations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("reference_type", sa.String(), nullable=True),
        sa.Column("reference_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["warehouse_id"], ["warehouses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stock_reservations_id"), "stock_reservations", ["id"], unique=False)
    op.create_index(op.f("ix_stock_reservations_product_id"), "stock_reservations", ["product_id"], unique=False)
    op.create_index(op.f("ix_stock_reservations_warehouse_id"), "stock_reservations", ["warehouse_id"], unique=False)
    op.create_index(op.f("ix_stock_reservations_status"), "stock_reservations", ["status"], unique=False)
    op.create_index(op.f("ix_stock_reservations_reference_type"), "stock_reservations", ["reference_type"], unique=False)
    op.create_index(op.f("ix_stock_reservations_reference_id"), "stock_reservations", ["reference_id"], unique=False)

    op.create_table(
        "stock_transfers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("from_warehouse_id", sa.Integer(), nullable=False),
        sa.Column("to_warehouse_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["from_warehouse_id"], ["warehouses.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["to_warehouse_id"], ["warehouses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stock_transfers_id"), "stock_transfers", ["id"], unique=False)
    op.create_index(op.f("ix_stock_transfers_product_id"), "stock_transfers", ["product_id"], unique=False)
    op.create_index(op.f("ix_stock_transfers_from_warehouse_id"), "stock_transfers", ["from_warehouse_id"], unique=False)
    op.create_index(op.f("ix_stock_transfers_to_warehouse_id"), "stock_transfers", ["to_warehouse_id"], unique=False)
    op.create_index(op.f("ix_stock_transfers_status"), "stock_transfers", ["status"], unique=False)

    bind = op.get_bind()
    metadata = sa.MetaData()
    warehouses = sa.Table("warehouses", metadata, autoload_with=bind)
    products = sa.Table("products", metadata, autoload_with=bind)
    inventory_transactions = sa.Table("inventory_transactions", metadata, autoload_with=bind)

    default_warehouse_id = bind.execute(
        sa.select(warehouses.c.id).where(warehouses.c.code == "MAIN")
    ).scalar_one_or_none()
    if default_warehouse_id is None:
        result = bind.execute(
            sa.insert(warehouses).values(
                name="Main Warehouse",
                code="MAIN",
                address=None,
                is_active=True,
            )
        )
        default_warehouse_id = result.inserted_primary_key[0]

    # Backfill current_stock into the ledger once. The legacy column remains for compatibility,
    # but real inventory now comes from inventory_transactions.
    product_rows = bind.execute(
        sa.select(products.c.id, products.c.current_stock).where(products.c.current_stock > 0)
    ).fetchall()
    for product_id, current_stock in product_rows:
        already_backfilled = bind.execute(
            sa.select(inventory_transactions.c.id).where(
                inventory_transactions.c.product_id == product_id,
                inventory_transactions.c.reference_type == "BACKFILL_CURRENT_STOCK",
                inventory_transactions.c.reference_id == str(product_id),
            )
        ).scalar_one_or_none()
        if already_backfilled is not None:
            continue

        bind.execute(
            sa.insert(inventory_transactions).values(
                product_id=product_id,
                warehouse_id=default_warehouse_id,
                transaction_type="ADJUSTMENT_POSITIVE",
                quantity=current_stock,
                direction="IN",
                reference_type="BACKFILL_CURRENT_STOCK",
                reference_id=str(product_id),
                reason="Backfilled legacy current_stock into inventory ledger",
            )
        )


def downgrade():
    op.drop_index(op.f("ix_stock_transfers_status"), table_name="stock_transfers")
    op.drop_index(op.f("ix_stock_transfers_to_warehouse_id"), table_name="stock_transfers")
    op.drop_index(op.f("ix_stock_transfers_from_warehouse_id"), table_name="stock_transfers")
    op.drop_index(op.f("ix_stock_transfers_product_id"), table_name="stock_transfers")
    op.drop_index(op.f("ix_stock_transfers_id"), table_name="stock_transfers")
    op.drop_table("stock_transfers")

    op.drop_index(op.f("ix_stock_reservations_reference_id"), table_name="stock_reservations")
    op.drop_index(op.f("ix_stock_reservations_reference_type"), table_name="stock_reservations")
    op.drop_index(op.f("ix_stock_reservations_status"), table_name="stock_reservations")
    op.drop_index(op.f("ix_stock_reservations_warehouse_id"), table_name="stock_reservations")
    op.drop_index(op.f("ix_stock_reservations_product_id"), table_name="stock_reservations")
    op.drop_index(op.f("ix_stock_reservations_id"), table_name="stock_reservations")
    op.drop_table("stock_reservations")

    op.drop_index(op.f("ix_inventory_transactions_created_at"), table_name="inventory_transactions")
    op.drop_index(op.f("ix_inventory_transactions_reference_id"), table_name="inventory_transactions")
    op.drop_index(op.f("ix_inventory_transactions_reference_type"), table_name="inventory_transactions")
    op.drop_index(op.f("ix_inventory_transactions_direction"), table_name="inventory_transactions")
    op.drop_index(op.f("ix_inventory_transactions_transaction_type"), table_name="inventory_transactions")
    op.drop_index(op.f("ix_inventory_transactions_warehouse_id"), table_name="inventory_transactions")
    op.drop_index(op.f("ix_inventory_transactions_product_id"), table_name="inventory_transactions")
    op.drop_index(op.f("ix_inventory_transactions_id"), table_name="inventory_transactions")
    op.drop_table("inventory_transactions")

    op.drop_index(op.f("ix_warehouses_code"), table_name="warehouses")
    op.drop_index(op.f("ix_warehouses_id"), table_name="warehouses")
    op.drop_table("warehouses")
