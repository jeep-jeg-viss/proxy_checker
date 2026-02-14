from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Proxy Checker API"
    app_version: str = "0.3.0"
    api_prefix: str = "/api"
    cors_allow_origins: list[str] = ["*"]
    database_url: str
    db_echo: bool = False
    db_auto_create: bool = True
    auth0_domain: str
    auth0_audience: str
    auth0_issuer: str | None = None
    auth0_algorithms: list[str] = ["RS256"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
