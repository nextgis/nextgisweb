from datetime import timedelta

from nextgisweb.env import Component
from nextgisweb.lib.config import Option


class WMSClientComponent(Component):
    def initialize(self):
        super().initialize()

        self.headers = {"User-Agent": self.options["user_agent"]}

    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)

    # fmt: off
    option_annotations = (
        Option("user_agent", default="NextGIS Web"),
        Option("timeout", timedelta, default=timedelta(seconds=15), doc="WMS request timeout."),
    )
    # fmt: on
