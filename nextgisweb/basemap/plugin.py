from nextgisweb.jsrealm import jsentry
from nextgisweb.webmap.plugin import WebmapPlugin


class BasemapPlugin(WebmapPlugin):
    entrypoint = jsentry("@nextgisweb/basemap/plugin/base-map")

    @classmethod
    def is_supported(cls, webmap):
        # TODO: Security
        basemaps = [
            dict(
                url=bm.resource.url,
                qms=bm.resource.qms,
                copyright_text=bm.resource.copyright_text,
                copyright_url=bm.resource.copyright_url,
                **bm.to_dict(),
            )
            for bm in webmap.basemaps
        ]
        return (cls.entrypoint, dict(basemaps=basemaps))
