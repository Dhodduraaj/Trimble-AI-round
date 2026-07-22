import sqlite3

from app.models import EntryCreate, EntryResponse


def _row_to_entry(row: sqlite3.Row) -> EntryResponse:
    return EntryResponse(
        id=row["id"],
        amount=row["amount"],
        category=row["category"],
        description=row["description"],
        spent_on=row["spent_on"],
    )


def create_entry(conn: sqlite3.Connection, entry: EntryCreate) -> EntryResponse:
    amount = entry.amount
    cursor = conn.execute(
        """
        INSERT INTO spend_entries (amount, category, description, spent_on)
        VALUES (?, ?, ?, ?)
        """,
        (amount, entry.category, entry.description, entry.spent_on),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM spend_entries WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return _row_to_entry(row)


def get_entries_by_date(conn: sqlite3.Connection, date: str) -> list[EntryResponse]:
    rows = conn.execute(
        "SELECT * FROM spend_entries WHERE spent_on = ? ORDER BY id",
        (date,),
    ).fetchall()
    return [_row_to_entry(row) for row in rows]


def get_entries_in_range(
    conn: sqlite3.Connection, from_date: str, to_date: str
) -> list[EntryResponse]:
    rows = conn.execute(
        """
        SELECT * FROM spend_entries
        WHERE spent_on >= ? AND spent_on <= ?
        ORDER BY spent_on, id
        """,
        (from_date, to_date),
    ).fetchall()
    return [_row_to_entry(row) for row in rows]
