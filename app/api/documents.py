from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models import AccessRequest, ActivityLog, Document, DocumentParticipant
from app.schemas import DocumentCreate, DocumentEdit, DocumentRead
from app.services import approval_service, document_service
from app.utils import encryption_service

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_read(document: Document, *, content: str | None = None) -> DocumentRead:
    participant_ids = [participant.user_id for participant in document.participants]
    return DocumentRead(
        id=document.id,
        title=document.title,
        owner_id=document.owner_id,
        threshold=document.threshold,
        participants=participant_ids,
        created_at=document.created_at,
        ipfs_cid=document.ipfs_cid,
        content_hash=document.content_hash,
        is_flagged=document.is_flagged,
        anomaly_score=document.anomaly_score,
        anomaly_label=document.anomaly_label,
        content=content,
        threshold_type=document.threshold_type,
        threshold_value=document.threshold_value,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document = await document_service.create_document(session=session, payload=payload)
    read = _to_read(document, content=payload.content)
    return {
        "success": True,
        "message": "Document created",
        "data": {"document": read.model_dump()},
    }


@router.get("")
async def list_documents(
    user_id: uuid.UUID = Query(..., description="User ID to scope documents"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    result = await session.execute(
        select(Document)
        .options(selectinload(Document.participants))
        .join(DocumentParticipant, DocumentParticipant.document_id == Document.id, isouter=True)
        .where(or_(Document.owner_id == user_id, DocumentParticipant.user_id == user_id))
        .order_by(Document.created_at.desc())
        .distinct()
    )
    documents = result.scalars().unique().all()
    reads = [_to_read(doc).model_dump() for doc in documents]
    return {"success": True, "message": "Documents fetched", "data": {"documents": reads}}


@router.get("/{document_id}")
async def get_document(
    document_id: uuid.UUID,
    request_id: uuid.UUID = Query(..., description="Approved access request ID"),
    requester_id: uuid.UUID = Query(..., description="Requester viewing the document"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    access_request = await session.scalar(
        select(AccessRequest)
        .options(
            selectinload(AccessRequest.approvals),
            selectinload(AccessRequest.document).selectinload(Document.participants),
        )
        .where(AccessRequest.id == request_id)
    )
    if not access_request or access_request.document_id != document_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")
    if access_request.requester_id != requester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requester mismatch")

    encryption_key = await approval_service.grant_access(session=session, access_request=access_request)
    content = encryption_service.decrypt(access_request.document.encrypted_content, encryption_key)

    read = _to_read(access_request.document, content=content)
    return {
        "success": True,
        "message": "Document retrieved",
        "data": {"document": read.model_dump()},
    }


@router.post("/{document_id}/edit")
async def edit_document(
    document_id: uuid.UUID,
    payload: DocumentEdit,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    if payload.document_id != document_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document mismatch")

    access_request = await session.scalar(
        select(AccessRequest)
        .options(
            selectinload(AccessRequest.approvals),
            selectinload(AccessRequest.document).selectinload(Document.participants),
        )
        .where(AccessRequest.id == payload.request_id)
    )
    if not access_request or access_request.document_id != document_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")
    if access_request.requester_id != payload.editor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requester mismatch")

    encryption_key = await approval_service.grant_access(session=session, access_request=access_request)
    updated = await document_service.edit_document(
        session=session,
        payload=DocumentEdit(
            document_id=document_id,
            request_id=payload.request_id,
            editor_id=payload.editor_id,
            content=payload.content,
        ),
        encryption_key=encryption_key,
    )
    read = _to_read(updated, content=payload.content)
    return {
        "success": True,
        "message": "Document edited",
        "data": {"document": read.model_dump()},
    }


@router.get("/{document_id}/logs")
async def list_logs(
    document_id: uuid.UUID,
    user_id: uuid.UUID = Query(..., description="User requesting logs"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document = await session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    allowed = await session.scalar(
        select(func.count())
        .select_from(Document)
        .join(DocumentParticipant, DocumentParticipant.document_id == Document.id, isouter=True)
        .where(
            Document.id == document_id,
            or_(Document.owner_id == user_id, DocumentParticipant.user_id == user_id),
        )
    )
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for logs")

    logs_result = await session.execute(
        select(ActivityLog)
        .where(ActivityLog.document_id == document_id)
        .order_by(ActivityLog.timestamp.desc())
    )
    logs = [
        {
            "id": log.id,
            "action": log.action,
            "user_id": log.user_id,
            "timestamp": log.timestamp,
            "hash": log.hash,
            "tx_hash": log.tx_hash,
            "details": log.details,
        }
        for log in logs_result.scalars().all()
    ]
    return {"success": True, "message": "Logs fetched", "data": {"logs": logs}}
