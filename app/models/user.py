from __future__ import annotations

import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    documents: Mapped[list["Document"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    document_participations: Mapped[list["DocumentParticipant"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    access_requests: Mapped[list["AccessRequest"]] = relationship(
        back_populates="requester",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    approvals: Mapped[list["Approval"]] = relationship(
        back_populates="approver",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    activity_logs: Mapped[list["ActivityLog"]] = relationship(
        back_populates="user",
        passive_deletes=True,
    )
