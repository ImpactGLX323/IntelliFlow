"""add operational modules

Revision ID: 7a9c4e21d5f0
Revises: 3d2b5a7f9c11
Create Date: 2026-04-27 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "7a9c4e21d5f0"
down_revision = "3d2b5a7f9c11"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_customers_id", "customers", ["id"])
    op.create_index("ix_customers_name", "customers", ["name"])
    op.create_index("ix_customers_email", "customers", ["email"])

    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("lead_time_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_suppliers_id", "suppliers", ["id"])
    op.create_index("ix_suppliers_name", "suppliers", ["name"])
    op.create_index("ix_suppliers_email", "suppliers", ["email"])

    op.create_table(
        "sales_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_number", sa.String(), nullable=False, unique=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("order_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expected_ship_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_sales_orders_id", "sales_orders", ["id"])
    op.create_index("ix_sales_orders_order_number", "sales_orders", ["order_number"], unique=True)
    op.create_index("ix_sales_orders_customer_id", "sales_orders", ["customer_id"])
    op.create_index("ix_sales_orders_status", "sales_orders", ["status"])

    op.create_table(
        "sales_order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sales_order_id", sa.Integer(), sa.ForeignKey("sales_orders.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("quantity_ordered", sa.Integer(), nullable=False),
        sa.Column("quantity_reserved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quantity_fulfilled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unit_price", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_sales_order_items_id", "sales_order_items", ["id"])
    op.create_index("ix_sales_order_items_sales_order_id", "sales_order_items", ["sales_order_id"])
    op.create_index("ix_sales_order_items_product_id", "sales_order_items", ["product_id"])
    op.create_index("ix_sales_order_items_warehouse_id", "sales_order_items", ["warehouse_id"])

    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("po_number", sa.String(), nullable=False, unique=True),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("order_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expected_arrival_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_purchase_orders_id", "purchase_orders", ["id"])
    op.create_index("ix_purchase_orders_po_number", "purchase_orders", ["po_number"], unique=True)
    op.create_index("ix_purchase_orders_supplier_id", "purchase_orders", ["supplier_id"])
    op.create_index("ix_purchase_orders_status", "purchase_orders", ["status"])

    op.create_table(
        "purchase_order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("purchase_order_id", sa.Integer(), sa.ForeignKey("purchase_orders.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("quantity_ordered", sa.Integer(), nullable=False),
        sa.Column("quantity_received", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unit_cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_purchase_order_items_id", "purchase_order_items", ["id"])
    op.create_index("ix_purchase_order_items_purchase_order_id", "purchase_order_items", ["purchase_order_id"])
    op.create_index("ix_purchase_order_items_product_id", "purchase_order_items", ["product_id"])
    op.create_index("ix_purchase_order_items_warehouse_id", "purchase_order_items", ["warehouse_id"])

    op.create_table(
        "reorder_points",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("minimum_quantity", sa.Integer(), nullable=False),
        sa.Column("reorder_quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_reorder_points_id", "reorder_points", ["id"])
    op.create_index("ix_reorder_points_product_id", "reorder_points", ["product_id"])
    op.create_index("ix_reorder_points_warehouse_id", "reorder_points", ["warehouse_id"])

    op.create_table(
        "warehouse_locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=True),
        sa.Column("location_type", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_warehouse_locations_id", "warehouse_locations", ["id"])
    op.create_index("ix_warehouse_locations_warehouse_id", "warehouse_locations", ["warehouse_id"])
    op.create_index("ix_warehouse_locations_code", "warehouse_locations", ["code"])
    op.create_index("ix_warehouse_locations_location_type", "warehouse_locations", ["location_type"])

    op.create_table(
        "pick_lists",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sales_order_id", sa.Integer(), sa.ForeignKey("sales_orders.id"), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_pick_lists_id", "pick_lists", ["id"])
    op.create_index("ix_pick_lists_sales_order_id", "pick_lists", ["sales_order_id"])
    op.create_index("ix_pick_lists_status", "pick_lists", ["status"])

    op.create_table(
        "pick_list_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pick_list_id", sa.Integer(), sa.ForeignKey("pick_lists.id"), nullable=False),
        sa.Column("sales_order_item_id", sa.Integer(), sa.ForeignKey("sales_order_items.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("warehouse_location_id", sa.Integer(), sa.ForeignKey("warehouse_locations.id"), nullable=True),
        sa.Column("quantity_to_pick", sa.Integer(), nullable=False),
        sa.Column("quantity_picked", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_pick_list_items_id", "pick_list_items", ["id"])
    op.create_index("ix_pick_list_items_pick_list_id", "pick_list_items", ["pick_list_id"])
    op.create_index("ix_pick_list_items_sales_order_item_id", "pick_list_items", ["sales_order_item_id"])
    op.create_index("ix_pick_list_items_product_id", "pick_list_items", ["product_id"])
    op.create_index("ix_pick_list_items_warehouse_id", "pick_list_items", ["warehouse_id"])
    op.create_index("ix_pick_list_items_warehouse_location_id", "pick_list_items", ["warehouse_location_id"])

    op.create_table(
        "packing_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sales_order_id", sa.Integer(), sa.ForeignKey("sales_orders.id"), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("package_reference", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_packing_records_id", "packing_records", ["id"])
    op.create_index("ix_packing_records_sales_order_id", "packing_records", ["sales_order_id"])
    op.create_index("ix_packing_records_status", "packing_records", ["status"])
    op.create_index("ix_packing_records_package_reference", "packing_records", ["package_reference"])

    op.create_table(
        "cycle_counts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_cycle_counts_id", "cycle_counts", ["id"])
    op.create_index("ix_cycle_counts_warehouse_id", "cycle_counts", ["warehouse_id"])
    op.create_index("ix_cycle_counts_status", "cycle_counts", ["status"])

    op.create_table(
        "cycle_count_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cycle_count_id", sa.Integer(), sa.ForeignKey("cycle_counts.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_location_id", sa.Integer(), sa.ForeignKey("warehouse_locations.id"), nullable=True),
        sa.Column("expected_quantity", sa.Integer(), nullable=False),
        sa.Column("counted_quantity", sa.Integer(), nullable=True),
        sa.Column("variance", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_cycle_count_items_id", "cycle_count_items", ["id"])
    op.create_index("ix_cycle_count_items_cycle_count_id", "cycle_count_items", ["cycle_count_id"])
    op.create_index("ix_cycle_count_items_product_id", "cycle_count_items", ["product_id"])
    op.create_index("ix_cycle_count_items_warehouse_location_id", "cycle_count_items", ["warehouse_location_id"])

    op.create_table(
        "return_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("return_number", sa.String(), nullable=False, unique=True),
        sa.Column("sales_order_id", sa.Integer(), sa.ForeignKey("sales_orders.id"), nullable=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("return_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("refund_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("replacement_cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_return_orders_id", "return_orders", ["id"])
    op.create_index("ix_return_orders_return_number", "return_orders", ["return_number"], unique=True)
    op.create_index("ix_return_orders_sales_order_id", "return_orders", ["sales_order_id"])
    op.create_index("ix_return_orders_customer_id", "return_orders", ["customer_id"])
    op.create_index("ix_return_orders_status", "return_orders", ["status"])

    op.create_table(
        "return_order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("return_order_id", sa.Integer(), sa.ForeignKey("return_orders.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("return_reason", sa.String(), nullable=False),
        sa.Column("condition", sa.String(), nullable=False),
        sa.Column("refund_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("replacement_cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("carrier_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_return_order_items_id", "return_order_items", ["id"])
    op.create_index("ix_return_order_items_return_order_id", "return_order_items", ["return_order_id"])
    op.create_index("ix_return_order_items_product_id", "return_order_items", ["product_id"])
    op.create_index("ix_return_order_items_warehouse_id", "return_order_items", ["warehouse_id"])
    op.create_index("ix_return_order_items_return_reason", "return_order_items", ["return_reason"])
    op.create_index("ix_return_order_items_condition", "return_order_items", ["condition"])
    op.create_index("ix_return_order_items_supplier_id", "return_order_items", ["supplier_id"])

    op.create_table(
        "shipments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("shipment_number", sa.String(), nullable=False, unique=True),
        sa.Column("related_type", sa.String(), nullable=True),
        sa.Column("related_id", sa.String(), nullable=True),
        sa.Column("carrier_name", sa.String(), nullable=True),
        sa.Column("tracking_number", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("origin", sa.String(), nullable=True),
        sa.Column("destination", sa.String(), nullable=True),
        sa.Column("estimated_arrival", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_arrival", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delay_reason", sa.Text(), nullable=True),
        sa.Column("customs_status", sa.String(), nullable=True),
        sa.Column("documents_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_shipments_id", "shipments", ["id"])
    op.create_index("ix_shipments_shipment_number", "shipments", ["shipment_number"], unique=True)
    op.create_index("ix_shipments_related_type", "shipments", ["related_type"])
    op.create_index("ix_shipments_related_id", "shipments", ["related_id"])
    op.create_index("ix_shipments_tracking_number", "shipments", ["tracking_number"])
    op.create_index("ix_shipments_status", "shipments", ["status"])

    op.create_table(
        "shipment_legs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("shipment_id", sa.Integer(), sa.ForeignKey("shipments.id"), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(), nullable=False),
        sa.Column("destination", sa.String(), nullable=False),
        sa.Column("transport_mode", sa.String(), nullable=False),
        sa.Column("carrier_name", sa.String(), nullable=True),
        sa.Column("vessel_or_flight_number", sa.String(), nullable=True),
        sa.Column("departure_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("arrival_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_shipment_legs_id", "shipment_legs", ["id"])
    op.create_index("ix_shipment_legs_shipment_id", "shipment_legs", ["shipment_id"])

    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("origin", sa.String(), nullable=False),
        sa.Column("destination", sa.String(), nullable=False),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("average_transit_days", sa.Integer(), nullable=True),
        sa.Column("risk_level", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_routes_id", "routes", ["id"])
    op.create_index("ix_routes_name", "routes", ["name"])
    op.create_index("ix_routes_mode", "routes", ["mode"])
    op.create_index("ix_routes_risk_level", "routes", ["risk_level"])

    op.create_table(
        "ports_or_nodes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("node_type", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ports_or_nodes_id", "ports_or_nodes", ["id"])
    op.create_index("ix_ports_or_nodes_code", "ports_or_nodes", ["code"])
    op.create_index("ix_ports_or_nodes_name", "ports_or_nodes", ["name"])
    op.create_index("ix_ports_or_nodes_node_type", "ports_or_nodes", ["node_type"])


def downgrade():
    for index_name, table_name in [
        ("ix_ports_or_nodes_node_type", "ports_or_nodes"),
        ("ix_ports_or_nodes_name", "ports_or_nodes"),
        ("ix_ports_or_nodes_code", "ports_or_nodes"),
        ("ix_ports_or_nodes_id", "ports_or_nodes"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("ports_or_nodes")

    for index_name, table_name in [
        ("ix_routes_risk_level", "routes"),
        ("ix_routes_mode", "routes"),
        ("ix_routes_name", "routes"),
        ("ix_routes_id", "routes"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("routes")

    for index_name, table_name in [
        ("ix_shipment_legs_shipment_id", "shipment_legs"),
        ("ix_shipment_legs_id", "shipment_legs"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("shipment_legs")

    for index_name, table_name in [
        ("ix_shipments_status", "shipments"),
        ("ix_shipments_tracking_number", "shipments"),
        ("ix_shipments_related_id", "shipments"),
        ("ix_shipments_related_type", "shipments"),
        ("ix_shipments_shipment_number", "shipments"),
        ("ix_shipments_id", "shipments"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("shipments")

    for index_name, table_name in [
        ("ix_return_order_items_supplier_id", "return_order_items"),
        ("ix_return_order_items_condition", "return_order_items"),
        ("ix_return_order_items_return_reason", "return_order_items"),
        ("ix_return_order_items_warehouse_id", "return_order_items"),
        ("ix_return_order_items_product_id", "return_order_items"),
        ("ix_return_order_items_return_order_id", "return_order_items"),
        ("ix_return_order_items_id", "return_order_items"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("return_order_items")

    for index_name, table_name in [
        ("ix_return_orders_status", "return_orders"),
        ("ix_return_orders_customer_id", "return_orders"),
        ("ix_return_orders_sales_order_id", "return_orders"),
        ("ix_return_orders_return_number", "return_orders"),
        ("ix_return_orders_id", "return_orders"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("return_orders")

    for index_name, table_name in [
        ("ix_cycle_count_items_warehouse_location_id", "cycle_count_items"),
        ("ix_cycle_count_items_product_id", "cycle_count_items"),
        ("ix_cycle_count_items_cycle_count_id", "cycle_count_items"),
        ("ix_cycle_count_items_id", "cycle_count_items"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("cycle_count_items")

    for index_name, table_name in [
        ("ix_cycle_counts_status", "cycle_counts"),
        ("ix_cycle_counts_warehouse_id", "cycle_counts"),
        ("ix_cycle_counts_id", "cycle_counts"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("cycle_counts")

    for index_name, table_name in [
        ("ix_packing_records_package_reference", "packing_records"),
        ("ix_packing_records_status", "packing_records"),
        ("ix_packing_records_sales_order_id", "packing_records"),
        ("ix_packing_records_id", "packing_records"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("packing_records")

    for index_name, table_name in [
        ("ix_pick_list_items_warehouse_location_id", "pick_list_items"),
        ("ix_pick_list_items_warehouse_id", "pick_list_items"),
        ("ix_pick_list_items_product_id", "pick_list_items"),
        ("ix_pick_list_items_sales_order_item_id", "pick_list_items"),
        ("ix_pick_list_items_pick_list_id", "pick_list_items"),
        ("ix_pick_list_items_id", "pick_list_items"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("pick_list_items")

    for index_name, table_name in [
        ("ix_pick_lists_status", "pick_lists"),
        ("ix_pick_lists_sales_order_id", "pick_lists"),
        ("ix_pick_lists_id", "pick_lists"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("pick_lists")

    for index_name, table_name in [
        ("ix_warehouse_locations_location_type", "warehouse_locations"),
        ("ix_warehouse_locations_code", "warehouse_locations"),
        ("ix_warehouse_locations_warehouse_id", "warehouse_locations"),
        ("ix_warehouse_locations_id", "warehouse_locations"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("warehouse_locations")

    for index_name, table_name in [
        ("ix_reorder_points_warehouse_id", "reorder_points"),
        ("ix_reorder_points_product_id", "reorder_points"),
        ("ix_reorder_points_id", "reorder_points"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("reorder_points")

    for index_name, table_name in [
        ("ix_purchase_order_items_warehouse_id", "purchase_order_items"),
        ("ix_purchase_order_items_product_id", "purchase_order_items"),
        ("ix_purchase_order_items_purchase_order_id", "purchase_order_items"),
        ("ix_purchase_order_items_id", "purchase_order_items"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("purchase_order_items")

    for index_name, table_name in [
        ("ix_purchase_orders_status", "purchase_orders"),
        ("ix_purchase_orders_supplier_id", "purchase_orders"),
        ("ix_purchase_orders_po_number", "purchase_orders"),
        ("ix_purchase_orders_id", "purchase_orders"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("purchase_orders")

    for index_name, table_name in [
        ("ix_sales_order_items_warehouse_id", "sales_order_items"),
        ("ix_sales_order_items_product_id", "sales_order_items"),
        ("ix_sales_order_items_sales_order_id", "sales_order_items"),
        ("ix_sales_order_items_id", "sales_order_items"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("sales_order_items")

    for index_name, table_name in [
        ("ix_sales_orders_status", "sales_orders"),
        ("ix_sales_orders_customer_id", "sales_orders"),
        ("ix_sales_orders_order_number", "sales_orders"),
        ("ix_sales_orders_id", "sales_orders"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("sales_orders")

    for index_name, table_name in [
        ("ix_suppliers_email", "suppliers"),
        ("ix_suppliers_name", "suppliers"),
        ("ix_suppliers_id", "suppliers"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("suppliers")

    for index_name, table_name in [
        ("ix_customers_email", "customers"),
        ("ix_customers_name", "customers"),
        ("ix_customers_id", "customers"),
    ]:
        op.drop_index(index_name, table_name=table_name)
    op.drop_table("customers")
