from typing import Any

from requests import Response


def response_diagnostics(response: Response) -> dict[str, Any]:
    """Extract diagnostic fields from an HTTP response

    Intended for populating ``UserException.data`` when reporting an
    external service failure to the user, not for general-purpose response
    inspection."""

    return dict(
        status_code=response.status_code,
        content_type=response.headers.get("Content-Type"),
    )
