from nextgisweb.env import Component


class ResMetaComponent(Component):
    def setup_pyramid(self, config):
        from . import view  # noqa: F401
