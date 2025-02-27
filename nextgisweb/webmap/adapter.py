from nextgisweb.env import gettext
from nextgisweb.lib.registry import dict_registry

from nextgisweb.jsrealm import jsentry


@dict_registry
class WebMapAdapter:
    """Web map adapter is responsible for how layer style
    will be displayed on web map.

    It consists of two parts. First works on the server and implemented as
    a python-class, second works on fronend and implemented as an AMD module."""

    identity: str = None
    display_name: str = None
    mid: str = None


class TileAdapter(WebMapAdapter):
    """An adapter that implements visulation of layer style through
    tile service, but the service itself is implemented by other component."""

    identity = "tile"
    mid = jsentry("@nextgisweb/webmap/tile-adapter")
    display_name = gettext("Tiles")


class ImageAdapter(WebMapAdapter):
    """An adapter that implements visulation of layer style through
    WMS-like GetImage request, but the service itself is implemented by other component."""

    identity = "image"
    mid = jsentry("@nextgisweb/webmap/image-adapter")
    display_name = gettext("Image")
