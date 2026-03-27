from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    owner_id: UUID
    participants: list[UUID] = Field(default_factory=list)
    threshold: int = Field(..., gt=0)
    content: str = Field("", min_length=0)

    @model_validator(mode="after")
    def validate_threshold(self) -> "DocumentBase":
        unique_participants = len(set(self.participants))
        if self.threshold > unique_participants:
            raise ValueError("threshold cannot exceed number of participants")
        return self


class DocumentCreate(DocumentBase):
    pass


class DocumentRead(BaseModel):
    id: UUID
    title: str
    owner_id: UUID
    threshold: int
    participants: list[UUID]
    created_at: datetime
    content: str | None = None
    encryption_key: str | None = None

    model_config = {"from_attributes": True}
