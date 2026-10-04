from nextgisweb.env import Component


class WMSServerComponent(Component):
    def setup_pyramid(self, config):
        from . import api, view  # noqa: F401

        api.setup_pyramid(self, config)
