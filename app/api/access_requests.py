import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models import (
    AccessRequest,
    ActivityLog,
    Approval,
    Document,
    DocumentParticipant,
    RequestStatus,
)
from app.schemas import AccessRequestCreate, AccessRequestRead, ApprovalCreate

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


@router.post("/approve", response_model=AccessRequestRead, status_code=status.HTTP_201_CREATED)
async def approve_request(
    payload: ApprovalCreate,
    session: AsyncSession = Depends(get_session),
) -> AccessRequestRead:
    access_request_result = await session.execute(
        select(AccessRequest)
        .options(selectinload(AccessRequest.approvals), selectinload(AccessRequest.document))
        .where(AccessRequest.id == payload.request_id)
    )
    access_request = access_request_result.scalars().first()
    if not access_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found",
        )

    if access_request.status == RequestStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request already approved",
        )

    if access_request.requester_id == payload.approver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requester cannot approve their own request",
        )

    participant_row = await session.execute(
        select(DocumentParticipant).where(
            and_(
                DocumentParticipant.document_id == access_request.document_id,
                DocumentParticipant.user_id == payload.approver_id,
            )
        )
    )
    participant = participant_row.scalars().first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only participants can approve",
        )

    existing_approval = await session.execute(
        select(Approval).where(
            and_(
                Approval.request_id == payload.request_id,
                Approval.approver_id == payload.approver_id,
            )
        )
    )
    if existing_approval.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Approval already recorded",
        )

    approval = Approval(
        request_id=payload.request_id,
        approver_id=payload.approver_id,
    )
    session.add(approval)

    activity_log = ActivityLog(
        document_id=access_request.document_id,
        user_id=payload.approver_id,
        action="access_request_approved",
        hash=uuid.uuid4().hex,
        tx_hash=None,
        details=str(payload.request_id),
    )
    session.add(activity_log)

    await session.flush()

    approvals_count = await session.scalar(
        select(func.count(Approval.id)).where(Approval.request_id == payload.request_id)
    )

    if approvals_count and approvals_count >= access_request.document.threshold:
        access_request.status = RequestStatus.approved

    await session.commit()
    await session.refresh(access_request)

    return access_request
