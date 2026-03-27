from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AccessRequest, Document, DocumentParticipant, RequestStatus
from app.schemas import AccessRequestCreate
from app.services.logging_service import log_action


async def request_access(*, session: AsyncSession, payload: AccessRequestCreate) -> AccessRequest:
    document = await session.get(Document, payload.document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    participant_row = await session.execute(
        select(DocumentParticipant).where(
            and_(
                DocumentParticipant.document_id == payload.document_id,
                DocumentParticipant.user_id == payload.requester_id,
            )
        )
    )
    if not participant_row.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only participants can request access",
        )

    existing_request = await session.execute(
        select(AccessRequest).where(
            and_(
                AccessRequest.document_id == payload.document_id,
                AccessRequest.requester_id == payload.requester_id,
                AccessRequest.status == RequestStatus.pending,
            )
        )
    )
    if existing_request.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending access request already exists",
        )

    access_request = AccessRequest(
        document_id=payload.document_id,
        requester_id=payload.requester_id,
        status=RequestStatus.pending,
    )
    session.add(access_request)
    await session.flush()

    await log_action(
        session=session,
        document_id=payload.document_id,
        user_id=payload.requester_id,
        action="User requested access",
        details=str(access_request.id),
    )

    await session.commit()
    await session.refresh(access_request)
    return access_request
