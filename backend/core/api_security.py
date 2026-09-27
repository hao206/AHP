"""Configuration and access checks for persisted decision projects."""

import hmac
import ipaddress
from urllib.parse import urlsplit


LOCAL_FRONTEND_ORIGINS = ("http://127.0.0.1:5175", "http://localhost:5175")


def allowed_origins(value=None):
    if value is None or not value.strip():
        return list(LOCAL_FRONTEND_ORIGINS)
    if value.strip() == "*":
        return ["*"]
    origins = [part.strip() for part in value.split(",") if part.strip()]
    if not origins:
        return list(LOCAL_FRONTEND_ORIGINS)
    if "*" in origins:
        return ["*"]
    validated = []
    for origin in origins:
        try:
            parsed = urlsplit(origin)
            _ = parsed.port
            valid = (parsed.scheme in ("http", "https") and parsed.hostname and
                     not parsed.username and not parsed.password and
                     not any(character.isspace() for character in origin))
        except ValueError:
            valid = False
        if not valid:
            raise ValueError(f"Invalid AHP_CORS_ORIGINS entry: {origin}")
        validated.append(f"{parsed.scheme}://{parsed.netloc}")
    return list(dict.fromkeys(validated))


def validate_project_token(token):
    if token and (len(token) < 32 or any(character.isspace() for character in token)):
        raise ValueError("AHP_PROJECT_API_TOKEN must contain at least 32 characters and no whitespace")
    return token


def is_loopback(host):
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except (ValueError, TypeError):
        return False


def project_access_error(token, authorization, server_host, client_host,
                         request_host, origin=None, request_origin=None, allowed=None,
                         method="GET"):
    """Return an HTTP status and message, or None when access is allowed."""
    allowed_list = allowed or ()
    if method in ("POST", "DELETE") and origin and origin != request_origin and "*" not in allowed_list and origin not in allowed_list:
        return 403, "This browser origin is not allowed to change projects"
    if token:
        scheme, separator, supplied = (authorization or "").partition(" ")
        if separator and scheme.lower() == "bearer" and hmac.compare_digest(supplied, token):
            return None
        return 401, "A valid project access token is required"
    if not all(is_loopback(host) for host in (server_host, client_host, request_host)):
        return 503, "Set AHP_PROJECT_API_TOKEN before exposing project storage beyond localhost"
    return None
