from humanize import naturalsize

__all__ = ["format_size"]


def format_size(value: int) -> str:
    return naturalsize(value, binary=True, format="%.0f")
