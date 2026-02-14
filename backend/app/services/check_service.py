import asyncio
import json
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import AsyncGenerator

from ..repositories.session_repository import SessionRepository
from ..schemas.check import CheckRequest, SessionConfig
from ..schemas.session import ProxyResult, SessionRecord, SessionStats
from .geoip_service import GeoIPService
from .proxy_service import check_proxy_sync, parse_proxy


def sse_event(event: str, data: dict | str) -> str:
    payload = json.dumps(data) if isinstance(data, dict) else data
    return f"event: {event}\ndata: {payload}\n\n"


class CheckService:
    def __init__(
        self,
        session_repository: SessionRepository,
        geoip_service: GeoIPService,
    ) -> None:
        self._session_repository = session_repository
        self._geoip_service = geoip_service

    async def stream_check_events(
        self,
        request: CheckRequest,
        owner_sub: str,
    ) -> AsyncGenerator[str, None]:
        field_order = [field.strip() for field in request.field_order.split(":") if field.strip()]

        proxy_list: list[dict[str, str]] = []
        for line in request.proxies.strip().splitlines():
            proxy = parse_proxy(line, request.delimiter, field_order)
            if proxy is not None:
                proxy_list.append(proxy)

        total = len(proxy_list)
        session_id = str(uuid.uuid4())

        yield sse_event("start", {"total": total, "session_id": session_id})

        if total == 0:
            yield sse_event(
                "done",
                {
                    "session_id": session_id,
                    "total": 0,
                    "alive": 0,
                    "dead": 0,
                    "avg_latency": None,
                },
            )
            return

        completed = 0
        alive = 0
        dead = 0
        latencies: list[int] = []
        all_results: list[dict] = []
        semaphore = asyncio.Semaphore(min(request.max_workers, total))

        async def run_single(proxy: dict[str, str]) -> dict:
            async with semaphore:
                return await asyncio.to_thread(
                    check_proxy_sync,
                    proxy,
                    request.check_url,
                    request.timeout,
                    request.proxy_type,
                )

        tasks = [asyncio.create_task(run_single(proxy)) for proxy in proxy_list]

        try:
            for task in asyncio.as_completed(tasks):
                result = await task
                completed += 1

                if result["status"] == "OK":
                    alive += 1
                    if result["response_time_ms"] is not None:
                        latencies.append(result["response_time_ms"])
                else:
                    dead += 1

                result["_progress"] = {"completed": completed, "total": total}
                all_results.append(result)
                yield sse_event("result", result)
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()

        exit_ips = [item["exit_ip"] for item in all_results if item["exit_ip"]]
        geo_map = await self._geoip_service.resolve_countries(exit_ips)

        for item in all_results:
            geo = geo_map.get(item["exit_ip"])
            if geo is None:
                continue
            item["country"] = geo.get("country", "")
            item["country_code"] = geo.get("countryCode", "")
            item["city"] = geo.get("city", "")

        geo_results = {
            item["id"]: {
                "country": item.get("country", ""),
                "countryCode": item.get("country_code", ""),
                "city": item.get("city", ""),
            }
            for item in all_results
            if item.get("country")
        }
        if geo_results:
            yield sse_event("geo", geo_results)

        avg_latency = round(sum(latencies) / len(latencies)) if latencies else None
        countries = dict(Counter(item["country"] for item in all_results if item.get("country")))

        stats = SessionStats(
            total=total,
            alive=alive,
            dead=dead,
            avg_latency=avg_latency,
            countries=countries,
        )

        for item in all_results:
            item.pop("_progress", None)

        session_name = request.session_name.strip() or (
            f"Session {datetime.now(timezone.utc).strftime('%b %d, %H:%M')}"
        )

        session_record = SessionRecord(
            id=session_id,
            owner_sub=owner_sub,
            name=session_name,
            tags=[tag.strip() for tag in request.tags if tag.strip()],
            created_at=datetime.now(timezone.utc).isoformat(),
            config=SessionConfig(
                check_url=request.check_url,
                timeout=request.timeout,
                max_workers=request.max_workers,
                proxy_type=request.proxy_type,
                delimiter=request.delimiter,
                field_order=request.field_order,
            ),
            results=[ProxyResult(**item) for item in all_results],
            stats=stats,
        )
        await self._session_repository.upsert(session_record)

        yield sse_event("done", {"session_id": session_id, **stats.model_dump()})
