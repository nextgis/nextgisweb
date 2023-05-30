from ..env import Component


class LayerComponent(Component):
    identity = 'layer'

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)
