# Proxy Checker & HTTP Stress Tester

A toolkit for checking proxy servers and stress-testing HTTP endpoints, with a FastAPI backend and Next.js frontend.

## Prerequisites

- **Python 3.13+** and [uv](https://docs.astral.sh/uv/) (for backend)
- **Node.js 18+** and **npm** (for frontend)

---

## Quick Start

### 1. Install Dependencies

```bash
# Backend (from project root)
uv sync

# Frontend
cd frontend
npm install
```

### 2. Start the Backend

Open a terminal in the **project root** and run:

```bash
uv run uvicorn api:app --reload --port 8000
```

The API will be available at **http://localhost:8000**. You can verify it's running with:

```bash
curl http://localhost:8000/api/health
# → {"status":"ok"}
```

### 3. Start the Frontend

Open a **second terminal**, navigate to the `frontend/` directory, and run:

```bash
cd frontend
npm run dev
```

The app will be available at **http://localhost:3000**. The frontend automatically proxies all `/api/*` requests to the backend on port 8000.

### 4. Open the App

Navigate to [http://localhost:3000](http://localhost:3000) in your browser — you're all set!

---

## Proxy Checker (`main.py`)

Bulk-check a list of proxies for connectivity and anonymity. Each proxy is tested against a remote endpoint to verify it works and to discover the exit IP.

### Input Format

Create an `input.txt` file with one proxy per line:

```
ip:port
ip:port:username:password
```

### Configuration

Edit the constants at the top of `main.py`:

| Variable       | Default                    | Description                          |
| -------------- | -------------------------- | ------------------------------------ |
| `INPUT_FILE`   | `input.txt`                | Path to the proxy list               |
| `OUTPUT_DIR`   | `output`                   | Directory for result CSVs            |
| `DELIMITER`    | `:`                        | Separator used in input lines        |
| `FIELD_ORDER`  | `ip, port, user, pass`     | Order of fields per line             |
| `CHECK_URL`    | `https://httpbin.org/ip`   | Endpoint used to verify the proxy    |
| `TIMEOUT`      | `10`                       | Seconds per proxy check              |
| `MAX_WORKERS`  | `20`                       | Number of concurrent threads         |
| `PROXY_TYPE`   | `http`                     | `http` or `socks5`                   |

### Usage

```bash
uv run main.py
```

Results are saved to `output/proxy_results_<timestamp>.csv` with columns:

`proxy_ip`, `proxy_port`, `user`, `status`, `exit_ip`, `response_time_ms`, `error`

---

## HTTP Stress Tester (`stress_test.py`)

Async HTTP stress tester powered by `aiohttp`. Hammers any URL with configurable concurrency, duration, or request count and reports detailed latency statistics.

### Usage

```bash
uv run stress_test.py <url> [options]
```

### Options

| Flag                  | Description                                      | Default |
| --------------------- | ------------------------------------------------ | ------- |
| `-c`, `--concurrency` | Number of concurrent connections                 | `100`   |
| `-n`, `--requests`    | Total requests to send (overrides `--duration`)  | —       |
| `-d`, `--duration`    | Test duration in seconds                         | `10`    |
| `-t`, `--timeout`     | Per-request timeout in seconds                   | `10`    |
| `--method`            | HTTP method                                      | `GET`   |
| `--header`            | Header in `Key: Value` format (repeatable)       | —       |
| `--body`              | Request body string (for POST/PUT/PATCH)         | —       |

### Examples

```bash
# Run for 10 seconds with 100 concurrent connections
uv run stress_test.py https://httpbin.org/get -d 10 -c 100

# Send exactly 500 requests with 50 concurrent connections
uv run stress_test.py https://example.com/api -n 500 -c 50

# POST with a JSON body for 30 seconds
uv run stress_test.py https://example.com/api -d 30 -c 200 \
  --method POST \
  --header "Content-Type: application/json" \
  --body '{"key": "value"}'
```

### Sample Output

```
================================================================
  STRESS TEST REPORT
================================================================
  Target URL       : https://httpbin.org/get
  Method           : GET
  Concurrency      : 20
  Duration         : 5.0s
----------------------------------------------------------------
  Requests Made    : 186
  Successful       : 185
  Failed           : 1
  Elapsed          : 10.40s
  Throughput       : 17.9 req/s
  Data Received    : 56.0 KB
----------------------------------------------------------------
  Avg Latency      : 573.7 ms
  Min Latency      : 206.6 ms
  Max Latency      : 2055.4 ms
  P50 Latency      : 397.6 ms
  P95 Latency      : 1332.9 ms
  P99 Latency      : 1876.5 ms
----------------------------------------------------------------
  Status Codes:
    200 : 183
    502 : 2
  Errors:
    TimeoutError : 1
================================================================
```
