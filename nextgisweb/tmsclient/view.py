from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.tmsclient.component import TMSClientComponent

from .model import TMSConnection, TMSLayer


class ClientWidget(Widget):
    resource = TMSConnection
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/tmsclient/tmsclient-connection")


class LayerWidget(Widget):
    resource = TMSLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/tmsclient/tmsclient-layer")


def setup_pyramid(comp: TMSClientComponent, config):
    pass
