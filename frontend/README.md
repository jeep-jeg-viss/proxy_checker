# Proxy Checker Frontend

Next.js dashboard UI for Proxy Checker.

## Auth0 Setup

1. Copy env template:
   - `Copy-Item .env.example .env.local`
2. Configure:
   - optional `BACKEND_URL` (default: `http://localhost:8000`)
   - `NEXT_PUBLIC_AUTH0_DOMAIN`
   - `NEXT_PUBLIC_AUTH0_CLIENT_ID`
   - `NEXT_PUBLIC_AUTH0_AUDIENCE`
   - optional `NEXT_PUBLIC_AUTH0_SCOPE`

## Run

```bash
cd frontend
npm install
npm run dev
```
