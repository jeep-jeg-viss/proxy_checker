from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..repositories.session_repository import SessionRepository
from ..services.check_service import CheckService
from ..services.geoip_service import GeoIPService

_geoip_service = GeoIPService()


def get_geoip_service() -> GeoIPService:
    return _geoip_service


def get_session_repository(
    db: AsyncSession = Depends(get_db),
) -> SessionRepository:
    return SessionRepository(db=db)


def get_check_service(
    session_repository: SessionRepository = Depends(get_session_repository),
    geoip_service: GeoIPService = Depends(get_geoip_service),
) -> CheckService:
    return CheckService(
        session_repository=session_repository,
        geoip_service=geoip_service,
    )
