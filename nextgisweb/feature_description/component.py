from nextgisweb.env import Component, require

from .model import Base


class FeatureDescriptionComponent(Component):
    identity = 'feature_description'
    metadata = Base.metadata

    @require('feature_layer')
    def initialize(self):
        from . import extension  # NOQA
