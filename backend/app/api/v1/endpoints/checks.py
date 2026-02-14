from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from ...dependencies import get_check_service
from ....schemas.check import CheckRequest
from ....services.check_service import CheckService

router = APIRouter(tags=["checks"])


@router.post("/check")
async def run_check(
    payload: CheckRequest,
    request: Request,
    check_service: CheckService = Depends(get_check_service),
):
    async def stream_events():
        async for event in check_service.stream_check_events(payload):
            if await request.is_disconnected():
                break
            yield event

    return StreamingResponse(
        stream_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
