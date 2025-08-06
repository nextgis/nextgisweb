from typing import Union

from msgspec import Struct

from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option


class BasemapConfig(Struct):
    keyname: str
    display_name: str
    url: str
    copyright_text: Union[str, None]
    copyright_url: Union[str, None]
    enabled: Union[bool, None]
    epsg: Union[str, None] = None
    z_max: Union[int, None] = None
    z_min: Union[int, None] = None


class BasemapComponent(Component):
    def initialize(self):
        from . import plugin  # noqa: F401

        self.basemaps = self._basemaps()

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

    def _basemaps(self):
        if self.options["no_preset"]:
            return []

        keys = set()
        for s in self.options._options:
            p = s.split(".")
            if p[0] == "preset" and len(p) == 3:
                keys.add(p[1])

        if len(keys) == 0:
            return [
                BasemapConfig(
                    keyname="osm-mapnik",
                    display_name="OpenStreetMap",
                    url="https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    copyright_text="© OpenStreetMap contributors",
                    copyright_url="https://www.openstreetmap.org/copyright",
                    enabled=True,
                    z_max=19,
                )
            ]

        result = list()
        has_enabled = False
        prefixed = self.options.with_prefix("preset")
        for idx, k in enumerate(sorted(keys), start=1):
            enabled = prefixed.get(f"{k}.enabled")
            if enabled is None:
                enabled = idx == 1
            if enabled:
                if has_enabled:
                    enabled = False
                else:
                    has_enabled = True

            result.append(
                BasemapConfig(
                    keyname=prefixed.get(f"{k}.keyname"),
                    display_name=prefixed.get(f"{k}.display_name"),
                    url=prefixed.get(f"{k}.url"),
                    epsg=prefixed.get(f"{k}.epsg"),
                    copyright_text=prefixed.get(f"{k}.copyright_text"),
                    copyright_url=prefixed.get(f"{k}.copyright_url"),
                    enabled=enabled,
                    z_max=prefixed.get(f"{k}.z_max"),
                    z_min=prefixed.get(f"{k}.z_min"),
                )
            )

        return result

    # fmt: off
    option_annotations = (
        Option("no_preset", bool, default=False, doc="Disable preset basemaps"),
        Option("preset.*.keyname", str, doc="Preset basemap keyname"),
        Option("preset.*.display_name", str, doc="Preset basemap display name"),
        Option("preset.*.url", str, doc="Preset basemap URL template"),
        Option("preset.*.epsg", int, default=None, doc="Preset basemap EPSG code"),
        Option("preset.*.copyright_text", str, default=None, doc="Preset basemap copyright text"),
        Option("preset.*.copyright_url", str, default=None, doc="Preset basemap copyright URL"),
        Option("preset.*.enabled", bool, default=None, doc="Preset basemap default flag"),
        Option("preset.*.z_max", int, default=None, doc="Preset basemap maximum zoom level"),
        Option("preset.*.z_min", int, default=None, doc="Preset basemap minimum zoom level"),
        Option("qms_url", default="https://qms.nextgis.com"),
        Option("qms_geoservices_url", default="https://qms.nextgis.com/api/v1/geoservices/"),
        Option("qms_icons_url", default="https://qms.nextgis.com/api/v1/icons/"),
    )
    # fmt: on
