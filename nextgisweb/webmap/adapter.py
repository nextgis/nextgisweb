from typing import ClassVar

from nextgisweb.env import gettext
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.registry import DictRegistry, dict_registry

from nextgisweb.jsrealm import jsentry


@dict_registry
class WebMapAdapter:
    registry: ClassVar[DictRegistry[type["WebMapAdapter"]]]

    identity: str
    entry: str
    display_name: TrStr


class TileAdapter(WebMapAdapter):
    identity = "tile"
    entry = jsentry("@nextgisweb/webmap/tile-adapter")
    display_name = gettext("Tiles")


class ImageAdapter(WebMapAdapter):
    identity = "image"
    entry = jsentry("@nextgisweb/webmap/image-adapter")
    display_name = gettext("Image")


class PointCloudAdapter(WebMapAdapter):
    identity = "point_cloud"
    entry = jsentry("@nextgisweb/point-cloud/point-cloud-adapter")
    display_name = gettext("Point cloud")
