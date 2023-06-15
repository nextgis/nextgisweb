from ..env import Component, require
from ..lib.config import Option

from .model import Base
from .interface import FIELD_TYPE
from .extension import FeatureExtension
from .ogrdriver import OGR_DRIVER_NAME_2_EXPORT_FORMATS


class FeatureLayerComponent(Component):
    identity = 'feature_layer'
    metadata = Base.metadata

    def initialize(self):
        self.FeatureExtension = FeatureExtension
        self.export_limit = self.options['export.limit']

    @require('resource')
    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        editor_widget = dict()
        for k, ecls in FeatureExtension.registry.items():
            if hasattr(ecls, 'editor_widget'):
                editor_widget[k] = ecls.editor_widget

        return dict(
            editor_widget=editor_widget,
            extensions=dict(map(
                lambda ext: (ext.identity, ext.display_widget),
                FeatureExtension.registry.values()
            )),
            export_formats=OGR_DRIVER_NAME_2_EXPORT_FORMATS,
            datatypes=FIELD_TYPE.enum,
        )

    option_annotations = (
        Option('export.limit', int, default=None, doc='The export limit'),
    )
