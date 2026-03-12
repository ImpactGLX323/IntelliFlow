"""add firebase_uid to users

Revision ID: 8c740a54cab7
Revises: f084c32500fb
Create Date: 2026-02-12 15:17:16.328802

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '8c740a54cab7'
down_revision = 'f084c32500fb'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('firebase_uid', sa.String(), nullable=True))
    op.create_index('ix_users_firebase_uid', 'users', ['firebase_uid'], unique=True)


def downgrade():
    op.drop_index('ix_users_firebase_uid', table_name='users')
    op.drop_column('users', 'firebase_uid')
