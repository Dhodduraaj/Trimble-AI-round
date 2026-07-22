from tests.helpers import auth_header


def test_create_entry_returns_201(client):
    payload = {
        "amount": 12.75,
        "category": "food",
        "description": "snack",
        "spent_on": "2026-07-15",
    }
    response = client.post("/entries", json=payload, headers=auth_header())
    assert response.status_code == 201
    body = response.json()
    assert body["amount"] == 12.75
    assert body["category"] == "food"
    assert body["description"] == "snack"
    assert body["spent_on"] == "2026-07-15"
    assert "id" in body


def test_create_accepts_negative_ten_dollars(client):
    """Refunds are allowed down to -10.00 inclusive."""
    payload = {
        "amount": -10.0,
        "category": "food",
        "description": "refund",
        "spent_on": "2026-07-15",
    }
    response = client.post("/entries", json=payload, headers=auth_header())
    assert response.status_code == 201


def test_create_rejects_negative_ten_dollars(client):
    """Refunds are allowed down to -10.00 exclusive."""
    payload = {
        "amount": -10.01,
        "category": "food",
        "description": "refund",
        "spent_on": "2026-07-15",
    }
    response = client.post("/entries", json=payload, headers=auth_header())
    assert response.status_code == 422