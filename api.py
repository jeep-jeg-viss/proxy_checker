"""
Proxy Checker – FastAPI backend
Streams proxy-check results in real-time via Server-Sent Events (SSE).
Sessions are stored in-memory (swap to DB later).
"""

import json
import time
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Generator

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Proxy Checker API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── In-memory session store (DB-ready interface) ────────────────────────────
_sessions: dict[str, dict] = {}


# ── Request / Response models ────────────────────────────────────────────────
class CheckRequest(BaseModel):
    """Payload sent by the frontend to start a check."""
    proxies: str              # raw text, one proxy per line
    session_name: str = ""    # user-defined session name/label
    tags: list[str] = []      # user-defined tags for filtering
    check_url: str = "https://httpbin.org/ip"
    timeout: int = 10
    max_workers: int = 20
    proxy_type: str = "http"  # "http" | "socks5"
    delimiter: str = ":"
    field_order: str = "ip:port:user:pass"


# ── GeoIP lookup ─────────────────────────────────────────────────────────────

def resolve_countries(ips: list[str]) -> dict[str, dict[str, str]]:
    """
    Batch-resolve IPs to country info using ip-api.com.
    Returns {ip: {"country": "...", "countryCode": "...", "city": "..."}}
    Free tier: 45 req/min, batch up to 100 IPs.
    """
    if not ips:
        return {}

    # Deduplicate
    unique_ips = list(set(ips))
    result_map: dict[str, dict[str, str]] = {}

    # Process in batches of 100
    for i in range(0, len(unique_ips), 100):
        batch = unique_ips[i : i + 100]
        try:
            resp = requests.post(
                "http://ip-api.com/batch",
                json=[
                    {"query": ip, "fields": "query,country,countryCode,city"}
                    for ip in batch
                ],
                timeout=10,
            )
            if resp.status_code == 200:
                for item in resp.json():
                    q = item.get("query", "")
                    result_map[q] = {
                        "country": item.get("country", ""),
                        "countryCode": item.get("countryCode", ""),
                        "city": item.get("city", ""),
                    }
        except Exception:
            pass  # Best-effort; don't break the check

    return result_map


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
        "country": "",
        "country_code": "",
        "city": "",
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
    session_id = str(uuid.uuid4())

    # Send initial metadata
    yield _sse_event("start", {"total": total, "session_id": session_id})

    if total == 0:
        yield _sse_event("done", {
            "session_id": session_id,
            "total": 0, "alive": 0, "dead": 0, "avg_latency": None,
        })
        return

    alive = 0
    dead = 0
    latencies: list[int] = []
    completed = 0
    all_results: list[dict] = []

    with ThreadPoolExecutor(max_workers=min(req.max_workers, total)) as pool:
        futures = {
            pool.submit(check_proxy, p, req.check_url, req.timeout, req.proxy_type): p
            for p in proxy_list
        }

        for future in as_completed(futures):
            result = future.result()
            completed += 1

            if result["status"] == "OK":
                alive += 1
                if result["response_time_ms"] is not None:
                    latencies.append(result["response_time_ms"])
            else:
                dead += 1

            result["_progress"] = {
                "completed": completed,
                "total": total,
            }

            all_results.append(result)
            yield _sse_event("result", result)

    # ── Post-processing: GeoIP country lookup ────────────────────────────
    exit_ips = [r["exit_ip"] for r in all_results if r["exit_ip"]]
    geo_map = resolve_countries(exit_ips)

    # Attach country info to results
    for r in all_results:
        if r["exit_ip"] in geo_map:
            geo = geo_map[r["exit_ip"]]
            r["country"] = geo["country"]
            r["country_code"] = geo["countryCode"]
            r["city"] = geo["city"]

    # Send geo data to frontend
    geo_results = {
        r["id"]: {
            "country": r.get("country", ""),
            "countryCode": r.get("country_code", ""),
            "city": r.get("city", ""),
        }
        for r in all_results
        if r.get("country")
    }
    if geo_results:
        yield _sse_event("geo", geo_results)

    # ── Compute stats ────────────────────────────────────────────────────
    avg_latency = round(sum(latencies) / len(latencies)) if latencies else None

    country_counts: dict[str, int] = Counter(
        r["country"] for r in all_results if r.get("country")
    )

    stats = {
        "total": total,
        "alive": alive,
        "dead": dead,
        "avg_latency": avg_latency,
        "countries": dict(country_counts),
    }

    # ── Store session ────────────────────────────────────────────────────
    # Strip internal _progress from stored results
    for r in all_results:
        r.pop("_progress", None)

    session_name = req.session_name.strip() or f"Session {datetime.now(timezone.utc).strftime('%b %d, %H:%M')}"

    _sessions[session_id] = {
        "id": session_id,
        "name": session_name,
        "tags": [t.strip() for t in req.tags if t.strip()],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "config": {
            "check_url": req.check_url,
            "timeout": req.timeout,
            "max_workers": req.max_workers,
            "proxy_type": req.proxy_type,
            "delimiter": req.delimiter,
            "field_order": req.field_order,
        },
        "results": all_results,
        "stats": stats,
    }

    yield _sse_event("done", {"session_id": session_id, **stats})


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


# ── Session CRUD endpoints ───────────────────────────────────────────────────

@app.get("/api/sessions")
async def list_sessions():
    """List all sessions (summaries only, no full results)."""
    summaries = []
    for s in sorted(_sessions.values(), key=lambda x: x["created_at"], reverse=True):
        summaries.append({
            "id": s["id"],
            "name": s["name"],
            "tags": s["tags"],
            "created_at": s["created_at"],
            "stats": s["stats"],
        })
    return summaries


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a full session including results."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    del _sessions[session_id]
    return {"status": "deleted"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
