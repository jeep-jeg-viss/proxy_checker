"""
Proxy Checker – FastAPI backend
Streams proxy-check results in real-time via Server-Sent Events (SSE).
"""

import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Generator

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Proxy Checker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ────────────────────────────────────────────────
class CheckRequest(BaseModel):
    """Payload sent by the frontend to start a check."""
    proxies: str  # raw text, one proxy per line
    check_url: str = "https://httpbin.org/ip"
    timeout: int = 10
    max_workers: int = 20
    proxy_type: str = "http"  # "http" | "socks5"
    delimiter: str = ":"
    field_order: str = "ip:port:user:pass"  # colon-separated field names


# ── Core proxy logic (adapted from main.py) ──────────────────────────────────

def parse_proxy(line: str, delimiter: str, field_order: list[str]) -> dict | None:
    """Parse a single line into a proxy dict using the given delimiter & field order."""
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    parts = line.split(delimiter)
    if len(parts) < 2:
        return None

    proxy: dict[str, str] = {}
    for i, f in enumerate(field_order):
        if i < len(parts):
            proxy[f] = parts[i].strip()

    if "ip" not in proxy or "port" not in proxy:
        return None

    return proxy


def build_proxy_url(proxy: dict, proxy_type: str) -> str:
    """Build the proxy URL string from parsed fields."""
    scheme = proxy_type
    if proxy.get("user") and proxy.get("pass"):
        return f"{scheme}://{proxy['user']}:{proxy['pass']}@{proxy['ip']}:{proxy['port']}"
    return f"{scheme}://{proxy['ip']}:{proxy['port']}"


def check_proxy(proxy: dict, check_url: str, timeout: int, proxy_type: str) -> dict:
    """Test a single proxy. Returns a result dict with status and exit IP."""
    proxy_url = build_proxy_url(proxy, proxy_type)
    result = {
        "id": str(uuid.uuid4()),
        "proxy_ip": proxy["ip"],
        "proxy_port": proxy["port"],
        "user": proxy.get("user", ""),
        "status": "FAIL",
        "exit_ip": "",
        "response_time_ms": None,
        "error": "",
    }

    proxies = {"http": proxy_url, "https": proxy_url}

    try:
        start = time.perf_counter()
        resp = requests.get(check_url, proxies=proxies, timeout=timeout)
        elapsed_ms = round((time.perf_counter() - start) * 1000)
        resp.raise_for_status()

        data = resp.json()
        exit_ip = data.get("origin", "").split(",")[0].strip()

        result["status"] = "OK"
        result["exit_ip"] = exit_ip
        result["response_time_ms"] = elapsed_ms
    except Exception as exc:
        result["error"] = str(exc)[:200]

    return result


# ── SSE streaming endpoint ───────────────────────────────────────────────────

def _sse_event(event: str, data: dict | str) -> str:
    """Format a single SSE message."""
    payload = json.dumps(data) if isinstance(data, dict) else data
    return f"event: {event}\ndata: {payload}\n\n"


def _run_checks(req: CheckRequest) -> Generator[str, None, None]:
    """Generator that yields SSE events as proxy checks complete."""
    field_order = [f.strip() for f in req.field_order.split(":")]

    lines = req.proxies.strip().splitlines()
    proxy_list: list[dict] = []
    for line in lines:
        p = parse_proxy(line, req.delimiter, field_order)
        if p is not None:
            proxy_list.append(p)

    total = len(proxy_list)

    # Send initial metadata
    yield _sse_event("start", {"total": total})

    if total == 0:
        yield _sse_event("done", {"total": 0, "alive": 0, "dead": 0, "avg_latency": None})
        return

    alive = 0
    dead = 0
    latencies: list[int] = []
    completed = 0

    with ThreadPoolExecutor(max_workers=min(req.max_workers, total)) as pool:
        futures = {pool.submit(check_proxy, p, req.check_url, req.timeout, req.proxy_type): p for p in proxy_list}

        for future in as_completed(futures):
            result = future.result()
            completed += 1

            if result["status"] == "OK":
                alive += 1
                if result["response_time_ms"] is not None:
                    latencies.append(result["response_time_ms"])
            else:
                dead += 1

            # Attach progress info to each result
            result["_progress"] = {
                "completed": completed,
                "total": total,
            }

            yield _sse_event("result", result)

    avg_latency = round(sum(latencies) / len(latencies)) if latencies else None

    yield _sse_event("done", {
        "total": total,
        "alive": alive,
        "dead": dead,
        "avg_latency": avg_latency,
    })


@app.post("/api/check")
async def run_check(req: CheckRequest):
    """
    Start a proxy check run.
    Returns a Server-Sent Events stream with real-time results.
    """
    return StreamingResponse(
        _run_checks(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
