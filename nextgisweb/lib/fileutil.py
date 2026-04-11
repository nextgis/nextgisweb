from pathlib import Path


def update_text_file(path: Path, content: str) -> None:
    """Write text content to a file, but only if it has changed

    This allows to avoid unnecessary writes which can trigger watchers and
    rebuilds in development mode."""

    encoded = content.encode("utf-8")
    if not path.exists() or path.stat().st_size != len(encoded) or path.read_bytes() != encoded:
        path.write_bytes(encoded)
