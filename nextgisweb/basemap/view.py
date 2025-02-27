from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.webmap import WebMap

from .model import BasemapLayer


class BasemapLayerWidget(Widget):
    resource = BasemapLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/basemap/layer-widget")


class BasemapWebMapWidget(Widget):
    resource = WebMap
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/basemap/webmap-widget")
