from __future__ import annotations

from typing import Iterable, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import AccessRequest, Approval, DocumentParticipant, RequestStatus
from app.services.logging_service import log_action
from app.utils import key_sharing_service


async def approve_request(*, session: AsyncSession, request_id, approver_id) -> AccessRequest:
    access_request_result = await session.execute(
        select(AccessRequest)
        .options(selectinload(AccessRequest.approvals), selectinload(AccessRequest.document))
        .where(AccessRequest.id == request_id)
    )
    access_request = access_request_result.scalars().first()
    if not access_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")

    if access_request.status == RequestStatus.approved:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request already approved")

    if approver_id == access_request.requester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requester cannot approve")

    participant_row = await session.execute(
        select(DocumentParticipant).where(
            and_(
                DocumentParticipant.document_id == access_request.document_id,
                DocumentParticipant.user_id == approver_id,
            )
        )
    )
    if not participant_row.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only participants can approve")

    duplicate = await session.execute(
        select(Approval).where(
            and_(Approval.request_id == request_id, Approval.approver_id == approver_id)
        )
    )
    if duplicate.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Approval already recorded")

    approval = Approval(request_id=request_id, approver_id=approver_id)
    session.add(approval)
    await session.flush()

    await log_action(
        session=session,
        document_id=access_request.document_id,
        user_id=approver_id,
        action="User approved request",
        details=str(request_id),
    )

    await check_threshold(session=session, access_request=access_request)
    await session.commit()
    await session.refresh(access_request)
    return access_request


async def check_threshold(*, session: AsyncSession, access_request: AccessRequest) -> bool:
    approvals_count = await session.scalar(
        select(func.count(Approval.id)).where(Approval.request_id == access_request.id)
    )
    if approvals_count is None or approvals_count < access_request.document.threshold:
        return False

    if access_request.status != RequestStatus.approved:
        access_request.status = RequestStatus.approved
        await log_action(
            session=session,
            document_id=access_request.document_id,
            user_id=access_request.requester_id,
            action="Threshold met — access granted",
            details=str(access_request.id),
        )
    return True


async def reconstruct_key_for_request(*, session: AsyncSession, access_request: AccessRequest) -> str:
    approver_ids = [approval.approver_id for approval in access_request.approvals]
    share_rows = await session.execute(
        select(DocumentParticipant.share_index, DocumentParticipant.key_share)
        .where(
            DocumentParticipant.document_id == access_request.document_id,
            DocumentParticipant.user_id.in_(approver_ids),
        )
    )
    shares: Iterable[Tuple[int, str]] = sorted(share_rows.all(), key=lambda row: row[0])
    if len(shares) < access_request.document.threshold:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough approvals to reconstruct key",
        )
    return key_sharing_service.reconstruct_key(
        list(shares)[: access_request.document.threshold]
    )


async def grant_access(*, session: AsyncSession, access_request: AccessRequest) -> str:
    if access_request.status != RequestStatus.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access not granted")
    return await reconstruct_key_for_request(session=session, access_request=access_request)
