from msgspec import Meta

DEPRECATED = Meta(extra_json_schema=dict(deprecated=True))
