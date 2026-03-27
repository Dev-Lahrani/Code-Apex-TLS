# CodeApex TLS

Zero-trust document collaboration stack with a FastAPI backend and a Next.js frontend. Documents are encrypted with AES-256, split into key shares via Shamir Secret Sharing, and unlocked only after threshold approvals. Optional blockchain logging can emit activity proofs on-chain.

## Repository layout
- `app/` FastAPI application (models, services, API routes)
- `tls_frontend/` Next.js 16 UI (App Router, pnpm)
- `contracts/` Solidity ActionLogger for on-chain audit events
- `alembic/` Database migrations scaffold

## Prerequisites
- Python 3.12+
- PostgreSQL (for `asyncpg` DSN)
- pnpm 10.x (frontend)
- Redis and an EVM RPC endpoint are optional

## Backend setup
1) Copy environment template: `cp .env.example .env` and fill values (notably `DATABASE_URL`).
2) Create a virtual env and install deps:
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
3) Initialize the database (versions folder is empty by default):
```
alembic revision --autogenerate -m "init"
alembic upgrade head
```
4) Run the API:
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Docs are served at `/docs` and `/redoc`.

## Frontend setup
1) `cd tls_frontend`
2) `pnpm install`
3) `pnpm dev` (default API base: `http://localhost:8000/api`; override with `NEXT_PUBLIC_API_BASE_URL`)

## Core concepts
- Users own documents and can be participants.
- Documents store encrypted content plus a threshold rule (`fixed`, `percentage`, or `smart` weighting owners).
- Participants hold Shamir key shares; approvals reconstruct the encryption key.
- Access requests move from `pending` to `approved` once the threshold is met.
- Activity logs capture key actions; optional blockchain logging can mirror events on-chain.

## API surface (prefix `/api`)
- `GET /health` health check
- Auth: `POST /auth/register`, `POST /auth/login`
- Users: `POST /users`, `GET /users`, `GET /users/{user_id}`
- Documents: `POST /documents`, `GET /documents?user_id=...`, `GET /documents/{id}` (requires approved request), `POST /documents/{id}/edit`, `GET /documents/{id}/logs`
- Access flow: `POST /documents/{id}/request-access`, `POST /requests/{request_id}/approve`

## Environment reference
- Required: `DATABASE_URL` (e.g., `postgresql+asyncpg://user:pass@localhost:5432/codeapex`)
- Optional: `REDIS_ENABLED`, `REDIS_URL`
- Optional blockchain: `BLOCKCHAIN_ENABLED`, `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, `BLOCKCHAIN_CONTRACT_ADDRESS`, `BLOCKCHAIN_CHAIN_ID`, `BLOCKCHAIN_SENDER_ADDRESS`
- Access TTL (default 1h): `ACCESS_REQUEST_TTL_SECONDS`

## Smart contract
`contracts/ActionLogger.sol` exposes `logAction` and an `ActionLogged` event for on-chain auditability when blockchain logging is enabled.
