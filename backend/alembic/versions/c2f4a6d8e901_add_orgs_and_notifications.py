"""add organizations and notifications

Revision ID: c2f4a6d8e901
Revises: b1d6d7f8c2a1
Create Date: 2026-05-06 22:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c2f4a6d8e901"
down_revision = "b1d6d7f8c2a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_tables = set(inspector.get_table_names())

    def has_column(table_name: str, column_name: str) -> bool:
        return any(column["name"] == column_name for column in inspector.get_columns(table_name))

    def has_index(table_name: str, index_name: str) -> bool:
        return any(index["name"] == index_name for index in inspector.get_indexes(table_name))

    def has_foreign_key(table_name: str, fk_name: str) -> bool:
        return any(fk["name"] == fk_name for fk in inspector.get_foreign_keys(table_name))

    if "organizations" not in existing_tables:
        op.create_table(
            "organizations",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("slug", sa.String(), nullable=False),
            sa.Column("subscription_plan", sa.String(), nullable=False, server_default="FREE"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)

    if not has_index("organizations", op.f("ix_organizations_id")):
        op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)
    if not has_index("organizations", op.f("ix_organizations_name")):
        op.create_index(op.f("ix_organizations_name"), "organizations", ["name"], unique=False)
    if not has_index("organizations", op.f("ix_organizations_slug")):
        op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True)
    if not has_index("organizations", op.f("ix_organizations_subscription_plan")):
        op.create_index(op.f("ix_organizations_subscription_plan"), "organizations", ["subscription_plan"], unique=False)

    if not has_column("users", "organization_id"):
        op.add_column("users", sa.Column("organization_id", sa.Integer(), nullable=True))
        inspector = sa.inspect(bind)
    if not has_index("users", op.f("ix_users_organization_id")):
        op.create_index(op.f("ix_users_organization_id"), "users", ["organization_id"], unique=False)
    if not has_foreign_key("users", "fk_users_organization_id"):
        op.create_foreign_key("fk_users_organization_id", "users", "organizations", ["organization_id"], ["id"])

    if "notifications" not in existing_tables:
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("severity", sa.String(), nullable=False, server_default="info"),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("data", sa.JSON(), nullable=True),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())
    if "notifications" in existing_tables:
        if not has_index("notifications", op.f("ix_notifications_id")):
            op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
        if not has_index("notifications", op.f("ix_notifications_user_id")):
            op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
        if not has_index("notifications", op.f("ix_notifications_category")):
            op.create_index(op.f("ix_notifications_category"), "notifications", ["category"], unique=False)
        if not has_index("notifications", op.f("ix_notifications_severity")):
            op.create_index(op.f("ix_notifications_severity"), "notifications", ["severity"], unique=False)
        if not has_index("notifications", op.f("ix_notifications_created_at")):
            op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"], unique=False)
        if not has_index("notifications", op.f("ix_notifications_read_at")):
            op.create_index(op.f("ix_notifications_read_at"), "notifications", ["read_at"], unique=False)

    if "notification_preferences" not in existing_tables:
        op.create_table(
            "notification_preferences",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())
    if "notification_preferences" in existing_tables:
        if not has_index("notification_preferences", op.f("ix_notification_preferences_id")):
            op.create_index(op.f("ix_notification_preferences_id"), "notification_preferences", ["id"], unique=False)
        if not has_index("notification_preferences", op.f("ix_notification_preferences_user_id")):
            op.create_index(op.f("ix_notification_preferences_user_id"), "notification_preferences", ["user_id"], unique=False)
        if not has_index("notification_preferences", op.f("ix_notification_preferences_category")):
            op.create_index(op.f("ix_notification_preferences_category"), "notification_preferences", ["category"], unique=False)

    if "user_devices" not in existing_tables:
        op.create_table(
            "user_devices",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("platform", sa.String(), nullable=False),
            sa.Column("push_token", sa.String(), nullable=False),
            sa.Column("app_version", sa.String(), nullable=True),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())
    if "user_devices" in existing_tables:
        if not has_index("user_devices", op.f("ix_user_devices_id")):
            op.create_index(op.f("ix_user_devices_id"), "user_devices", ["id"], unique=False)
        if not has_index("user_devices", op.f("ix_user_devices_user_id")):
            op.create_index(op.f("ix_user_devices_user_id"), "user_devices", ["user_id"], unique=False)
        if not has_index("user_devices", op.f("ix_user_devices_platform")):
            op.create_index(op.f("ix_user_devices_platform"), "user_devices", ["platform"], unique=False)
        if not has_index("user_devices", op.f("ix_user_devices_push_token")):
            op.create_index(op.f("ix_user_devices_push_token"), "user_devices", ["push_token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_devices_push_token"), table_name="user_devices")
    op.drop_index(op.f("ix_user_devices_platform"), table_name="user_devices")
    op.drop_index(op.f("ix_user_devices_user_id"), table_name="user_devices")
    op.drop_index(op.f("ix_user_devices_id"), table_name="user_devices")
    op.drop_table("user_devices")

    op.drop_index(op.f("ix_notification_preferences_category"), table_name="notification_preferences")
    op.drop_index(op.f("ix_notification_preferences_user_id"), table_name="notification_preferences")
    op.drop_index(op.f("ix_notification_preferences_id"), table_name="notification_preferences")
    op.drop_table("notification_preferences")

    op.drop_index(op.f("ix_notifications_read_at"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_severity"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_category"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")

    op.drop_constraint("fk_users_organization_id", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_organization_id"), table_name="users")
    op.drop_column("users", "organization_id")

    op.drop_index(op.f("ix_organizations_subscription_plan"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_name"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_id"), table_name="organizations")
    op.drop_table("organizations")
