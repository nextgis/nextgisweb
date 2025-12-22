from typing import Any

from msgspec import UNSET
from msgspec.structs import asdict


def struct_items(struct) -> list[tuple[str, Any]]:
    """Get list of (attribute, value) pairs for msgspec.Struct, excluding UNSET values"""
    return [(attr, value) for attr, value in asdict(struct).items() if value is not UNSET]
