from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app import crud
from app.auth import verify_basic_auth
from app.database import get_connection, init_db
from app.models import EntryCreate, EntryResponse


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Personal Spend Tracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/entries", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry(
    entry: EntryCreate,
    _username: str = Depends(verify_basic_auth),
) -> EntryResponse:
    conn = get_connection()
    try:
        result = crud.create_entry(conn, entry)
    finally:
        conn.close()

    return result


@app.get("/entries/date/{date}", response_model=list[EntryResponse])
def get_entries_by_date(
    date: str,
    _username: str = Depends(verify_basic_auth),
) -> list[EntryResponse]:
    conn = get_connection()
    try:
        return crud.get_entries_by_date(conn, date)
    finally:
        conn.close()


@app.get("/entries/range", response_model=list[EntryResponse])
def get_entries_in_range(
    from_date: str,
    to_date: str,
    _username: str = Depends(verify_basic_auth),
) -> list[EntryResponse]:
    conn = get_connection()
    try:
        return crud.get_entries_in_range(conn, from_date, to_date)
    finally:
        conn.close()


@app.delete("/entries", status_code=status.HTTP_204_NO_CONTENT)
def clear_entries(_username: str = Depends(verify_basic_auth)) -> None:
    """Test helper to reset data."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM spend_entries")
        conn.commit()
    finally:
        conn.close()
