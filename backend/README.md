# Proxy Checker Backend

FastAPI backend extracted into its own folder with layered architecture:

- `app/api`: route handlers and dependency wiring
- `app/services`: proxy checking, streaming, and GeoIP orchestration
- `app/repositories`: database-backed storage abstraction (`SessionRepository`)
- `app/models`: SQLAlchemy persistence models
- `app/schemas`: request/response models
- `app/core`: application config and database wiring

## Run

```bash
cd backend
Copy-Item .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## Supabase Postgres

- Set `DATABASE_URL` in `backend/.env` (template in `backend/.env.example`).
- Use async SQLAlchemy URL format: `postgresql+asyncpg://...`
- The API auto-creates required tables on startup when `DB_AUTO_CREATE=true`.

## CLI Tools

```bash
cd backend
uv run main.py
uv run stress_test.py <url> [options]
```
