from __future__ import annotations

from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AccessRequest, Document, DocumentParticipant, RequestStatus, User
from app.schemas import DocumentCreate, DocumentEdit
from app.services.logging_service import log_action
from app.utils import encryption_service, key_sharing_service


async def create_document(
    *,
    session: AsyncSession,
    payload: DocumentCreate,
) -> Document:
    participant_ids = list(dict.fromkeys(payload.participants))
    if payload.threshold > len(participant_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="threshold cannot exceed number of participants",
        )

    # Validate owner and participants exist
    user_ids = set(participant_ids) | {payload.owner_id}
    result = await session.execute(select(User.id).where(User.id.in_(user_ids)))
    found = {row[0] for row in result.all()}
    missing = user_ids - found
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User(s) not found: {', '.join(str(mid) for mid in missing)}",
        )

    document = Document(
        title=payload.title,
        owner_id=payload.owner_id,
        threshold=payload.threshold,
        encrypted_content="",
    )
    session.add(document)
    await session.flush()

    encryption_key = encryption_service.generate_key()
    shares = key_sharing_service.split_key(encryption_key, payload.threshold, len(participant_ids))

    participants: Iterable[DocumentParticipant] = (
        DocumentParticipant(
            document=document,
            user_id=participant_id,
            share_index=share_index,
            key_share=share_value,
        )
        for (share_index, share_value), participant_id in zip(shares, participant_ids)
    )
    session.add_all(list(participants))

    document.encrypted_content = encryption_service.encrypt(payload.content, encryption_key)

    await log_action(
        session=session,
        document_id=document.id,
        user_id=payload.owner_id,
        action="Document created",
        details=document.title,
    )

    await session.commit()
    await session.refresh(document, attribute_names=["participants"])
    return document


async def edit_document(
    *,
    session: AsyncSession,
    payload: DocumentEdit,
    encryption_key: str,
) -> Document:
    document = await session.get(Document, payload.document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    access_request = await session.get(AccessRequest, payload.request_id)
    if not access_request or access_request.document_id != payload.document_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")
    if access_request.requester_id != payload.editor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requester mismatch")
    if access_request.status != RequestStatus.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access request not approved")

    # Decrypt and re-encrypt with new content using provided key
    encryption_service.decrypt(document.encrypted_content, encryption_key)  # validates key
    document.encrypted_content = encryption_service.encrypt(payload.content, encryption_key)

    await log_action(
        session=session,
        document_id=document.id,
        user_id=payload.editor_id,
        action="User edited document",
        details=str(payload.request_id),
    )

    await session.commit()
    await session.refresh(document, attribute_names=["participants"])
    return document
