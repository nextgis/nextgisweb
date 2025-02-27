from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget

from .model import Tileset


class TilesetWidget(Widget):
    resource = Tileset
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/tileset/resource-widget")


def setup_pyramid(comp, config):
    pass
