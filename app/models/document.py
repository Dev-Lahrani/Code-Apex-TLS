from __future__ import annotations

import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Float,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ThresholdType(str, enum.Enum):
    fixed = "fixed"
    percentage = "percentage"
    smart = "smart"


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint("threshold > 0", name="ck_documents_threshold_positive"),
        Index("ix_documents_owner_id", "owner_id"),
        Index("ix_documents_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_content: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ipfs_cid: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    anomaly_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    anomaly_label: Mapped[str | None] = mapped_column(String(32), nullable=True)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    threshold_type: Mapped[ThresholdType] = mapped_column(
        Enum(ThresholdType, name="threshold_type"),
        nullable=False,
        default=ThresholdType.fixed,
        server_default=ThresholdType.fixed.value,
    )
    threshold_value: Mapped[float] = mapped_column(
        Float,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    owner: Mapped["User"] = relationship(back_populates="documents")
    participants: Mapped[list["DocumentParticipant"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    access_requests: Mapped[list["AccessRequest"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    activity_logs: Mapped[list["ActivityLog"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
