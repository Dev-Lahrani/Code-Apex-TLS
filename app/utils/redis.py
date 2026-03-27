from typing import Optional

import redis.asyncio as redis

from app.core.config import settings

_redis_client: Optional[redis.Redis] = None


async def get_redis_client() -> Optional[redis.Redis]:
    global _redis_client

    if not settings.redis_enabled or not settings.redis_url:
        return None

    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)

    return _redis_client
