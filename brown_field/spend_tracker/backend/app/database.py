import os
import sqlite3
from pathlib import Path

DB_PATH = os.environ.get("SPEND_TRACKER_DB", str(Path(__file__).parent.parent / "spend_tracker.db"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS spend_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                spent_on TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()
