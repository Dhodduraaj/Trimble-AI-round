# Personal Spend Tracker

A small full-stack personal spending tracker built for hands-on debugging practice.

## Structure

- [`backend/`](backend/) — FastAPI + SQLite API
- [`frontend/`](frontend/) — React + Vite UI

## Prerequisites

- Python 3.11+
- Node.js 18+

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Authentication

The API uses HTTP Basic authentication. Default credentials:

- **Username:** `user`
- **Password:** `password`

Example:

```bash
curl -u user:password \
  -H "Content-Type: application/json" \
  -d '{"amount":25.5,"category":"food","description":"lunch","spent_on":"2026-07-15"}' \
  http://localhost:8000/entries
```

## API overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/entries` | Create an entry |
| GET | `/entries/date/{date}` | Get entries for one date |
| GET | `/entries/range?from_date=&to_date=` | Get entries in a date range |

## Challenge

Get all tests passing:

```bash
# Backend unit/integration tests
cd backend && pytest -v

# Frontend end-to-end tests
cd frontend && npm run test:e2e
```

## Sample entry

```json
{
  "amount": 25.50,
  "category": "food",
  "description": "lunch",
  "spent_on": "2026-07-15"
}
```
