from nextgisweb.env import Component


class LayerComponent(Component):
    def setup_pyramid(self, config):
        from . import api

        api.setup_pyramid(self, config)
