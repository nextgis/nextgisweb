from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget

from .model import Connection, Layer


class ClientWidget(Widget):
    resource = Connection
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wmsclient/wmsclient-connection")


class LayerWidget(Widget):
    resource = Layer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wmsclient/wmsclient-layer")


def setup_pyramid(comp, conf):
    pass
