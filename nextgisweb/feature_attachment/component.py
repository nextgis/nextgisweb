import sqlalchemy as sa
import transaction

from nextgisweb.env import Component, gettext, require
from nextgisweb.env.model import DBSession
from nextgisweb.lib.config import Option
from nextgisweb.lib.pilhelper import heif_init

from nextgisweb.core import KindOfData
from nextgisweb.file_storage.model import FileObj

from .model import FeatureAttachment


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

    def maintenance(self):
        q = (
            sa.select(FeatureAttachment)
            .join(FeatureAttachment.fileobj)
            .where(~FileObj._meta.has())
        )
        with transaction.manager:
            for (obj,) in DBSession.execute(q):
                obj.extract_meta()

    def estimate_storage(self):
        for obj in FeatureAttachment.query():
            yield FeatureAttachmentData, obj.resource_id, obj.fileobj.size

    # fmt: off
    option_annotations = (
        Option("webmap.bundle", bool, default=False),
    )
    # fmt: on
