from fastapi import APIRouter

from app.api import access_requests, auth, documents, health, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(documents.router)
api_router.include_router(access_requests.router)

__all__ = ["api_router"]
