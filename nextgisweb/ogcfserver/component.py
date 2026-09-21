from nextgisweb.env import Component


class OGCFServerComponent(Component):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def setup_pyramid(self, config):
        from . import api, view  # noqa: F401

        api.setup_pyramid(self, config)
