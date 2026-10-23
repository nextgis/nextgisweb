from msgspec import Meta

__all__ = ["DEPRECATED"]

DEPRECATED = Meta(extra_json_schema={"deprecated": True})
