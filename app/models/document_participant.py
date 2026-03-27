from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DocumentParticipant(Base):
    __tablename__ = "document_participants"
    __table_args__ = (
        UniqueConstraint("document_id", "user_id", name="uq_document_participants_document_user"),
        Index("ix_document_participants_document_id", "document_id"),
        Index("ix_document_participants_user_id", "user_id"),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    document: Mapped["Document"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship(back_populates="document_participations")
