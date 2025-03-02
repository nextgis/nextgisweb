from nextgisweb.jsrealm import jsentry
from nextgisweb.webmap.plugin import WebmapPlugin


class BundleAttachmentPlugin(WebmapPlugin):
    entry = jsentry("@nextgisweb/feature-attachment/attachment-bundle/plugin")

    @classmethod
    def is_supported(cls, webmap):
        return (cls.entry, dict())
