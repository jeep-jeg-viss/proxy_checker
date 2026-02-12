"""
Async HTTP Stress Tester

Stress-test any HTTP URL with configurable concurrency, duration, and request count.

Usage:
    uv run stress_test.py <url> [options]

Examples:
    uv run stress_test.py https://httpbin.org/get --duration 10 --concurrency 100
    uv run stress_test.py https://example.com/api -n 500 -c 50
    uv run stress_test.py https://example.com -d 30 -c 200 --method POST --body '{"key":"val"}'
"""

import argparse
import asyncio
import statistics
import time
from dataclasses import dataclass, field

import aiohttp


@dataclass
class StressConfig:
    """Configuration for a stress test run."""

    url: str
    method: str = "GET"
    concurrency: int = 100
    total_requests: int | None = None  # None = unlimited (use duration)
    duration: float | None = 10.0  # seconds; None = use total_requests
    timeout: float = 10.0
    headers: dict[str, str] = field(default_factory=dict)
    body: str | None = None


@dataclass
class RequestResult:
    """Result of a single HTTP request."""

    status: int | None = None
    latency: float = 0.0  # seconds
    error: str | None = None
    bytes_received: int = 0


@dataclass
class StressReport:
    """Aggregated report of a stress test run."""

    total_requests: int = 0
    successful: int = 0
    failed: int = 0
    elapsed: float = 0.0
    latencies: list[float] = field(default_factory=list)
    status_codes: dict[int, int] = field(default_factory=dict)
    errors: dict[str, int] = field(default_factory=dict)
    total_bytes: int = 0

    @property
    def rps(self) -> float:
        return self.total_requests / self.elapsed if self.elapsed > 0 else 0

    @property
    def avg_latency(self) -> float:
        return statistics.mean(self.latencies) if self.latencies else 0

    @property
    def p50(self) -> float:
        return statistics.median(self.latencies) if self.latencies else 0

    @property
    def p95(self) -> float:
        return _percentile(self.latencies, 95) if self.latencies else 0

    @property
    def p99(self) -> float:
        return _percentile(self.latencies, 99) if self.latencies else 0

    @property
    def min_latency(self) -> float:
        return min(self.latencies) if self.latencies else 0

    @property
    def max_latency(self) -> float:
        return max(self.latencies) if self.latencies else 0


def _percentile(data: list[float], pct: float) -> float:
    """Calculate the given percentile from a sorted-on-the-fly list."""
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (pct / 100)
    f = int(k)
    c = f + 1
    if c >= len(sorted_data):
        return sorted_data[f]
    return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])


async def _do_request(
    session: aiohttp.ClientSession,
    config: StressConfig,
) -> RequestResult:
    """Execute a single HTTP request and return its result."""
    start = time.perf_counter()
    try:
        async with session.request(
            config.method,
            config.url,
            headers=config.headers or None,
            data=config.body,
            timeout=aiohttp.ClientTimeout(total=config.timeout),
            ssl=False,
        ) as resp:
            body = await resp.read()
            latency = time.perf_counter() - start
            return RequestResult(
                status=resp.status,
                latency=latency,
                bytes_received=len(body),
            )
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        latency = time.perf_counter() - start
        return RequestResult(latency=latency, error=type(exc).__name__)


async def _worker(
    session: aiohttp.ClientSession,
    config: StressConfig,
    results: list[RequestResult],
    stop_event: asyncio.Event,
    semaphore: asyncio.Semaphore,
) -> None:
    """Worker that keeps firing requests until stopped."""
    while not stop_event.is_set():
        async with semaphore:
            if stop_event.is_set():
                break
            result = await _do_request(session, config)
            results.append(result)


async def run_stress_test(config: StressConfig) -> StressReport:
    """
    Run the stress test with the given configuration.

    - If `total_requests` is set, sends exactly that many requests.
    - If `duration` is set (and total_requests is None), runs for that many seconds.
    - Concurrency is controlled by `config.concurrency`.
    """
    results: list[RequestResult] = []
    stop_event = asyncio.Event()
    semaphore = asyncio.Semaphore(config.concurrency)

    connector = aiohttp.TCPConnector(limit=config.concurrency, limit_per_host=config.concurrency)
    async with aiohttp.ClientSession(connector=connector) as session:
        wall_start = time.perf_counter()

        if config.total_requests is not None:
            # Fixed number of requests mode
            tasks = []
            for _ in range(config.total_requests):
                tasks.append(_do_request(session, config))
            # Run with bounded concurrency
            sem = asyncio.Semaphore(config.concurrency)

            async def _bounded(coro):
                async with sem:
                    return await coro

            results = await asyncio.gather(*[_bounded(t) for t in tasks])
            results = list(results)
        else:
            # Duration-based mode
            workers = [
                asyncio.create_task(
                    _worker(session, config, results, stop_event, semaphore)
                )
                for _ in range(config.concurrency)
            ]
            if not config.duration:
                print("[!] Error: Either total_requests or duration must be set.")
                return StressReport()
            await asyncio.sleep(config.duration)
            stop_event.set()
            await asyncio.gather(*workers, return_exceptions=True)

        wall_end = time.perf_counter()

    # Build report
    report = StressReport(elapsed=wall_end - wall_start)
    for r in results:
        report.total_requests += 1
        report.total_bytes += r.bytes_received
        if r.error:
            report.failed += 1
            report.errors[r.error] = report.errors.get(r.error, 0) + 1
        else:
            report.successful += 1
            report.latencies.append(r.latency)
            if r.status is not None:
                report.status_codes[r.status] = report.status_codes.get(r.status, 0) + 1

    return report


def print_report(report: StressReport, config: StressConfig) -> None:
    """Pretty-print the stress test results."""
    print("\n" + "=" * 64)
    print("  STRESS TEST REPORT")
    print("=" * 64)
    print(f"  Target URL       : {config.url}")
    print(f"  Method           : {config.method}")
    print(f"  Concurrency      : {config.concurrency}")
    if config.total_requests:
        print(f"  Total Requests   : {config.total_requests} (fixed)")
    else:
        print(f"  Duration         : {config.duration}s")
    print("-" * 64)
    print(f"  Requests Made    : {report.total_requests}")
    print(f"  Successful       : {report.successful}")
    print(f"  Failed           : {report.failed}")
    print(f"  Elapsed          : {report.elapsed:.2f}s")
    print(f"  Throughput       : {report.rps:.1f} req/s")
    print(f"  Data Received    : {report.total_bytes / 1024:.1f} KB")
    print("-" * 64)

    if report.latencies:
        print(f"  Avg Latency      : {report.avg_latency * 1000:.1f} ms")
        print(f"  Min Latency      : {report.min_latency * 1000:.1f} ms")
        print(f"  Max Latency      : {report.max_latency * 1000:.1f} ms")
        print(f"  P50 Latency      : {report.p50 * 1000:.1f} ms")
        print(f"  P95 Latency      : {report.p95 * 1000:.1f} ms")
        print(f"  P99 Latency      : {report.p99 * 1000:.1f} ms")
    else:
        print("  (no successful requests — latency stats unavailable)")

    print("-" * 64)

    if report.status_codes:
        print("  Status Codes:")
        for code, count in sorted(report.status_codes.items()):
            print(f"    {code} : {count}")

    if report.errors:
        print("  Errors:")
        for err, count in sorted(report.errors.items(), key=lambda x: -x[1]):
            print(f"    {err} : {count}")

    print("=" * 64 + "\n")


def parse_args(argv: list[str] | None = None) -> StressConfig:
    parser = argparse.ArgumentParser(
        description="Async HTTP stress tester",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run stress_test.py https://httpbin.org/get -d 10 -c 100
  uv run stress_test.py https://example.com/api -n 500 -c 50
  uv run stress_test.py https://example.com -d 30 -c 200 --method POST --body '{"k":"v"}'
        """,
    )
    parser.add_argument("url", help="Target URL to stress test")
    parser.add_argument(
        "-c", "--concurrency", type=int, default=100,
        help="Number of concurrent connections (default: 100)",
    )
    parser.add_argument(
        "-n", "--requests", type=int, default=None,
        help="Total number of requests to send (overrides --duration)",
    )
    parser.add_argument(
        "-d", "--duration", type=float, default=10.0,
        help="Test duration in seconds (default: 10, ignored if -n is set)",
    )
    parser.add_argument(
        "-t", "--timeout", type=float, default=10.0,
        help="Per-request timeout in seconds (default: 10)",
    )
    parser.add_argument(
        "--method", default="GET",
        help="HTTP method (default: GET)",
    )
    parser.add_argument(
        "--header", action="append", default=[],
        help="HTTP header in 'Key: Value' format (repeatable)",
    )
    parser.add_argument(
        "--body", default=None,
        help="Request body string (for POST/PUT/PATCH)",
    )

    args = parser.parse_args(argv)

    headers = {}
    for h in args.header:
        key, _, value = h.partition(":")
        headers[key.strip()] = value.strip()

    return StressConfig(
        url=args.url,
        method=args.method.upper(),
        concurrency=args.concurrency,
        total_requests=args.requests,
        duration=args.duration if args.requests is None else None,
        timeout=args.timeout,
        headers=headers,
        body=args.body,
    )


async def main() -> None:
    config = parse_args()

    mode = (
        f"{config.total_requests} requests"
        if config.total_requests
        else f"{config.duration}s duration"
    )
    print(f"\nStress testing {config.url}")
    print(f"  {mode}, concurrency={config.concurrency}\n")

    report = await run_stress_test(config)
    print_report(report, config)


if __name__ == "__main__":
    asyncio.run(main())
