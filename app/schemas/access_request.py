from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.access_request import RequestStatus


class AccessRequestCreate(BaseModel):
    document_id: UUID
    requester_id: UUID


class AccessRequestRead(BaseModel):
    id: UUID
    document_id: UUID
    requester_id: UUID
    status: RequestStatus
    created_at: datetime

    model_config = {"from_attributes": True}
