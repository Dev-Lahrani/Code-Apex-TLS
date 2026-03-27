from uuid import UUID

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: UUID

    class Config:
        from_attributes = True
