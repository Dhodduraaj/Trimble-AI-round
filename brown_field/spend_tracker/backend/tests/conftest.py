import os
import sqlite3
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from tests.helpers import auth_header

os.environ.setdefault("SPEND_TRACKER_USER", "user")
os.environ.setdefault("SPEND_TRACKER_PASSWORD", "password")


@pytest.fixture()
def db_path(tmp_path) -> str:
    path = str(tmp_path / "test.db")
    os.environ["SPEND_TRACKER_DB"] = path
    return path


@pytest.fixture()
def client(db_path: str) -> Generator[TestClient, None, None]:
    from app.database import init_db
    from app.main import app

    init_db()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def seeded_entries(client: TestClient) -> list[dict]:
    client.delete("/entries", headers=auth_header())
    entries = [
        {
            "amount": 10.0,
            "category": "food",
            "description": "breakfast",
            "spent_on": "2026-07-10",
        },
        {
            "amount": 25.5,
            "category": "transport",
            "description": "bus",
            "spent_on": "2026-07-15",
        },
        {
            "amount": 40.0,
            "category": "food",
            "description": "dinner",
            "spent_on": "2026-07-20",
        },
    ]
    created = []
    for entry in entries:
        response = client.post("/entries", json=entry, headers=auth_header())
        assert response.status_code in (200, 201)
        created.append(response.json())
    return created
