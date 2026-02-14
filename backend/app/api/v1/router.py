from fastapi import APIRouter

from .endpoints.checks import router as checks_router
from .endpoints.health import router as health_router
from .endpoints.sessions import router as sessions_router

api_router = APIRouter()
api_router.include_router(checks_router)
api_router.include_router(sessions_router)
api_router.include_router(health_router)
