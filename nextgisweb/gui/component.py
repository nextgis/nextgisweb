from nextgisweb.env import COMP_ID, Component


class GUIComponent(Component):
    identity = COMP_ID

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)
