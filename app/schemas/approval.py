from uuid import UUID

from pydantic import BaseModel


class ApprovalCreate(BaseModel):
    request_id: UUID
    approver_id: UUID
