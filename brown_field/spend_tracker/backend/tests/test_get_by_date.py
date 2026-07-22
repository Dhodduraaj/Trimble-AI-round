from tests.helpers import auth_header


def test_get_by_date_returns_matching_entries(client, seeded_entries):
    response = client.get(
        "/entries/date/2026-07-15",
        headers=auth_header(),
    )
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) == 1
    assert entries[0]["amount"] == 25.5
    assert entries[0]["category"] == "transport"


def test_get_by_date_returns_empty_for_no_matches(client, seeded_entries):
    response = client.get(
        "/entries/date/2026-07-01",
        headers=auth_header(),
    )
    assert response.status_code == 200
    assert response.json() == []
