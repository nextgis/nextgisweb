from nextgisweb.jsrealm import jsentry

from .base import WebmapGroupPlugin


class ZoomToGroupPlugin(WebmapGroupPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/zoom-to-group")

    @classmethod
    def get_payload(cls, **kwargs):
        return dict()
