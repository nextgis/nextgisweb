from datetime import timedelta

from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option


class WFSClientComponent(Component):
    def initialize(self):
        super().initialize()

        self.headers = {"User-Agent": self.options["user_agent"]}

    @require("feature_layer")
    def setup_pyramid(self, config):
        from . import api, view  # noqa: F401

        api.setup_pyramid(self, config)

    option_annotations = (
        Option("user_agent", default="NextGIS Web"),
        Option("timeout", timedelta, default=timedelta(seconds=60)),
    )
