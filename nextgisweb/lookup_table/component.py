from nextgisweb.env import Component


class LookupTableComponent(Component):
    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)
