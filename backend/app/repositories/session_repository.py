import asyncio

from ..schemas.session import SessionRecord


class SessionRepository:
    """In-memory session storage with a DB-ready interface."""

    def __init__(self) -> None:
        self._sessions: dict[str, SessionRecord] = {}
        self._lock = asyncio.Lock()

    async def upsert(self, session: SessionRecord) -> None:
        async with self._lock:
            self._sessions[session.id] = session

    async def list_summaries(self) -> list[dict]:
        async with self._lock:
            sessions = sorted(
                self._sessions.values(),
                key=lambda value: value.created_at,
                reverse=True,
            )

        return [
            {
                "id": item.id,
                "name": item.name,
                "tags": item.tags,
                "created_at": item.created_at,
                "stats": item.stats.model_dump(),
            }
            for item in sessions
        ]

    async def get(self, session_id: str) -> dict | None:
        async with self._lock:
            session = self._sessions.get(session_id)
        return session.model_dump() if session else None

    async def delete(self, session_id: str) -> bool:
        async with self._lock:
            if session_id not in self._sessions:
                return False
            del self._sessions[session_id]
            return True
