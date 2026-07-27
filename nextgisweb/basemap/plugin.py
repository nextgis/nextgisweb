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
                z_min=bm.resource.z_min,
                z_max=bm.resource.z_max,
                copyright_text=bm.resource.copyright_text,
                copyright_url=bm.resource.copyright_url,
                **bm.to_dict(),
            )
            for bm in webmap.basemaps
        ]
        bm_config = webmap.basemap_config
        disable = bm_config.disable if bm_config is not None else False
        background_color = bm_config.background_color if bm_config is not None else None
        return (
            cls.entrypoint,
            dict(basemaps=basemaps, disable=disable, background_color=background_color),
        )
