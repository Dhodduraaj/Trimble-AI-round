# Personal Spend Tracker — Backend

FastAPI service backed by SQLite for tracking personal spending.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Default credentials

- Username: `user`
- Password: `password`

Send credentials via HTTP Basic auth:

```bash
curl -u user:password http://localhost:8000/entries/date/2026-07-15
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/entries` | Create a spend entry |
| GET | `/entries/date/{date}` | List entries for a date (`YYYY-MM-DD`) |
| GET | `/entries/range?from_date=...&to_date=...` | List entries in a date range |
| DELETE | `/entries` | Clear all entries (testing helper) |

## Tests

```bash
pytest -v
```
