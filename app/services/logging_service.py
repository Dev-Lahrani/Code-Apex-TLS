from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog
from app.utils import blockchain_service

logger = logging.getLogger(__name__)


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

    tx_hash: Optional[str] = None
    try:
        tx_hash = await blockchain_service.log_action(
            document_id=document_id,
            user_address=str(user_id),
            action=action,
            timestamp=timestamp,
            hash_hex=hash_value,
        )
    except Exception as exc:
        logger.warning("Blockchain anchoring failed for log %s: %s", log_entry.id, exc)

    if tx_hash:
        log_entry.tx_hash = tx_hash

    await session.commit()
    return log_entry
