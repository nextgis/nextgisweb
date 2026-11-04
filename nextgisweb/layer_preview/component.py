from collections.abc import Mapping

from nextgisweb.env import Component, Env


class LayerPreviewComponent(Component):
    def __init__(self, env: Env, settings: Mapping) -> None:
        from . import favorite  # noqa: F401

        super().__init__(env, settings)

    def setup_pyramid(self, config) -> None:  # noqa: ANN001
        from . import view

        view.setup_pyramid(self, config)
