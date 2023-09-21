from nextgisweb.env import Component


class WMSServerComponent(Component):
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
