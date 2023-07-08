from nextgisweb.env import COMP_ID, Component


class OGCFServerComponent(Component):
    identity = COMP_ID

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def setup_pyramid(self, config):
        from . import api, view
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
