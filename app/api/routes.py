from fastapi import APIRouter

from app.api import documents, health, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(users.router)
api_router.include_router(documents.router)

__all__ = ["api_router"]
