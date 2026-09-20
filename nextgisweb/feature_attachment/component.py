from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option
from nextgisweb.lib.pilhelper import heif_init


class FeatureAttachmentComponent(Component):
    @require("feature_layer")
    def initialize(self):
        heif_init()
        from . import extension  # noqa: F401

    def setup_pyramid(self, config):
        from . import api, view  # noqa: F401

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    # fmt: off
    option_annotations = (
        Option("webmap.bundle", bool, default=False),
    )
    # fmt: on
