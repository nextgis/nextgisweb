from nextgisweb.env import Component


class ResMetaComponent(Component):
    def setup_pyramid(self, config) -> None:  # noqa: ANN001
        from . import view  # noqa: F401
