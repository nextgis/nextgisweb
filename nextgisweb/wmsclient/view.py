from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget

from .component import WMSClientComponent
from .model import WMSConnection, WMSLayer


class ClientWidget(Widget):
    resource = WMSConnection
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wmsclient/wmsclient-connection")


class LayerWidget(Widget):
    resource = WMSLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wmsclient/wmsclient-layer")


def setup_pyramid(comp: WMSClientComponent, conf):
    pass
