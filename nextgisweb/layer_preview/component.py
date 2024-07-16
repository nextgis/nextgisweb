from nextgisweb.env import Component


class LayerPreviewComponent(Component):
    def __init__(self, env, settings):
        from . import favorite  # noqa: F401

        super().__init__(env, settings)

    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)
