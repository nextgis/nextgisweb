from datetime import datetime, timezone


def utcnow_naive():
    """Get the current UTC datetime as a naive `datetime` object

    This function serves as a replacement for `datetime.utcnow()`, which was
    deprecated in Python 3.12."""

    return datetime.now(timezone.utc).replace(tzinfo=None)
