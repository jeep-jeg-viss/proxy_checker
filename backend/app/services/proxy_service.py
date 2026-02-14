import time
import uuid

import requests


def parse_proxy(line: str, delimiter: str, field_order: list[str]) -> dict[str, str] | None:
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    parts = line.split(delimiter)
    if len(parts) < 2:
        return None

    proxy: dict[str, str] = {}
    for index, field_name in enumerate(field_order):
        if index < len(parts):
            proxy[field_name] = parts[index].strip()

    if "ip" not in proxy or "port" not in proxy:
        return None
    return proxy


def build_proxy_url(proxy: dict[str, str], proxy_type: str) -> str:
    if proxy.get("user") and proxy.get("pass"):
        return f"{proxy_type}://{proxy['user']}:{proxy['pass']}@{proxy['ip']}:{proxy['port']}"
    return f"{proxy_type}://{proxy['ip']}:{proxy['port']}"


def check_proxy_sync(
    proxy: dict[str, str],
    check_url: str,
    timeout: int,
    proxy_type: str,
) -> dict:
    proxy_url = build_proxy_url(proxy, proxy_type)
    result = {
        "id": str(uuid.uuid4()),
        "proxy_ip": proxy["ip"],
        "proxy_port": proxy["port"],
        "user": proxy.get("user", ""),
        "password": proxy.get("pass", proxy.get("password", "")),
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
        response = requests.get(check_url, proxies=proxies, timeout=timeout)
        elapsed_ms = round((time.perf_counter() - start) * 1000)
        response.raise_for_status()

        data = response.json()
        exit_ip = str(data.get("origin", "")).split(",")[0].strip()

        result["status"] = "OK"
        result["exit_ip"] = exit_ip
        result["response_time_ms"] = elapsed_ms
    except Exception as exc:  # pragma: no cover - network/runtime dependent
        result["error"] = str(exc)[:200]

    return result
