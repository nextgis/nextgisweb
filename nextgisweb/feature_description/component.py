from nextgisweb.env import Component, require


class FeatureDescriptionComponent(Component):
    @require("feature_layer")
    def initialize(self):
        from . import extension  # noqa: F401

    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
