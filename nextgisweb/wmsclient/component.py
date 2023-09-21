from datetime import timedelta

from nextgisweb.env import Component
from nextgisweb.lib.config import Option

from .model import WMS_VERSIONS


class WMSClientComponent(Component):
    def initialize(self):
        super().initialize()

        self.headers = {"User-Agent": self.options["user_agent"]}

    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(wms_versions=WMS_VERSIONS)

    # fmt: off
    option_annotations = (
        Option("user_agent", default="NextGIS Web"),
        Option("timeout", timedelta, default=timedelta(seconds=15), doc="WMS request timeout."),
    )
    # fmt: on
