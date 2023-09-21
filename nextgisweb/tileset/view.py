from nextgisweb.resource import Widget

from .model import Tileset


class TilesetWidget(Widget):
    resource = Tileset
    operation = ("create", "update")
    amdmod = "@nextgisweb/tileset/resource-widget"


def setup_pyramid(comp, config):
    pass
