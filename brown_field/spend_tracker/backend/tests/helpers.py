import base64


def auth_header(username: str = "user", password: str = "password") -> dict[str, str]:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def auth_header_with_trailing_space() -> dict[str, str]:
    """Valid credentials but decoded string has trailing whitespace (B1)."""
    token = base64.b64encode(b"user:password ").decode()
    return {"Authorization": f"Basic {token}"}
