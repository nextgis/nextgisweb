from ..component import Component, require

__all__ = ['LayerPreviewComponent', ]


class LayerPreviewComponent(Component):
    identity = 'layer_preview'

    @require('feature_layer', 'render')
    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
