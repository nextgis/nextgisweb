from nextgisweb.env import Component


class LayerComponent(Component):
    def setup_pyramid(self, config) -> None:  # noqa: ANN001
        from . import api

        api.setup_pyramid(self, config)
