"""add free api integration tables

Revision ID: e38c4cb4b921
Revises: d4a8b9f21c30
Create Date: 2026-05-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "e38c4cb4b921"
down_revision = "d4a8b9f21c30"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "external_api_providers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("provider_type", sa.String(), nullable=False),
        sa.Column("required_plan", sa.String(), nullable=False, server_default="FREE"),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_live_capable", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_external_api_providers_id"), "external_api_providers", ["id"], unique=False)
    op.create_index(op.f("ix_external_api_providers_key"), "external_api_providers", ["key"], unique=True)

    op.create_table(
        "external_api_connections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("provider_key", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="NOT_CONFIGURED"),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_external_api_connections_id"), "external_api_connections", ["id"], unique=False)
    op.create_index(op.f("ix_external_api_connections_organization_id"), "external_api_connections", ["organization_id"], unique=False)
    op.create_index(op.f("ix_external_api_connections_user_id"), "external_api_connections", ["user_id"], unique=False)
    op.create_index(op.f("ix_external_api_connections_provider_key"), "external_api_connections", ["provider_key"], unique=False)

    op.create_table(
        "external_api_cache",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("provider_key", sa.String(), nullable=False),
        sa.Column("cache_key", sa.String(), nullable=False),
        sa.Column("response_json", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_external_api_cache_id"), "external_api_cache", ["id"], unique=False)
    op.create_index(op.f("ix_external_api_cache_provider_key"), "external_api_cache", ["provider_key"], unique=False)
    op.create_index(op.f("ix_external_api_cache_cache_key"), "external_api_cache", ["cache_key"], unique=True)
    op.create_index(op.f("ix_external_api_cache_expires_at"), "external_api_cache", ["expires_at"], unique=False)

    op.create_table(
        "external_api_usage_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("provider_key", sa.String(), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("endpoint", sa.String(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("cache_hit", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("plan", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_external_api_usage_logs_id"), "external_api_usage_logs", ["id"], unique=False)
    op.create_index(op.f("ix_external_api_usage_logs_provider_key"), "external_api_usage_logs", ["provider_key"], unique=False)
    op.create_index(op.f("ix_external_api_usage_logs_organization_id"), "external_api_usage_logs", ["organization_id"], unique=False)
    op.create_index(op.f("ix_external_api_usage_logs_user_id"), "external_api_usage_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_external_api_usage_logs_created_at"), "external_api_usage_logs", ["created_at"], unique=False)

    op.create_table(
        "warehouse_directory_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("provider_key", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=False, server_default="MY"),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("warehouse_type", sa.String(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_preview", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_warehouse_directory_records_id"), "warehouse_directory_records", ["id"], unique=False)
    op.create_index(op.f("ix_warehouse_directory_records_source"), "warehouse_directory_records", ["source"], unique=False)
    op.create_index(op.f("ix_warehouse_directory_records_name"), "warehouse_directory_records", ["name"], unique=False)
    op.create_index(op.f("ix_warehouse_directory_records_provider_key"), "warehouse_directory_records", ["provider_key"], unique=False)
    op.create_index(op.f("ix_warehouse_directory_records_country"), "warehouse_directory_records", ["country"], unique=False)
    op.create_index(op.f("ix_warehouse_directory_records_state"), "warehouse_directory_records", ["state"], unique=False)
    op.create_index(op.f("ix_warehouse_directory_records_city"), "warehouse_directory_records", ["city"], unique=False)
    op.create_index(op.f("ix_warehouse_directory_records_warehouse_type"), "warehouse_directory_records", ["warehouse_type"], unique=False)

    op.create_table(
        "market_demand_signals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("country", sa.String(), nullable=False, server_default="MY"),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("week_end", sa.Date(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("data_type", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("keyword_or_product", sa.String(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("units_sold", sa.Integer(), nullable=True),
        sa.Column("revenue", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(), nullable=False, server_default="MYR"),
        sa.Column("confidence", sa.String(), nullable=False, server_default="LOW"),
        sa.Column("is_live", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_estimated", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_market_demand_signals_id"), "market_demand_signals", ["id"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_country"), "market_demand_signals", ["country"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_week_start"), "market_demand_signals", ["week_start"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_week_end"), "market_demand_signals", ["week_end"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_source"), "market_demand_signals", ["source"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_data_type"), "market_demand_signals", ["data_type"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_category"), "market_demand_signals", ["category"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_keyword_or_product"), "market_demand_signals", ["keyword_or_product"], unique=False)
    op.create_index(op.f("ix_market_demand_signals_confidence"), "market_demand_signals", ["confidence"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_market_demand_signals_confidence"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_keyword_or_product"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_category"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_data_type"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_source"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_week_end"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_week_start"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_country"), table_name="market_demand_signals")
    op.drop_index(op.f("ix_market_demand_signals_id"), table_name="market_demand_signals")
    op.drop_table("market_demand_signals")

    op.drop_index(op.f("ix_warehouse_directory_records_warehouse_type"), table_name="warehouse_directory_records")
    op.drop_index(op.f("ix_warehouse_directory_records_city"), table_name="warehouse_directory_records")
    op.drop_index(op.f("ix_warehouse_directory_records_state"), table_name="warehouse_directory_records")
    op.drop_index(op.f("ix_warehouse_directory_records_country"), table_name="warehouse_directory_records")
    op.drop_index(op.f("ix_warehouse_directory_records_provider_key"), table_name="warehouse_directory_records")
    op.drop_index(op.f("ix_warehouse_directory_records_name"), table_name="warehouse_directory_records")
    op.drop_index(op.f("ix_warehouse_directory_records_source"), table_name="warehouse_directory_records")
    op.drop_index(op.f("ix_warehouse_directory_records_id"), table_name="warehouse_directory_records")
    op.drop_table("warehouse_directory_records")

    op.drop_index(op.f("ix_external_api_usage_logs_created_at"), table_name="external_api_usage_logs")
    op.drop_index(op.f("ix_external_api_usage_logs_user_id"), table_name="external_api_usage_logs")
    op.drop_index(op.f("ix_external_api_usage_logs_organization_id"), table_name="external_api_usage_logs")
    op.drop_index(op.f("ix_external_api_usage_logs_provider_key"), table_name="external_api_usage_logs")
    op.drop_index(op.f("ix_external_api_usage_logs_id"), table_name="external_api_usage_logs")
    op.drop_table("external_api_usage_logs")

    op.drop_index(op.f("ix_external_api_cache_expires_at"), table_name="external_api_cache")
    op.drop_index(op.f("ix_external_api_cache_cache_key"), table_name="external_api_cache")
    op.drop_index(op.f("ix_external_api_cache_provider_key"), table_name="external_api_cache")
    op.drop_index(op.f("ix_external_api_cache_id"), table_name="external_api_cache")
    op.drop_table("external_api_cache")

    op.drop_index(op.f("ix_external_api_connections_provider_key"), table_name="external_api_connections")
    op.drop_index(op.f("ix_external_api_connections_user_id"), table_name="external_api_connections")
    op.drop_index(op.f("ix_external_api_connections_organization_id"), table_name="external_api_connections")
    op.drop_index(op.f("ix_external_api_connections_id"), table_name="external_api_connections")
    op.drop_table("external_api_connections")

    op.drop_index(op.f("ix_external_api_providers_key"), table_name="external_api_providers")
    op.drop_index(op.f("ix_external_api_providers_id"), table_name="external_api_providers")
    op.drop_table("external_api_providers")
