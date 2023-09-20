from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option

from .extension import FeatureExtension
from .interface import FIELD_TYPE
from .ogrdriver import OGR_DRIVER_NAME_2_EXPORT_FORMATS


class FeatureLayerComponent(Component):
    def initialize(self):
        self.FeatureExtension = FeatureExtension
        self.export_limit = self.options["export.limit"]

    @require("resource")
    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        editor_widget = dict()
        for k, ecls in FeatureExtension.registry.items():
            if hasattr(ecls, "editor_widget"):
                editor_widget[k] = ecls.editor_widget

        return dict(
            editor_widget=editor_widget,
            extensions=dict(
                map(
                    lambda ext: (ext.identity, ext.display_widget),
                    FeatureExtension.registry.values(),
                )
            ),
            export_formats=OGR_DRIVER_NAME_2_EXPORT_FORMATS,
            datatypes=FIELD_TYPE.enum,
        )

    # fmt: off
    option_annotations = (
        Option("export.limit", int, default=None, doc='The export limit'),
    )
    # fmt: on
