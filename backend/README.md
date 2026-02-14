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

## Run With Docker Compose

```bash
cd backend
Copy-Item .env.example .env
docker compose up --build
```

- Service name: `backend`
- API URL: `http://localhost:8000`
- Compose passes values from `backend/.env` into the container via `env_file`.

## Supabase Postgres

- Set `DATABASE_URL` in `backend/.env` (template in `backend/.env.example`).
- Use async SQLAlchemy URL format: `postgresql+asyncpg://...`
- The API auto-creates required tables on startup when `DB_AUTO_CREATE=true`.
- For Supabase pooler endpoints (`*.pooler.supabase.com`), keep `DB_STATEMENT_CACHE_SIZE=0` to avoid asyncpg prepared statement conflicts.

## Auth0 API Auth

- Configure `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, and `AUTH0_ISSUER` in `backend/.env`.
- Set `PROXY_PASSWORD_SECRET` in `backend/.env` to encrypt proxy passwords at rest in `proxy_sessions.results`.
- API routes under `/api/check` and `/api/sessions*` require a valid bearer token.
- Sessions are scoped to the authenticated user (`sub`) so users only see their own runs.
- If you already created `proxy_sessions` before auth was added, startup now auto-migrates the table to include `owner_sub` when `DB_AUTO_CREATE=true`.
- If your DB role cannot alter schema, run this once manually:
  - `ALTER TABLE proxy_sessions ADD COLUMN IF NOT EXISTS owner_sub VARCHAR(255) NOT NULL DEFAULT '__legacy__';`
  - `CREATE INDEX IF NOT EXISTS ix_proxy_sessions_owner_sub ON proxy_sessions (owner_sub);`

## CLI Tools

```bash
cd backend
uv run main.py
uv run stress_test.py <url> [options]
```
