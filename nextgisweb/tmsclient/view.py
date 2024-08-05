from nextgisweb.resource import Widget

from .model import Connection, Layer


class ClientWidget(Widget):
    resource = Connection
    operation = ("create", "update")
    amdmod = "@nextgisweb/tmsclient/tmsclient-connection"


class LayerWidget(Widget):
    resource = Layer
    operation = ("create", "update")
    amdmod = "@nextgisweb/tmsclient/tmsclient-layer"


def setup_pyramid(comp, config):
    pass
