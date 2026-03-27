from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import User
from app.schemas import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginPayload(BaseModel):
    user_id: uuid.UUID


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    session: AsyncSession = Depends(get_session),
) -> dict:
    existing = await session.scalar(select(User).where(User.name == payload.name))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    user = User(name=payload.name)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return {
        "success": True,
        "message": "User registered",
        "data": {"user": UserRead.model_validate(user)},
    }


@router.post("/login")
async def login(
    payload: LoginPayload,
    session: AsyncSession = Depends(get_session),
) -> dict:
    user = await session.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {
        "success": True,
        "message": "Login successful",
        "data": {"user": UserRead.model_validate(user)},
    }
