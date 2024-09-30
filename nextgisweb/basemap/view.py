
from nextgisweb.resource import Widget
from nextgisweb.webmap import WebMap

from .model import BasemapLayer


class BasemapLayerWidget(Widget):
    resource = BasemapLayer
    operation = ("create", "update")
    amdmod = "@nextgisweb/basemap/layer-widget"


class BasemapWebMapWidget(Widget):
    resource = WebMap
    operation = ("create", "update")
    amdmod = "@nextgisweb/basemap/webmap-widget"
