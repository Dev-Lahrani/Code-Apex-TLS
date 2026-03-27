import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models import Document, DocumentParticipant, User
from app.schemas import DocumentCreate, DocumentRead
from app.utils import encryption_service

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_schema(
    document: Document, *, content: str | None = None, encryption_key: str | None = None
) -> DocumentRead:
    participant_ids = [participant.user_id for participant in document.participants]
    return DocumentRead(
        id=document.id,
        title=document.title,
        owner_id=document.owner_id,
        threshold=document.threshold,
        participants=participant_ids,
        created_at=document.created_at,
        content=content,
        encryption_key=encryption_key,
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

    session.add_all(
        [
            DocumentParticipant(document=document, user_id=participant_id)
            for participant_id in participant_ids
        ]
    )

    encryption_key = encryption_service.generate_key()
    encrypted_payload = encryption_service.encrypt(payload.content, encryption_key)
    document.encrypted_content = encrypted_payload

    await session.commit()

    await session.refresh(document, attribute_names=["participants"])

    return _to_schema(document, content=payload.content, encryption_key=encryption_key)


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
    key: str = Query(..., description="Base64-encoded AES key"),
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

    try:
        content = encryption_service.decrypt(document.encrypted_content, key)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return _to_schema(document, content=content)
