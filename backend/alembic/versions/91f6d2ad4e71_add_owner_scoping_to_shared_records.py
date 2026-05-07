"""add owner scoping to shared records

Revision ID: 91f6d2ad4e71
Revises: e38c4cb4b921
Create Date: 2026-05-07 10:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "91f6d2ad4e71"
down_revision = "e38c4cb4b921"
branch_labels = None
depends_on = None


def upgrade() -> None:
    tables = [
        "warehouses",
        "customers",
        "suppliers",
        "sales_orders",
        "purchase_orders",
        "return_orders",
        "shipments",
        "routes",
        "ports_or_nodes",
    ]
    for table in tables:
        op.add_column(table, sa.Column("owner_id", sa.Integer(), nullable=True))
        op.create_index(op.f(f"ix_{table}_owner_id"), table, ["owner_id"], unique=False)
        op.create_foreign_key(
            f"fk_{table}_owner_id_users",
            table,
            "users",
            ["owner_id"],
            ["id"],
        )

    op.execute(
        """
        UPDATE warehouses w
        SET owner_id = scoped.owner_id
        FROM (
            SELECT it.warehouse_id, MIN(p.owner_id) AS owner_id
            FROM inventory_transactions it
            JOIN products p ON p.id = it.product_id
            GROUP BY it.warehouse_id
        ) AS scoped
        WHERE w.id = scoped.warehouse_id AND w.owner_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE suppliers s
        SET owner_id = scoped.owner_id
        FROM (
            SELECT supplier AS supplier_name, MIN(owner_id) AS owner_id
            FROM products
            WHERE supplier IS NOT NULL AND supplier <> ''
            GROUP BY supplier
        ) AS scoped
        WHERE s.name = scoped.supplier_name AND s.owner_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE sales_orders so
        SET owner_id = scoped.owner_id
        FROM (
            SELECT soi.sales_order_id, MIN(p.owner_id) AS owner_id
            FROM sales_order_items soi
            JOIN products p ON p.id = soi.product_id
            GROUP BY soi.sales_order_id
        ) AS scoped
        WHERE so.id = scoped.sales_order_id AND so.owner_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE purchase_orders po
        SET owner_id = scoped.owner_id
        FROM (
            SELECT poi.purchase_order_id, MIN(p.owner_id) AS owner_id
            FROM purchase_order_items poi
            JOIN products p ON p.id = poi.product_id
            GROUP BY poi.purchase_order_id
        ) AS scoped
        WHERE po.id = scoped.purchase_order_id AND po.owner_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE return_orders ro
        SET owner_id = scoped.owner_id
        FROM (
            SELECT roi.return_order_id, MIN(p.owner_id) AS owner_id
            FROM return_order_items roi
            JOIN products p ON p.id = roi.product_id
            GROUP BY roi.return_order_id
        ) AS scoped
        WHERE ro.id = scoped.return_order_id AND ro.owner_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE shipments sh
        SET owner_id = scoped.owner_id
        FROM (
            SELECT id, owner_id
            FROM (
                SELECT sh.id,
                       CASE
                         WHEN sh.related_type = 'PURCHASE_ORDER' THEN po.owner_id
                         WHEN sh.related_type = 'SALES_ORDER' THEN so.owner_id
                         ELSE NULL
                       END AS owner_id
                FROM shipments sh
                LEFT JOIN purchase_orders po
                  ON sh.related_type = 'PURCHASE_ORDER' AND po.id::text = sh.related_id
                LEFT JOIN sales_orders so
                  ON sh.related_type = 'SALES_ORDER' AND so.id::text = sh.related_id
            ) resolved
            WHERE owner_id IS NOT NULL
        ) AS scoped
        WHERE sh.id = scoped.id AND sh.owner_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE customers c
        SET owner_id = scoped.owner_id
        FROM (
            SELECT customer_id, MIN(owner_id) AS owner_id
            FROM sales_orders
            WHERE customer_id IS NOT NULL AND owner_id IS NOT NULL
            GROUP BY customer_id
        ) AS scoped
        WHERE c.id = scoped.customer_id AND c.owner_id IS NULL
        """
    )


def downgrade() -> None:
    tables = [
        "ports_or_nodes",
        "routes",
        "shipments",
        "return_orders",
        "purchase_orders",
        "sales_orders",
        "suppliers",
        "customers",
        "warehouses",
    ]
    for table in tables:
        op.drop_constraint(f"fk_{table}_owner_id_users", table, type_="foreignkey")
        op.drop_index(op.f(f"ix_{table}_owner_id"), table_name=table)
        op.drop_column(table, "owner_id")
