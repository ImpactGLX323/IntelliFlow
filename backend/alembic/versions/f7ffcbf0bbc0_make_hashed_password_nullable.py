"""make hashed_password nullable

Revision ID: f7ffcbf0bbc0
Revises: 8c740a54cab7
Create Date: 2026-02-12 15:25:48.647166

"""
from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = 'f7ffcbf0bbc0'
down_revision = '8c740a54cab7'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('users', 'hashed_password', existing_type=sa.String(), nullable=True)


def downgrade():
    op.alter_column('users', 'hashed_password', existing_type=sa.String(), nullable=False)
