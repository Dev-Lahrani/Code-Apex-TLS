import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models import AccessRequest, Document, DocumentParticipant, RequestStatus, User
from app.schemas import DocumentCreate, DocumentRead
from app.utils import encryption_service, key_sharing_service

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_schema(document: Document, *, content: str | None = None) -> DocumentRead:
    participant_ids = [participant.user_id for participant in document.participants]
    return DocumentRead(
        id=document.id,
        title=document.title,
        owner_id=document.owner_id,
        threshold=document.threshold,
        participants=participant_ids,
        created_at=document.created_at,
        content=content,
    )


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    session: AsyncSession = Depends(get_session),
) -> DocumentRead:
    participant_ids = list(dict.fromkeys(payload.participants))

    if payload.threshold > len(participant_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="threshold cannot exceed number of participants",
        )

    user_ids_to_check = set(participant_ids) | {payload.owner_id}
    if not user_ids_to_check:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one participant or owner is required",
        )

    result = await session.execute(
        select(User.id).where(User.id.in_(user_ids_to_check))
    )
    existing_ids = {row[0] for row in result.all()}
    missing_ids = user_ids_to_check - existing_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User(s) not found: {', '.join(str(mid) for mid in missing_ids)}",
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

    participant_rows = []
    for (share_index, share_value), participant_id in zip(shares, participant_ids):
        participant_rows.append(
            DocumentParticipant(
                document=document,
                user_id=participant_id,
                share_index=share_index,
                key_share=share_value,
            )
        )
    session.add_all(participant_rows)

    encrypted_payload = encryption_service.encrypt(payload.content, encryption_key)
    document.encrypted_content = encrypted_payload

    await session.commit()

    await session.refresh(document, attribute_names=["participants"])

    return _to_schema(document, content=payload.content)


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_session),
) -> list[DocumentRead]:
    result = await session.execute(
        select(Document)
        .options(selectinload(Document.participants))
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    return [_to_schema(doc) for doc in documents]


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    request_id: uuid.UUID = Query(..., description="Access request id with approvals"),
    session: AsyncSession = Depends(get_session),
) -> DocumentRead:
    result = await session.execute(
        select(Document)
        .options(selectinload(Document.participants))
        .where(Document.id == document_id)
    )
    document = result.scalars().first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    access_request_result = await session.execute(
        select(AccessRequest)
        .options(selectinload(AccessRequest.approvals))
        .where(AccessRequest.id == request_id)
    )
    access_request = access_request_result.scalars().first()
    if not access_request or access_request.document_id != document_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found",
        )

    if len(access_request.approvals) < document.threshold or access_request.status != RequestStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough approvals to reconstruct key",
        )

    approver_ids = [approval.approver_id for approval in access_request.approvals]
    if not approver_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No approvals available",
        )

    share_rows = await session.execute(
        select(DocumentParticipant.share_index, DocumentParticipant.key_share)
        .where(
            DocumentParticipant.document_id == document_id,
            DocumentParticipant.user_id.in_(approver_ids),
        )
    )
    shares = sorted(share_rows.all(), key=lambda row: row[0])
    if len(shares) < document.threshold:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient shares to reconstruct key",
        )

    try:
        encryption_key = key_sharing_service.reconstruct_key(
            [(share_index, share) for share_index, share in shares][: document.threshold]
        )
        content = encryption_service.decrypt(document.encrypted_content, encryption_key)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return _to_schema(document, content=content)
