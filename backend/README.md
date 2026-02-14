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

## Auth0 API Auth

- Configure `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, and `AUTH0_ISSUER` in `backend/.env`.
- API routes under `/api/check` and `/api/sessions*` require a valid bearer token.
- Sessions are scoped to the authenticated user (`sub`) so users only see their own runs.
- If you already created `proxy_sessions` before auth was added, recreate/migrate that table to include `owner_sub`.

## CLI Tools

```bash
cd backend
uv run main.py
uv run stress_test.py <url> [options]
```
