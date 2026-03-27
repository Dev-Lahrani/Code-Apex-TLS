from functools import lru_cache
import logging
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    app_name: str = Field(default="Code Apex API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="APP_DEBUG")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    log_level: str = Field(default="info", alias="LOG_LEVEL")
    api_prefix: str = Field(default="/api")

    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/codeapex",
        alias="DATABASE_URL",
        description="Asyncpg DSN; defaults to local fallback so startup never crashes.",
    )

    redis_enabled: bool = Field(default=False, alias="REDIS_ENABLED")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")

    blockchain_enabled: bool = Field(default=False, alias="BLOCKCHAIN_ENABLED")
    blockchain_rpc_url: str | None = Field(default=None, alias="BLOCKCHAIN_RPC_URL")
    blockchain_private_key: str | None = Field(default=None, alias="BLOCKCHAIN_PRIVATE_KEY")
    blockchain_contract_address: str | None = Field(
        default=None, alias="BLOCKCHAIN_CONTRACT_ADDRESS"
    )
    blockchain_chain_id: int = Field(default=1, alias="BLOCKCHAIN_CHAIN_ID")
    blockchain_sender_address: str | None = Field(
        default=None, alias="BLOCKCHAIN_SENDER_ADDRESS"
    )
    access_request_ttl_seconds: int = Field(default=60 * 60, alias="ACCESS_REQUEST_TTL_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def _warn_on_missing_db(cls, v: Any) -> Any:
        if v is None or (isinstance(v, str) and not v.strip()):
            logger.warning(
                "DATABASE_URL missing; using local fallback (postgresql+asyncpg://user:password@localhost:5432/codeapex)."
            )
            return "postgresql+asyncpg://user:password@localhost:5432/codeapex"
        return v

    @field_validator("blockchain_chain_id", mode="before")
    @classmethod
    def _coerce_chain_id(cls, v: Any) -> int:
        if v is None or (isinstance(v, str) and not v.strip()):
            return 1
        try:
            return int(v)
        except (TypeError, ValueError):
            logger.warning("Invalid BLOCKCHAIN_CHAIN_ID; defaulting to 1")
            return 1

    @field_validator("blockchain_rpc_url", "blockchain_private_key", "blockchain_contract_address", "blockchain_sender_address", mode="before")
    @classmethod
    def _empty_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
