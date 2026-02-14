import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class ProxySession(Base):
    __tablename__ = "proxy_sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False)
    results: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    stats: Mapped[dict] = mapped_column(JSON, nullable=False)
