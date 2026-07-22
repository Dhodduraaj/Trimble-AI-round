# Personal Spend Tracker — Frontend

React + Vite UI for the spend tracker API.

## Setup

```bash
cd frontend
npm install
```

## Run

Start the backend first (see `../backend/README.md`), then:

```bash
npm run dev
```

App: http://localhost:5173

Optional env vars in `.env`:

```
VITE_API_URL=http://localhost:8000
VITE_API_USER=user
VITE_API_PASSWORD=password
```

## E2E tests

Requires the backend running on port 8000 (Playwright config starts both servers automatically):

```bash
npm run test:e2e
```

Install browsers on first run:

```bash
npx playwright install chromium
```
