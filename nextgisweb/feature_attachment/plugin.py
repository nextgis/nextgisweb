from nextgisweb.webmap.plugin import WebmapPlugin


class BundleAttachmentPlugin(WebmapPlugin):
    @classmethod
    def is_supported(cls, webmap):
        return ("@nextgisweb/feature-attachment/attachment-bundle/plugin", dict())
