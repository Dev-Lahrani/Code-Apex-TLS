from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas import AccessRequestCreate, AccessRequestRead
from app.services import access_service, approval_service

router = APIRouter(tags=["access"], prefix="")


class RequestAccessPayload(BaseModel):
    requester_id: uuid.UUID


class ApprovePayload(BaseModel):
    approver_id: uuid.UUID


@router.post("/documents/{document_id}/request-access")
async def request_access(
    document_id: uuid.UUID,
    payload: RequestAccessPayload,
    session: AsyncSession = Depends(get_session),
) -> dict:
    access_request = await access_service.request_access(
        session=session,
        payload=AccessRequestCreate(document_id=document_id, requester_id=payload.requester_id),
    )
    return {
        "success": True,
        "message": "Access request created",
        "data": {"request": AccessRequestRead.model_validate(access_request)},
    }


@router.post("/requests/{request_id}/approve")
async def approve_request(
    request_id: uuid.UUID,
    payload: ApprovePayload,
    session: AsyncSession = Depends(get_session),
) -> dict:
    access_request = await approval_service.approve_request(
        session=session,
        request_id=request_id,
        approver_id=payload.approver_id,
    )
    return {
        "success": True,
        "message": "Request approval recorded",
        "data": {"request": AccessRequestRead.model_validate(access_request)},
    }
