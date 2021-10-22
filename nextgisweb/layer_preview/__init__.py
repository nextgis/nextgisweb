from ..component import Component

__all__ = ['LayerPreviewComponent', ]


class LayerPreviewComponent(Component):
    identity = 'layer_preview'

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
