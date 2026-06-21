from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerInfoPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-info")

    @classmethod
    def get_payload(cls, *, style, layer, **kwargs):
        payload = dict()

        if v := style.description:
            payload["description"] = v
        elif v := layer.description:
            payload["description"] = v
        else:
            payload["description"] = None

        return payload
