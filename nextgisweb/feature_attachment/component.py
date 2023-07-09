from nextgisweb.env import Component, _, require

from nextgisweb.core import KindOfData

from .model import FeatureAttachment


class FeatureAttachmentData(KindOfData):
    identity = 'feature_attachment'
    display_name = _("Feature attachments")


class FeatureAttachmentComponent(Component):

    @require('feature_layer')
    def initialize(self):
        from . import extension # NOQA

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def estimate_storage(self):
        for obj in FeatureAttachment.query():
            yield FeatureAttachmentData, obj.resource_id, obj.size
