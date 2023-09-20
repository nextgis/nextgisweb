from nextgisweb.env import Component


class GUIComponent(Component):
    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)
