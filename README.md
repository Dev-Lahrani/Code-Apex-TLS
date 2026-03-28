# CodeApex TLS

Threshold-locked. Cryptographically secured.

CodeApex TLS is a zero-trust document collaboration platform where no single user can unilaterally unlock sensitive content. Documents are encrypted with AES-256-GCM, encryption keys are split with Shamir's Secret Sharing, and access is granted only when the required participant approval threshold is met.

This project was built to demonstrate real security primitives in a practical product workflow: create, request, approve, decrypt, edit, and audit.

## Why this project stands out
- Real cryptography, not mock security.
- Threshold approvals enforced before decryption.
- Immutable-style activity trail with SHA-256 hashing.
- AI-assisted anomaly detection on document edits.
- Optional blockchain anchoring for audit events.
- End-to-end full stack product: FastAPI + PostgreSQL + Next.js.

## Core capabilities
- Secure document creation with encrypted storage.
- Per-document threshold models:
  - `fixed`
  - `percentage`
  - `smart`
- Participant-based access request workflow.
- Multi-party approvals with automatic threshold evaluation.
- Controlled unlock and edit flow for approved requesters.
- Activity timeline and audit log visibility.
- Hybrid anomaly detection (TinyLlama JSON classifier + secure rule-based fallback).

## Security model
1. Document content is encrypted with AES-256-GCM.
2. Encryption key is split into participant shares using Shamir's Secret Sharing.
3. A participant requests access.
4. Other participants approve the request.
5. Once threshold is met, key shares are reconstructed and decryption is allowed.
6. Critical actions are logged with SHA-256 hashes (and optionally anchored on-chain).

## Anomaly detection
CodeApex TLS includes anomaly scoring for document edits via `app/services/anomaly_service.py`.

How it works:
- Sends content to a local TinyLlama model through Ollama (`/api/generate`).
- Enforces JSON output format: `{"risk_score": <0-1>, "label": "safe|suspicious"}`.
- If model output is malformed, attempts JSON extraction from raw response.
- If parsing still fails, falls back to deterministic pattern checks on original content (SQL injection, shell abuse, command execution patterns, etc.).
- This avoids false positives from prose-only LLM responses.

Runtime behavior:
- Returns `risk_score` clamped to `[0.0, 1.0]`.
- Uses label values: `safe` or `suspicious`.
- Gracefully degrades to safe defaults if the model endpoint is unavailable.

## Tech stack
- Backend: FastAPI, SQLAlchemy (async), PostgreSQL, Alembic
- Frontend: Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- Crypto: pycryptodomex
- Optional infra: Redis, Ethereum-compatible RPC

## Repository structure
- `app/` FastAPI backend (API, services, models, crypto utilities)
- `tls_frontend/` Next.js frontend
- `contracts/` Solidity contract for action logging
- `alembic/` Migration scaffold

## Quick start

### 1) Clone and configure
```bash
git clone https://github.com/Dev-Lahrani/Code-Apex-TLS.git
cd Code-Apex-TLS
cp .env.example .env
```

Set required values in `.env` (especially `DATABASE_URL`).

### 2) Backend setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run migrations:
```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

Start API:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend docs:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

### 3) Frontend setup
```bash
cd tls_frontend
pnpm install
pnpm dev
```

Default API base is `http://localhost:8000/api` unless overridden by `NEXT_PUBLIC_API_BASE_URL`.

## API highlights (prefix: `/api`)
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /users`
- `GET /users`
- `GET /users/{user_id}`
- `POST /documents`
- `GET /documents?user_id=...`
- `GET /documents/{id}` (requires approved request)
- `POST /documents/{id}/edit`
- `GET /documents/{id}/logs`
- `POST /documents/{id}/request-access`
- `POST /requests/{request_id}/approve`

## Environment variables

Required:
- `DATABASE_URL` (example: `postgresql+asyncpg://user:pass@localhost:5432/codeapex`)

Optional:
- `REDIS_ENABLED`
- `REDIS_URL`
- `ACCESS_REQUEST_TTL_SECONDS` (default: 3600)

Optional local AI runtime:
- Ollama running at `http://localhost:11434`
- TinyLlama model available in Ollama (`tinyllama`)

Optional blockchain anchoring:
- `BLOCKCHAIN_ENABLED`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_CONTRACT_ADDRESS`
- `BLOCKCHAIN_CHAIN_ID`
- `BLOCKCHAIN_SENDER_ADDRESS`

## Smart contract
`contracts/ActionLogger.sol` exposes `logAction` and emits `ActionLogged`, enabling verifiable audit anchoring when blockchain mode is enabled.

## Demo-ready narrative (for judges)
- "No single insider can unlock sensitive documents."
- "Access is mathematically threshold-gated."
- "Every critical action is traceable and tamper-evident."
- "The system balances usability and strong cryptographic guarantees."

## Team note
CodeApex TLS is designed as a hackathon-ready prototype with production-minded security architecture and clear extension points for enterprise-grade hardening.
