from __future__ import annotations

from typing import Iterable, Tuple
import math

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import AccessRequest, Approval, DocumentParticipant, RequestStatus, ThresholdType
from app.services.logging_service import log_action
from app.utils import key_sharing_service


def calculate_threshold(*, threshold_type: ThresholdType, threshold_value: float | None, fallback: int, total_participants: int) -> int:
    if total_participants <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No participants found")
    if threshold_type == ThresholdType.percentage:
        if threshold_value is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="threshold_value required for percentage")
        if not (0 < threshold_value <= 1):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="percentage must be between 0 and 1")
        required = math.ceil(threshold_value * total_participants)
    else:
        # fixed or smart both use numeric value
        base = threshold_value if threshold_value else fallback
        required = int(base)
    if required < 1:
        required = 1
    if required > total_participants:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="threshold cannot exceed participants")
    return required


async def approve_request(*, session: AsyncSession, request_id, approver_id) -> AccessRequest:
    access_request_result = await session.execute(
        select(AccessRequest)
        .options(selectinload(AccessRequest.approvals), selectinload(AccessRequest.document))
        .where(AccessRequest.id == request_id)
    )
    access_request = access_request_result.scalars().first()
    if not access_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")

    if access_request.status != RequestStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request is not pending and cannot be approved",
        )

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
    access_request.approvals.append(approval)
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
    total_participants = await session.scalar(
        select(func.count()).select_from(DocumentParticipant).where(DocumentParticipant.document_id == access_request.document_id)
    )
    required = calculate_threshold(
        threshold_type=access_request.document.threshold_type,
        threshold_value=access_request.document.threshold_value,
        fallback=access_request.document.threshold,
        total_participants=total_participants or 0,
    )

    await log_action(
        session=session,
        document_id=access_request.document_id,
        user_id=access_request.requester_id,
        action="Dynamic threshold calculated",
        details=f"{required} required approvals",
    )

    approvals_for_count = approvals_count or 0
    if access_request.document.threshold_type == ThresholdType.smart:
        approver_rows = await session.execute(
            select(Approval.approver_id).where(Approval.request_id == access_request.id)
        )
        approvals_for_count = 0
        for (approver_id,) in approver_rows.all():
            approvals_for_count += 2 if approver_id == access_request.document.owner_id else 1

    if approvals_for_count < required:
        return False

    if access_request.status != RequestStatus.approved:
        access_request.status = RequestStatus.approved
        await log_action(
            session=session,
            document_id=access_request.document_id,
            user_id=access_request.requester_id,
            action="Threshold met — secure access granted",
            details=str(access_request.id),
        )
    return True


async def reconstruct_key_for_request(*, session: AsyncSession, access_request: AccessRequest) -> str:
    share_rows = await session.execute(
        select(DocumentParticipant.share_index, DocumentParticipant.key_share)
        .join(Approval, Approval.approver_id == DocumentParticipant.user_id)
        .where(
            DocumentParticipant.document_id == access_request.document_id,
            Approval.request_id == access_request.id,
        )
    )
    shares: Iterable[Tuple[int, str]] = sorted(
        {(row[0], row[1]) for row in share_rows.all()}, key=lambda row: row[0]
    )
    total_participants = await session.scalar(
        select(func.count()).select_from(DocumentParticipant).where(DocumentParticipant.document_id == access_request.document_id)
    )
    required = calculate_threshold(
        threshold_type=access_request.document.threshold_type,
        threshold_value=access_request.document.threshold_value,
        fallback=access_request.document.threshold,
        total_participants=total_participants or 0,
    )
    required_shares = min(required, len(shares), access_request.document.threshold)
    if len(shares) < required_shares:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough approvals to reconstruct key",
        )
    return key_sharing_service.reconstruct_key(
        list(shares)[:required_shares]
    )


async def grant_access(*, session: AsyncSession, access_request: AccessRequest) -> str:
    if access_request.status != RequestStatus.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access not granted")
    return await reconstruct_key_for_request(session=session, access_request=access_request)
