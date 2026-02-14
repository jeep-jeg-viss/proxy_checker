from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.database import get_db
from ..core.security import Auth0TokenVerifier
from ..repositories.session_repository import SessionRepository
from ..services.check_service import CheckService
from ..services.geoip_service import GeoIPService

settings = get_settings()
_geoip_service = GeoIPService()
_token_verifier = Auth0TokenVerifier(
    domain=settings.auth0_domain,
    audience=settings.auth0_audience,
    algorithms=settings.auth0_algorithms,
    issuer=settings.auth0_issuer,
)
_bearer_scheme = HTTPBearer(auto_error=False)


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


def get_token_verifier() -> Auth0TokenVerifier:
    return _token_verifier


async def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    verifier: Auth0TokenVerifier = Depends(get_token_verifier),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    return await verifier.verify_token(credentials.credentials)


async def require_auth(
    principal: dict[str, Any] = Depends(get_current_principal),
) -> dict[str, Any]:
    subject = principal.get("sub")
    if not isinstance(subject, str) or not subject.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )
    return principal
