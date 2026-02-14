from collections.abc import AsyncGenerator

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.db_echo,
    future=True,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": settings.db_statement_cache_size},
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    if not settings.db_auto_create:
        return

    # Migrations are preferred for production, but create_all keeps local setup simple.
    from ..models import ProxySession  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_proxy_sessions_owner_sub)


async def close_db() -> None:
    await engine.dispose()


def _migrate_proxy_sessions_owner_sub(sync_conn) -> None:
    """
    Lightweight compatibility migration for older deployments.

    Ensures existing `proxy_sessions` tables created before auth rollout include
    the `owner_sub` column used for per-user isolation.
    """
    inspector = inspect(sync_conn)
    if "proxy_sessions" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("proxy_sessions")}
    if "owner_sub" in columns:
        return

    sync_conn.exec_driver_sql(
        "ALTER TABLE proxy_sessions "
        "ADD COLUMN owner_sub VARCHAR(255) NOT NULL DEFAULT '__legacy__'"
    )
    sync_conn.exec_driver_sql(
        "CREATE INDEX IF NOT EXISTS ix_proxy_sessions_owner_sub "
        "ON proxy_sessions (owner_sub)"
    )
