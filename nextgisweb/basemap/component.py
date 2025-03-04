import json
from pathlib import Path

from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option
from nextgisweb.lib.imptool import module_path


class BasemapComponent(Component):
    def initialize(self):
        from . import plugin  # noqa: F401

        basemaps_path = Path(self.options["basemaps"])
        self.basemaps = json.loads(basemaps_path.read_text())

    @require("resource", "webmap")
    def setup_pyramid(self, config):
        from . import plugin, view  # noqa: F401

    def client_settings(self, request):
        return dict(
            basemaps=self.basemaps,
            qms_geoservices_url=self.options["qms_geoservices_url"],
            qms_icons_url=self.options["qms_icons_url"],
            qms_url=self.options["qms_url"],
        )

    # fmt: off
    option_annotations = (
        Option("basemaps", default=module_path("nextgisweb.basemap") / "basemaps.json", doc="Basemaps description file."),
        Option("qms_url", default="https://qms.nextgis.com"),
        Option("qms_geoservices_url", default="https://qms.nextgis.com/api/v1/geoservices/"),
        Option("qms_icons_url", default="https://qms.nextgis.com/api/v1/icons/"),
    )
    # fmt: on
