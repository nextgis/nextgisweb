from nextgisweb.env import Component, gettext, require
from nextgisweb.lib.config import Option
from nextgisweb.lib.pilhelper import heif_init

from nextgisweb.core import KindOfData


class FeatureAttachmentData(KindOfData):
    identity = "feature_attachment"
    display_name = gettext("Feature attachments")


class FeatureAttachmentComponent(Component):
    @require("feature_layer")
    def initialize(self):
        heif_init()
        from . import extension  # noqa: F401

    def setup_pyramid(self, config):
        from . import api, view  # noqa: F401

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def estimate_storage(self):
        from .model import FeatureAttachment

        for obj in FeatureAttachment.query():
            yield FeatureAttachmentData, obj.resource_id, obj.fileobj.size

    # fmt: off
    option_annotations = (
        Option("webmap.bundle", bool, default=False),
    )
    # fmt: on
