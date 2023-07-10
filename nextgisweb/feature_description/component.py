from nextgisweb.env import Component, require


class FeatureDescriptionComponent(Component):

    @require('feature_layer')
    def initialize(self):
        from . import extension  # NOQA
