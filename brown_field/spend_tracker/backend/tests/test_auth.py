from tests.helpers import auth_header, auth_header_with_trailing_space


def test_auth_rejects_missing_header(client):
    response = client.get("/entries/date/2026-07-15")
    assert response.status_code == 401


def test_auth_rejects_invalid_credentials(client):
    response = client.get(
        "/entries/date/2026-07-15",
        headers=auth_header("wrong", "creds"),
    )
    assert response.status_code == 401


def test_auth_accepts_valid_credentials(client):
    response = client.get(
        "/entries/date/2026-07-15",
        headers=auth_header(),
    )
    assert response.status_code == 200


def test_auth_accepts_valid_credentials_with_padding(client):
    response = client.get(
        "/entries/date/2026-07-15",
        headers=auth_header_with_trailing_space(),
    )
    assert response.status_code == 200
