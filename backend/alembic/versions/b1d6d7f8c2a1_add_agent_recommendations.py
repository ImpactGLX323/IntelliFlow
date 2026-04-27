"""add agent recommendations

Revision ID: b1d6d7f8c2a1
Revises: 7a9c4e21d5f0
Create Date: 2026-04-27 16:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b1d6d7f8c2a1"
down_revision = "7a9c4e21d5f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_recommendations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_name", sa.String(), nullable=False),
        sa.Column("domain", sa.String(), nullable=False),
        sa.Column("recommendation_type", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("source_target", sa.String(), nullable=True),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agent_recommendations_id"), "agent_recommendations", ["id"], unique=False)
    op.create_index(op.f("ix_agent_recommendations_job_name"), "agent_recommendations", ["job_name"], unique=False)
    op.create_index(op.f("ix_agent_recommendations_domain"), "agent_recommendations", ["domain"], unique=False)
    op.create_index(op.f("ix_agent_recommendations_recommendation_type"), "agent_recommendations", ["recommendation_type"], unique=False)
    op.create_index(op.f("ix_agent_recommendations_severity"), "agent_recommendations", ["severity"], unique=False)
    op.create_index(op.f("ix_agent_recommendations_status"), "agent_recommendations", ["status"], unique=False)
    op.create_index(op.f("ix_agent_recommendations_owner_id"), "agent_recommendations", ["owner_id"], unique=False)
    op.create_index(op.f("ix_agent_recommendations_created_at"), "agent_recommendations", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_agent_recommendations_created_at"), table_name="agent_recommendations")
    op.drop_index(op.f("ix_agent_recommendations_owner_id"), table_name="agent_recommendations")
    op.drop_index(op.f("ix_agent_recommendations_status"), table_name="agent_recommendations")
    op.drop_index(op.f("ix_agent_recommendations_severity"), table_name="agent_recommendations")
    op.drop_index(op.f("ix_agent_recommendations_recommendation_type"), table_name="agent_recommendations")
    op.drop_index(op.f("ix_agent_recommendations_domain"), table_name="agent_recommendations")
    op.drop_index(op.f("ix_agent_recommendations_job_name"), table_name="agent_recommendations")
    op.drop_index(op.f("ix_agent_recommendations_id"), table_name="agent_recommendations")
    op.drop_table("agent_recommendations")
