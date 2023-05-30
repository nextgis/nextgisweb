from ..env import Component


class LayerPreviewComponent(Component):
    identity = 'layer_preview'

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
