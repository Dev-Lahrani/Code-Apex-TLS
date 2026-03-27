from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.document import ThresholdType


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    owner_id: UUID
    participants: list[UUID] = Field(default_factory=list)
    threshold: int = Field(..., gt=0)
    threshold_type: ThresholdType = Field(default=ThresholdType.fixed)
    threshold_value: float | None = Field(default=None)
    content: str = Field("", min_length=0)

    @model_validator(mode="after")
    def validate_threshold(self) -> "DocumentBase":
        unique_participants = len(set(self.participants))
        # Determine effective value
        if self.threshold_type == ThresholdType.percentage:
            if self.threshold_value is None:
                raise ValueError("threshold_value is required for percentage threshold")
            if not (0 < self.threshold_value <= 1):
                raise ValueError("percentage threshold_value must be between 0 and 1")
            from math import ceil

            required = ceil(self.threshold_value * unique_participants)
        else:
            required = self.threshold_value if self.threshold_value else self.threshold

        if required < 1:
            raise ValueError("threshold must be at least 1")
        if required > unique_participants:
            raise ValueError("threshold cannot exceed number of participants")
        return self


class DocumentCreate(DocumentBase):
    pass


class DocumentEdit(BaseModel):
    document_id: UUID
    request_id: UUID
    editor_id: UUID
    content: str


class DocumentRead(BaseModel):
    id: UUID
    title: str
    owner_id: UUID
    threshold: int
    threshold_type: ThresholdType
    threshold_value: float | None = None
    participants: list[UUID]
    created_at: datetime
    content: str | None = None
    ipfs_cid: str | None = None
    content_hash: str | None = None
    is_flagged: bool | None = None
    anomaly_score: float | None = None
    anomaly_label: str | None = None

    model_config = {"from_attributes": True}
