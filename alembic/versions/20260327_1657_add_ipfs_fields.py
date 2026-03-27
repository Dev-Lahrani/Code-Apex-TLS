"""add ipfs metadata to documents"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260327_1657"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("ipfs_cid", sa.String(length=255), nullable=True))
    op.add_column("documents", sa.Column("content_hash", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "content_hash")
    op.drop_column("documents", "ipfs_cid")
