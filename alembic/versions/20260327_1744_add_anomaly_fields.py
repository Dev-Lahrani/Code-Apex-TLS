"""add anomaly fields to documents"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260327_1744"
down_revision = "20260327_1657"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("is_flagged", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("documents", sa.Column("anomaly_score", sa.Float(), nullable=True))
    op.add_column("documents", sa.Column("anomaly_label", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "anomaly_label")
    op.drop_column("documents", "anomaly_score")
    op.drop_column("documents", "is_flagged")
