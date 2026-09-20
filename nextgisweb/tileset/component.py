from nextgisweb.env import Component


class TilesetComponent(Component):
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
