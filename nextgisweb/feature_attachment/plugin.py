from nextgisweb.jsrealm import jsentry
from nextgisweb.webmap.plugin import WebmapPlugin

ENTRY = jsentry("@nextgisweb/feature-attachment/attachment-bundle/plugin")


class BundleAttachmentPlugin(WebmapPlugin):
    amd_free = True

    @classmethod
    def is_supported(cls, webmap):
        return (ENTRY, dict())
