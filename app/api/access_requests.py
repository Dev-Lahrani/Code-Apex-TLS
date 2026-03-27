import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import AccessRequest, ActivityLog, Document, DocumentParticipant, RequestStatus
from app.schemas import AccessRequestCreate, AccessRequestRead

router = APIRouter(tags=["access"], prefix="")


@router.post("/request-access", response_model=AccessRequestRead, status_code=status.HTTP_201_CREATED)
async def request_access(
    payload: AccessRequestCreate,
    session: AsyncSession = Depends(get_session),
) -> AccessRequestRead:
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
    participant = participant_row.scalars().first()
    if not participant:
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

    activity_log = ActivityLog(
        document_id=payload.document_id,
        user_id=payload.requester_id,
        action="access_request_created",
        hash=uuid.uuid4().hex,
        tx_hash=None,
        details=str(access_request.id),
    )
    session.add(activity_log)

    await session.commit()
    await session.refresh(access_request)

    return access_request
