# Proxy Checker Backend

FastAPI backend extracted into its own folder with layered architecture:

- `app/api`: route handlers and dependency wiring
- `app/services`: proxy checking, streaming, and GeoIP orchestration
- `app/repositories`: storage abstraction (`SessionRepository`)
- `app/schemas`: request/response models
- `app/core`: application config

## Run

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```
