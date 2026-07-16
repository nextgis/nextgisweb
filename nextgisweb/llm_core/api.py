from nextgisweb.pyramid.api import csetting

base_url = csetting("base_url", str | None, default=None)
api_key = csetting("api_key", str | None, default=None)
model = csetting("model", str | None, default=None)
