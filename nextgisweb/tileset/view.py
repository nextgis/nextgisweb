from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget

from .component import TilesetComponent
from .model import Tileset


class TilesetWidget(Widget):
    resource = Tileset
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/tileset/resource-widget")


def setup_pyramid(comp: TilesetComponent, config):
    pass
