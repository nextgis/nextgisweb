import transaction

from nextgisweb.env import Component, gettext, require
from nextgisweb.lib.config import Option
from nextgisweb.lib.pilhelper import heif_init

from nextgisweb.core import KindOfData

from .model import FeatureAttachment


class FeatureAttachmentData(KindOfData):
    identity = "feature_attachment"
    display_name = gettext("Feature attachments")


class FeatureAttachmentComponent(Component):
    @require("feature_layer")
    def initialize(self):
        heif_init()
        from . import extension, plugin  # noqa: F401

    def setup_pyramid(self, config):
        from . import api, plugin, view  # noqa: F401

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(
            webmap=dict(bundle=self.options["webmap.bundle"]),
        )

    def maintenance(self):
        with transaction.manager:
            for obj in FeatureAttachment.filter_by(file_meta=None):
                obj.extract_meta()

    def estimate_storage(self):
        for obj in FeatureAttachment.query():
            yield FeatureAttachmentData, obj.resource_id, obj.size

    # fmt: off
    option_annotations = (
        Option("webmap.bundle", bool, default=False),
    )
    # fmt: on
