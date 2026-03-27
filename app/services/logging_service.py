from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog


async def log_action(
    *,
    session: AsyncSession,
    document_id,
    user_id,
    action: str,
    details: Optional[str] = None,
) -> ActivityLog:
    timestamp = datetime.utcnow()
    hash_value = hashlib.sha256(f"{action}{timestamp.isoformat()}".encode()).hexdigest()

    log_entry = ActivityLog(
        document_id=document_id,
        user_id=user_id,
        action=action,
        timestamp=timestamp,
        hash=hash_value,
        tx_hash=None,
        details=details,
    )
    session.add(log_entry)
    await session.flush()
    return log_entry
