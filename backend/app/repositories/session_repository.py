from datetime import datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.session import ProxySession
from ..schemas.session import SessionRecord
from ..services.password_crypto import PasswordCrypto


class SessionRepository:
    def __init__(self, db: AsyncSession, password_crypto: PasswordCrypto) -> None:
        self._db = db
        self._password_crypto = password_crypto

    async def upsert(self, session: SessionRecord) -> None:
        existing = await self._db.get(ProxySession, session.id)
        values = {
            "owner_sub": session.owner_sub,
            "name": session.name,
            "tags": session.tags,
            "created_at": self._parse_created_at(session.created_at),
            "config": session.config.model_dump(),
            "results": self._encrypt_results([result.model_dump() for result in session.results]),
            "stats": session.stats.model_dump(),
        }

        if existing is None:
            db_obj = ProxySession(id=session.id, **values)
            self._db.add(db_obj)
        else:
            for field_name, value in values.items():
                setattr(existing, field_name, value)

        await self._db.commit()

    async def list_summaries(self, owner_sub: str) -> list[dict]:
        result = await self._db.execute(
            select(ProxySession)
            .where(ProxySession.owner_sub == owner_sub)
            .order_by(desc(ProxySession.created_at))
        )
        sessions = result.scalars().all()

        return [
            {
                "id": item.id,
                "name": item.name,
                "tags": item.tags or [],
                "created_at": self._serialize_created_at(item.created_at),
                "stats": item.stats or {},
            }
            for item in sessions
        ]

    async def get(self, session_id: str, owner_sub: str) -> dict | None:
        result = await self._db.execute(
            select(ProxySession).where(
                ProxySession.id == session_id,
                ProxySession.owner_sub == owner_sub,
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            return None

        return {
            "id": session.id,
            "name": session.name,
            "tags": session.tags or [],
            "created_at": self._serialize_created_at(session.created_at),
            "config": session.config or {},
            "results": self._decrypt_results(session.results or []),
            "stats": session.stats or {},
        }

    async def delete(self, session_id: str, owner_sub: str) -> bool:
        result = await self._db.execute(
            select(ProxySession).where(
                ProxySession.id == session_id,
                ProxySession.owner_sub == owner_sub,
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            return False

        await self._db.delete(session)
        await self._db.commit()
        return True

    @staticmethod
    def _parse_created_at(value: str) -> datetime:
        return datetime.fromisoformat(value)

    @staticmethod
    def _serialize_created_at(value: datetime) -> str:
        return value.isoformat()

    def _encrypt_results(self, results: list[dict]) -> list[dict]:
        encrypted_results: list[dict] = []
        for result in results:
            item = dict(result)
            password = item.get("password")
            if isinstance(password, str):
                item["password"] = self._password_crypto.encrypt(password)
            encrypted_results.append(item)
        return encrypted_results

    def _decrypt_results(self, results: list[dict]) -> list[dict]:
        decrypted_results: list[dict] = []
        for result in results:
            item = dict(result)
            if "password" not in item and isinstance(item.get("pass"), str):
                item["password"] = item.get("pass", "")
            password = item.get("password")
            if isinstance(password, str):
                item["password"] = self._password_crypto.decrypt(password)
            decrypted_results.append(item)
        return decrypted_results
