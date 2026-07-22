import base64
import os
from fastapi import Header, HTTPException, status

DEFAULT_USERNAME = os.environ.get("SPEND_TRACKER_USER", "user")
DEFAULT_PASSWORD = os.environ.get("SPEND_TRACKER_PASSWORD", "password")


def verify_basic_auth(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    scheme, _, credentials = authorization.partition(" ")
    if scheme.lower() != "basic" or not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme",
        )

    try:
        decoded = base64.b64decode(credentials).decode("utf-8")
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials encoding",
        ) from exc

    username, _, password = decoded.partition(":")
    username = username.strip()
    password = password.strip()
    if username != DEFAULT_USERNAME or password != DEFAULT_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return username
