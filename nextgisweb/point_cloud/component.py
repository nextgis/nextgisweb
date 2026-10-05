from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option


class PointCloudComponent(Component):
    def initialize(self):
        super().initialize()
        if self.options["terrain.enabled"] and self.options["terrain.url"] is None:
            raise ValueError(
                "Option 'point_cloud.terrain.url' is required when terrain is enabled."
            )

    @require("file_upload")
    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    # fmt: off
    option_annotations = (
        Option("terrain.enabled", bool, default=False, doc="Enable terrain in the point cloud preview"),
        Option(
            "terrain.url", str, default=None,
            doc="Terrarium encoded elevation tiles URL template (EPSG:3857) for "
            "the point cloud preview, required if terrain is enabled",
        ),
        Option("terrain.copyright_text", str, default=None, doc="Terrain data attribution text"),
        Option("terrain.copyright_url", str, default=None, doc="Terrain data attribution URL"),
    )
    # fmt: on
