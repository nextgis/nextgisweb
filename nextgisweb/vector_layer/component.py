from nextgisweb.env import Component


class VectorLayerComponent(Component):
    def setup_pyramid(self, config) -> None:  # noqa: ANN001
        from . import api, view  # noqa: F401

        api.setup_pyramid(self, config)
