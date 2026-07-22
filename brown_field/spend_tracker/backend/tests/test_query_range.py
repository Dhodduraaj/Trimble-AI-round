from tests.helpers import auth_header


def test_range_includes_boundary_dates(client, seeded_entries):
    response = client.get(
        "/entries/range",
        params={"from_date": "2026-07-10", "to_date": "2026-07-20"},
        headers=auth_header(),
    )
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) == 3
    dates = [entry["spent_on"] for entry in entries]
    assert dates == ["2026-07-10", "2026-07-15", "2026-07-20"]


def test_range_single_day(client, seeded_entries):
    response = client.get(
        "/entries/range",
        params={"from_date": "2026-07-15", "to_date": "2026-07-15"},
        headers=auth_header(),
    )
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) == 1
    assert entries[0]["spent_on"] == "2026-07-15"
