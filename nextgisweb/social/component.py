from nextgisweb.env import COMP_ID, Component, require


class SocialComponent(Component):
    identity = COMP_ID

    @require('resource')
    def setup_pyramid(self, config):
        from . import api, view # NOQA
        api.setup_pyramid(self, config)
