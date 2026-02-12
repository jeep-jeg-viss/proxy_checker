import csv
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import requests

# ── Configuration ────────────────────────────────────────────────────────────
INPUT_FILE = "input.txt"
OUTPUT_DIR = "output"
DELIMITER = ":"                       # separator used in input.txt
FIELD_ORDER = ["ip", "port", "user", "pass"]  # order of fields in each line
CHECK_URL = "https://httpbin.org/ip"  # endpoint that returns the exit IP
TIMEOUT = 10                          # seconds per proxy check
MAX_WORKERS = 20                      # concurrent checks
PROXY_TYPE = "http"                   # "http" or "socks5"
# ─────────────────────────────────────────────────────────────────────────────


def parse_proxy(line: str) -> dict | None:
    """Parse a single line from the input file into a proxy dict."""
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    parts = line.split(DELIMITER)
    if len(parts) < 2:
        return None

    proxy = {}
    for i, field in enumerate(FIELD_ORDER):
        if i < len(parts):
            proxy[field] = parts[i].strip()

    if "ip" not in proxy or "port" not in proxy:
        return None

    return proxy


def build_proxy_url(proxy: dict) -> str:
    """Build the proxy URL string from parsed fields."""
    scheme = PROXY_TYPE
    if proxy.get("user") and proxy.get("pass"):
        return f"{scheme}://{proxy['user']}:{proxy['pass']}@{proxy['ip']}:{proxy['port']}"
    return f"{scheme}://{proxy['ip']}:{proxy['port']}"


def check_proxy(proxy: dict) -> dict:
    """
    Test a single proxy.  Returns a result dict with status and exit IP.
    """
    proxy_url = build_proxy_url(proxy)
    result = {
        "proxy_ip": proxy["ip"],
        "proxy_port": proxy["port"],
        "user": proxy.get("user", ""),
        "status": "FAIL",
        "exit_ip": "",
        "response_time_ms": "",
        "error": "",
    }

    proxies = {"http": proxy_url, "https": proxy_url}

    try:
        start = time.perf_counter()
        resp = requests.get(CHECK_URL, proxies=proxies, timeout=TIMEOUT)
        elapsed_ms = round((time.perf_counter() - start) * 1000)
        resp.raise_for_status()

        data = resp.json()
        exit_ip = data.get("origin", "").split(",")[0].strip()

        result["status"] = "OK"
        result["exit_ip"] = exit_ip
        result["response_time_ms"] = str(elapsed_ms)
    except Exception as exc:
        result["error"] = str(exc)[:120]

    return result


def load_proxies(path: str) -> list[dict]:
    """Read and parse all proxies from the input file."""
    if not os.path.isfile(path):
        print(f"[!] Input file not found: {path}")
        sys.exit(1)

    proxies = []
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            proxy = parse_proxy(line)
            if proxy is None:
                continue
            proxy["_line"] = lineno
            proxies.append(proxy)

    return proxies


def write_results(results: list[dict]) -> str:
    """Write results to a timestamped CSV and return the file path."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"proxy_results_{timestamp}.csv"
    filepath = os.path.join(OUTPUT_DIR, filename)

    fieldnames = [
        "proxy_ip",
        "proxy_port",
        "user",
        "status",
        "exit_ip",
        "response_time_ms",
        "error",
    ]

    with open(filepath, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow({k: r.get(k, "") for k in fieldnames})

    return filepath


def main():
    proxies = load_proxies(INPUT_FILE)
    if not proxies:
        print("[!] No proxies found in input file.")
        sys.exit(1)

    total = len(proxies)
    print(f"[*] Loaded {total} proxies from {INPUT_FILE}")
    print(f"[*] Checking with {MAX_WORKERS} threads …\n")

    results: list[dict] = []
    ok_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(check_proxy, p): p for p in proxies}
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            tag = "✓" if result["status"] == "OK" else "✗"
            ip_info = f" → {result['exit_ip']}" if result["exit_ip"] else ""
            print(f"  [{i}/{total}] {tag} {result['proxy_ip']}:{result['proxy_port']}{ip_info}")
            if result["status"] == "OK":
                ok_count += 1

    filepath = write_results(results)
    print(f"\n[✓] Done — {ok_count}/{total} proxies alive")
    print(f"[✓] Results saved to {filepath}")


if __name__ == "__main__":
    main()
