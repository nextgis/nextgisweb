from datetime import UTC, datetime

__all__ = ["utcnow_naive"]


def utcnow_naive() -> datetime:
    """Get the current UTC datetime as a naive `datetime` object

    This function serves as a replacement for `datetime.utcnow()`, which was
    deprecated in Python 3.12."""

    return datetime.now(UTC).replace(tzinfo=None)
