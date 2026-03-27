from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Code Apex API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="APP_DEBUG")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    log_level: str = Field(default="info", alias="LOG_LEVEL")
    api_prefix: str = Field(default="/api")

    database_url: str = Field(..., alias="DATABASE_URL")

    redis_enabled: bool = Field(default=False, alias="REDIS_ENABLED")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")

    blockchain_enabled: bool = Field(default=False, alias="BLOCKCHAIN_ENABLED")
    blockchain_rpc_url: str | None = Field(default=None, alias="BLOCKCHAIN_RPC_URL")
    blockchain_private_key: str | None = Field(default=None, alias="BLOCKCHAIN_PRIVATE_KEY")
    blockchain_contract_address: str | None = Field(
        default=None, alias="BLOCKCHAIN_CONTRACT_ADDRESS"
    )
    blockchain_chain_id: int | None = Field(default=None, alias="BLOCKCHAIN_CHAIN_ID")
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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
