from fastapi import Depends

from ..repositories.session_repository import SessionRepository
from ..services.check_service import CheckService
from ..services.geoip_service import GeoIPService

_session_repository = SessionRepository()
_geoip_service = GeoIPService()


def get_session_repository() -> SessionRepository:
    return _session_repository


def get_geoip_service() -> GeoIPService:
    return _geoip_service


def get_check_service(
    session_repository: SessionRepository = Depends(get_session_repository),
    geoip_service: GeoIPService = Depends(get_geoip_service),
) -> CheckService:
    return CheckService(
        session_repository=session_repository,
        geoip_service=geoip_service,
    )
