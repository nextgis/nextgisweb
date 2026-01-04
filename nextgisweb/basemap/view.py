from msgspec import Struct

from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid import client_setting
from nextgisweb.resource import Widget
from nextgisweb.webmap import WebMap

from .component import BasemapComponent, BasemapConfig
from .model import BasemapLayer


class BasemapLayerWidget(Widget):
    resource = BasemapLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/basemap/layer-widget")


class BasemapWebMapWidget(Widget):
    resource = WebMap
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/basemap/webmap-widget")


@client_setting("basemaps")
def cs_basemaps(comp: BasemapComponent, request) -> list[BasemapConfig]:
    return comp.basemaps


class BasemapQmsClientSetting(Struct, kw_only=True):
    url: str


@client_setting("qms")
def cs_qms(comp: BasemapComponent, request) -> BasemapQmsClientSetting:
    return BasemapQmsClientSetting(url=comp.options["qms_url"].rstrip("/"))
