from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option


class BasemapComponent(Component):
    def initialize(self):
        from . import plugin  # noqa: F401

    @require("resource", "webmap")
    def setup_pyramid(self, config):
        from . import view  # noqa: F401

    def client_settings(self, request):
        return dict(
            qms_geoservices_url=self.options["qms_geoservices_url"],
            qms_icons_url=self.options["qms_icons_url"],
        )

    # fmt: off
    option_annotations = (
        Option("qms_geoservices_url", default="https://qms.nextgis.com/api/v1/geoservices/"),
        Option("qms_icons_url", default="https://qms.nextgis.com/api/v1/icons/"),
    )
    # fmt: on
