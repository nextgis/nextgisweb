from nextgisweb.env import COMP_ID, Component, require


class ResMetaComponent(Component):
    identity = COMP_ID

    @require('resource')
    def setup_pyramid(self, config):
        from . import view  # NOQA
        view.setup_pyramid(self, config)
