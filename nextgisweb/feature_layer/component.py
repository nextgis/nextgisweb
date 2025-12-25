from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option

from .extension import FeatureExtension
from .interface import FIELD_TYPE
from .ogrdriver import OGR_DRIVER_NAME_2_EXPORT_FORMATS


class FeatureLayerComponent(Component):
    def __init__(self, env, settings):
        from . import favorite  # noqa: F401

        super().__init__(env, settings)

    def initialize(self):
        self.FeatureExtension = FeatureExtension
        self.export_limit = self.options["export.limit"]

    @require("resource")
    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    @property
    def versioning_default(self):
        return self.env.core.settings_get(
            self.identity, "versioning_default", self.options["versioning.default"]
        )

    def client_settings(self, request):
        return dict(
            export_formats=OGR_DRIVER_NAME_2_EXPORT_FORMATS,
            datatypes=FIELD_TYPE.enum,
            versioning=dict(
                default=self.versioning_default,
            ),
        )

    # fmt: off
    option_annotations = (
        Option("export.limit", int, default=None, doc='The export limit'),
        Option("versioning.enabled", bool, default=False),
        Option("versioning.default", bool, default=False),
    )
    # fmt: on
