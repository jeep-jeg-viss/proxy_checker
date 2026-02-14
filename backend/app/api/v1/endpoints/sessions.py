from fastapi import APIRouter, Depends, HTTPException

from ...dependencies import get_session_repository, require_auth
from ....repositories.session_repository import SessionRepository

router = APIRouter(tags=["sessions"])


@router.get("/sessions")
async def list_sessions(
    session_repository: SessionRepository = Depends(get_session_repository),
    principal: dict = Depends(require_auth),
):
    return await session_repository.list_summaries(owner_sub=str(principal["sub"]))


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    session_repository: SessionRepository = Depends(get_session_repository),
    principal: dict = Depends(require_auth),
):
    session = await session_repository.get(session_id, owner_sub=str(principal["sub"]))
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    session_repository: SessionRepository = Depends(get_session_repository),
    principal: dict = Depends(require_auth),
):
    deleted = await session_repository.delete(session_id, owner_sub=str(principal["sub"]))
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted"}
