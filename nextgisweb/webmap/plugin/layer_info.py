from nextgisweb.jsrealm import jsentry

from .base import WebmapLayerPlugin


class LayerInfoPlugin(WebmapLayerPlugin):
    entry = jsentry("@nextgisweb/webmap/plugin/layer-info")

    @classmethod
    def is_layer_supported(cls, *, style, layer, webmap):
        payload = dict()

        if v := style.description:
            payload["description"] = v
        elif v := layer.description:
            payload["description"] = v
        else:
            payload["description"] = None

        return (cls.entry, payload)
