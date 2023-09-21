from datetime import timedelta

from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option

from .model import SCHEME


class TMSClientComponent(Component):
    def initialize(self):
        super().initialize()

        self.headers = {"User-Agent": self.options["user_agent"]}

    def client_settings(self, request):
        return dict(schemes=SCHEME.enum)

    @require("resource")
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    # fmt: off
    option_annotations = (
        Option("nextgis_geoservices.layers", default="https://geoservices.nextgis.com/config/maps"),
        Option("nextgis_geoservices.url_template", default="https://geoservices.nextgis.com/raster/{layer}/{z}/{x}/{y}.png"),
        Option("user_agent", default="NextGIS Web"),
        Option("timeout", timedelta, default=timedelta(seconds=15)),
    )
    # fmt: on
