from nextgisweb.env import Component


class WMSServerComponent(Component):
    identity = 'wmsserver'

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
